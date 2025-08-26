'use client';

import React, { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { stripeConfig } from '@/lib/payment-config';
import { CreditCard, Lock } from 'lucide-react';

// Initialize Stripe
const stripePromise = loadStripe(stripeConfig.publishableKey);

interface StripePaymentFormProps {
  amount: number;
  onSuccess: (paymentIntent: any) => void;
  onError: (error: string) => void;
  loading?: boolean;
}

function StripePaymentForm({ amount, onSuccess, onError, loading }: StripePaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [cardComplete, setCardComplete] = useState(false);
  const [validationError, setValidationError] = useState<string>('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      onError('Stripe has not loaded yet. Please try again.');
      return;
    }

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      onError('Card element not found.');
      return;
    }

    // Clear any previous validation errors
    setValidationError('');
    setProcessing(true);

    try {
      // Create payment method
      const { error: methodError, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
        billing_details: {
          name: 'Test Customer', // In real app, get from form
        },
      });

      if (methodError) {
        throw new Error(methodError.message);
      }

      // In a real application, you would send the payment method to your server
      // to create a payment intent. For testing, we'll simulate success.
      
      // Simulate API call to create payment intent
      const mockPaymentIntent = {
        id: `pi_test_${Date.now()}`,
        amount: amount * 100, // Stripe uses cents
        currency: 'usd',
        status: 'succeeded',
        payment_method: paymentMethod.id,
        created: Date.now(),
      };

      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      onSuccess(mockPaymentIntent);
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Payment failed');
    } finally {
      setProcessing(false);
    }
  };

  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#ffffff',
        backgroundColor: 'transparent',
        '::placeholder': {
          color: '#9ca3af',
        },
        iconColor: '#9ca3af',
      },
      invalid: {
        color: '#ef4444',
        iconColor: '#ef4444',
      },
    },
    hidePostalCode: true,
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label className="block text-sm font-medium text-white">
          Card Information
        </label>
        <div className="p-3 border border-gray-700 rounded-lg bg-gray-900 focus-within:border-blue-500 transition-colors">
          <CardElement
            options={cardElementOptions}
            onChange={(event) => {
              setCardComplete(event.complete);
              if (event.error) {
                setValidationError(event.error.message);
              } else {
                setValidationError('');
              }
            }}
          />
        </div>
        
        {/* Validation Error Display */}
        {validationError && (
          <div className="text-sm text-red-400 mt-2">
            {validationError}
          </div>
        )}
      </div>

      <div className="flex items-center space-x-2 text-xs text-gray-400">
        <Lock className="h-3 w-3" />
        <span>Your payment information is secure and encrypted</span>
      </div>

      <Button
        type="submit"
        disabled={!stripe || !cardComplete || processing || loading}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
      >
        {processing ? (
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <span>Processing...</span>
          </div>
        ) : (
          <div className="flex items-center space-x-2">
            <CreditCard className="h-4 w-4" />
            <span>Pay ${amount.toFixed(2)}</span>
          </div>
        )}
      </Button>

      <div className="text-xs text-gray-500 space-y-1">
        <p><strong>Test Card Numbers:</strong></p>
        <p>• Visa: 4242 4242 4242 4242</p>
        <p>• Mastercard: 5555 5555 5555 4444</p>
        <p>• Amex: 3782 822463 10005</p>
        <p>• Declined: 4000 0000 0000 0002</p>
        <p>Use any future expiry date and any 3-4 digit CVC</p>
      </div>
    </form>
  );
}

interface StripePaymentProps {
  amount: number;
  onSuccess: (paymentIntent: any) => void;
  onError: (error: string) => void;
  loading?: boolean;
}

export default function StripePayment({ amount, onSuccess, onError, loading }: StripePaymentProps) {
  return (
    <Elements stripe={stripePromise}>
      <StripePaymentForm
        amount={amount}
        onSuccess={onSuccess}
        onError={onError}
        loading={loading}
      />
    </Elements>
  );
}
