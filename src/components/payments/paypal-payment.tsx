'use client';

import React, { useState, useEffect } from 'react';
import { PayPalButtons, PayPalScriptProvider } from '@paypal/react-paypal-js';
import { paypalConfig } from '@/lib/payment-config';

interface PayPalPaymentProps {
  amount: number;
  onSuccess: (details: any) => void;
  onError: (error: string) => void;
  onCancel?: (reason: string) => void;
  loading?: boolean;
}

export default function PayPalPayment({ amount, onSuccess, onError, onCancel, loading }: PayPalPaymentProps) {
  const [processing, setProcessing] = useState(false);

  // Add global error handler for unhandled PayPal errors
  React.useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (event.reason && typeof event.reason === 'string' && event.reason.includes('Window closed')) {
        event.preventDefault(); // Prevent the error from being logged as unhandled
        console.log('PayPal window closed by user - handled gracefully');
        if (onCancel) {
          onCancel('Payment window was closed before completion');
        } else {
          onError('Payment was cancelled - window closed');
        }
      }
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    return () => window.removeEventListener('unhandledrejection', handleUnhandledRejection);
  }, [onCancel, onError]);

  const initialOptions = {
    clientId: paypalConfig.clientId,
    currency: paypalConfig.currency,
    intent: 'capture' as const,
    environment: paypalConfig.environment,
    components: 'buttons',
    enableFunding: 'venmo,paylater' as any,
    disableFunding: 'credit,card' as any,
    // Add debug mode for better error handling in development
    debug: paypalConfig.environment === 'sandbox',
  };

  const createOrder = (data: any, actions: any) => {
    return actions.order.create({
      purchase_units: [
        {
          amount: {
            currency_code: paypalConfig.currency,
            value: amount.toFixed(2),
          },
          description: 'Giftcard Purchase - PXL Platform',
        },
      ],
      application_context: {
        shipping_preference: 'NO_SHIPPING',
      },
    });
  };

  const onApprove = async (data: any, actions: any) => {
    setProcessing(true);
    
    try {
      // Check if actions and order are available
      if (!actions || !actions.order) {
        throw new Error('PayPal actions not available');
      }

      let details;
      try {
        // Add timeout to prevent hanging on window closure
        const capturePromise = actions.order.capture();
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('PayPal capture timeout - window may have been closed')), 30000);
        });
        
        details = await Promise.race([capturePromise, timeoutPromise]);
      } catch (captureError) {
        // Handle specific capture errors, especially window closure
        const captureErrorMessage = captureError instanceof Error ? captureError.message : String(captureError);
        
        if (captureErrorMessage.includes('Window closed') || 
            captureErrorMessage.includes('popup_closed') ||
            captureErrorMessage.includes('POPUP_CLOSE') ||
            captureErrorMessage.includes('window was closed') ||
            captureErrorMessage.includes('capture timeout')) {
          // BUG FIX: 2025-01-27 - PayPal window closure handling
          // Problem: PayPal capture fails when window closes, leaving payment in incomplete state
          // Solution: Ensure processing state is reset and proper cancellation handling
          // Impact: Users get proper feedback when closing PayPal window, no hanging state
          console.log('PayPal window closed during capture - treating as cancellation:', captureErrorMessage);
          setProcessing(false); // Ensure processing state is reset
          if (onCancel) {
            onCancel('Payment window was closed before completion');
          } else {
            onError('Payment was cancelled - window closed');
          }
          return; // Exit early, don't continue processing
        } else {
          // Re-throw other capture errors to be handled by outer catch
          throw captureError;
        }
      }
      
      // Validate the payment details
      if (!details || !details.id) {
        throw new Error('Invalid payment response from PayPal');
      }
      
      // Mock successful payment response
      const mockPaymentDetails = {
        id: details.id,
        status: 'COMPLETED',
        amount: {
          currency_code: paypalConfig.currency,
          value: amount.toFixed(2),
        },
        payer: details.payer || {
          email_address: 'test@example.com',
          name: { given_name: 'Test', surname: 'User' },
        },
        create_time: new Date().toISOString(),
        update_time: new Date().toISOString(),
      };

      onSuccess(mockPaymentDetails);
    } catch (error) {
      console.error('PayPal onApprove error:', error);
      
      // Handle specific error types
      const errorMessage = error instanceof Error ? error.message : 'PayPal payment failed';
      
      // Check if this is a window closure error (user cancelled)
      if (errorMessage.includes('Window closed') || errorMessage.includes('popup_closed')) {
        if (onCancel) {
          onCancel('Payment window was closed before completion');
        } else {
          onError('Payment was cancelled - window closed');
        }
      } else {
        onError(errorMessage);
      }
    } finally {
      setProcessing(false);
    }
  };

  const onCancelHandler = (data: any) => {
    if (onCancel) {
      onCancel('PayPal payment was cancelled by user');
    } else {
      // Fallback to error handler if onCancel not provided
      onError('Payment was cancelled');
    }
  };

  const onErrorHandler = (err: any) => {
    console.error('PayPal Error:', err);
    
    // Handle specific error types
    const errorMessage = err?.message || err?.toString() || 'Unknown error';
    
    // Check if this is a window closure error (user cancelled)
    if (errorMessage.includes('Window closed') || 
        errorMessage.includes('popup_closed') || 
        errorMessage.includes('POPUP_CLOSE')) {
      if (onCancel) {
        onCancel('Payment window was closed before completion');
      } else {
        onError('Payment was cancelled - window closed');
      }
    } else {
      onError(`PayPal payment failed: ${errorMessage}`);
    }
  };

  if (loading || processing) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="flex items-center space-x-2 text-gray-400">
          <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
          <span>Loading PayPal...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PayPalScriptProvider 
        options={initialOptions}
        deferLoading={false}
      >
        <PayPalButtons
          style={{
            layout: 'vertical',
            color: 'black',
            shape: 'rect',
            label: 'paypal',
            height: 45,
          }}
          createOrder={createOrder}
          onApprove={onApprove}
          onCancel={onCancelHandler}
          onError={onErrorHandler}
          disabled={loading || processing}
          // Add additional error handling options
          forceReRender={[amount]} // Force re-render when amount changes
        />
      </PayPalScriptProvider>

      <div className="text-xs text-gray-500 space-y-1 p-3 bg-gray-900 rounded-lg border border-gray-700">
        <p><strong>PayPal Sandbox Testing:</strong></p>
        <p>• Use any PayPal sandbox account</p>
        <p>• Or create a test account at developer.paypal.com</p>
        <p>• Test Buyer: sb-buyer@business.example.com</p>
        <p>• Password: testpassword123</p>
        <p>• All transactions are in sandbox mode</p>
      </div>
    </div>
  );
}
