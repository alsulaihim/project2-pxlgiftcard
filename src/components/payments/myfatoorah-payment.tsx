'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { myFatoorahConfig } from '@/lib/payment-config';
import { CreditCard, Lock, Globe, AlertCircle } from 'lucide-react';

interface MyFatoorahPaymentProps {
  amount: number;
  onSuccess: (details: any) => void;
  onError: (error: string) => void;
  onCancel?: (reason: string) => void;
  loading?: boolean;
  currency?: string;
  description?: string;
}

export default function MyFatoorahPayment({ 
  amount, 
  onSuccess, 
  onError, 
  onCancel, 
  loading,
  currency = 'USD',
  description = 'PXL Purchase'
}: MyFatoorahPaymentProps) {
  const [processing, setProcessing] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Convert USD to KWD (approximate rate, should be fetched from API in production)
  const getAmountInKWD = (usdAmount: number) => {
    const conversionRate = 0.31; // 1 USD ≈ 0.31 KWD
    return (usdAmount * conversionRate).toFixed(3);
  };

  const initiatePayment = async () => {
    setProcessing(true);
    
    try {
      // Create payment session with MyFatoorah API
      const response = await fetch('/api/myfatoorah/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: currency === 'KWD' ? amount : getAmountInKWD(amount),
          currency: 'KWD', // MyFatoorah works primarily with KWD
          description: description,
          customerName: 'Customer', // In production, get from user profile
          customerEmail: 'customer@example.com', // In production, get from user profile
          callbackUrl: myFatoorahConfig.callbackUrl,
          errorUrl: myFatoorahConfig.errorUrl,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to initiate MyFatoorah payment');
      }

      const data = await response.json();
      
      if (data.success && data.paymentUrl) {
        setPaymentUrl(data.paymentUrl);
        setSessionId(data.sessionId);
        
        // Open MyFatoorah payment page in new window
        const paymentWindow = window.open(
          data.paymentUrl, 
          'MyFatoorah Payment',
          'width=600,height=700,left=200,top=100'
        );

        // Poll for payment status
        const checkInterval = setInterval(async () => {
          if (paymentWindow?.closed) {
            clearInterval(checkInterval);
            await checkPaymentStatus(data.sessionId);
          }
        }, 1000);
      } else {
        throw new Error(data.error || 'Failed to get payment URL');
      }
    } catch (error) {
      console.error('MyFatoorah payment error:', error);
      onError(error instanceof Error ? error.message : 'Payment failed');
      setProcessing(false);
    }
  };

  const checkPaymentStatus = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/myfatoorah/status?sessionId=${sessionId}`);
      const data = await response.json();
      
      if (data.status === 'success') {
        onSuccess({
          id: data.paymentId,
          sessionId: sessionId,
          amount: amount,
          currency: currency,
          status: 'COMPLETED',
          provider: 'myfatoorah',
          timestamp: new Date().toISOString(),
        });
      } else if (data.status === 'cancelled') {
        if (onCancel) {
          onCancel('Payment was cancelled');
        } else {
          onError('Payment was cancelled');
        }
      } else {
        onError(data.error || 'Payment failed');
      }
    } catch (error) {
      console.error('Error checking payment status:', error);
      onError('Failed to verify payment status');
    } finally {
      setProcessing(false);
    }
  };

  // Display payment options and information
  const paymentMethods = [
    { name: 'KNET', icon: '🏦', popular: true },
    { name: 'Visa/Mastercard', icon: '💳', popular: false },
    { name: 'Apple Pay', icon: '🍎', popular: false },
    { name: 'Google Pay', icon: '🔵', popular: false },
  ];

  if (loading || processing) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="flex items-center space-x-2 text-gray-400">
          <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
          <span>Loading MyFatoorah...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Payment Methods Available */}
      <div className="rounded-lg border border-gray-700 bg-gray-900 p-4">
        <div className="flex items-center space-x-2 mb-3">
          <Globe className="h-5 w-5 text-blue-400" />
          <h4 className="font-medium text-white">MyFatoorah Payment Gateway</h4>
        </div>
        
        <div className="grid grid-cols-2 gap-2 mb-4">
          {paymentMethods.map((method) => (
            <div 
              key={method.name}
              className="flex items-center space-x-2 p-2 rounded border border-gray-700 bg-gray-800"
            >
              <span className="text-lg">{method.icon}</span>
              <div className="flex-1">
                <div className="text-xs text-white">{method.name}</div>
                {method.popular && (
                  <div className="text-xs text-green-400">Popular in Kuwait</div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="text-xs text-gray-400 space-y-1">
          <p>• Secure payment processing for Middle East region</p>
          <p>• Supports local payment methods (KNET, etc.)</p>
          <p>• Amount: {currency === 'KWD' ? `${amount} KWD` : `$${amount} USD (≈ ${getAmountInKWD(amount)} KWD)`}</p>
        </div>
      </div>

      {/* Security Notice */}
      <div className="flex items-center space-x-2 text-xs text-gray-400">
        <Lock className="h-3 w-3" />
        <span>Your payment information is secure and encrypted by MyFatoorah</span>
      </div>

      {/* Payment Button */}
      <Button
        onClick={initiatePayment}
        disabled={loading || processing || amount <= 0}
        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
      >
        {processing ? (
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <span>Processing...</span>
          </div>
        ) : (
          <div className="flex items-center space-x-2">
            <CreditCard className="h-4 w-4" />
            <span>Pay with MyFatoorah</span>
          </div>
        )}
      </Button>

      {/* Test Mode Notice */}
      {myFatoorahConfig.environment === 'test' && (
        <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-4">
          <div className="flex items-start space-x-2">
            <AlertCircle className="h-4 w-4 text-yellow-400 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-yellow-400">
              <p className="font-medium">Test Mode Active</p>
              <p className="mt-1">This is a sandbox environment. No real payments will be processed.</p>
              <div className="mt-2 space-y-1">
                <p><strong>Test Cards:</strong></p>
                <p>• Visa: 4005 5500 0000 0001</p>
                <p>• Mastercard: 5453 0100 0009 5539</p>
                <p>• KNET: Card: 888888, PIN: 1234</p>
                <p>Use any future expiry and CVV: 123</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}