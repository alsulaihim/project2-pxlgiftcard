"use client";

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { CheckCircle, Download, ShoppingBag, ArrowRight, Loader2 } from 'lucide-react';
import { formatUSD } from '@/lib/pxl-currency';
import { useCart } from '@/contexts/cart-context';

export default function PaymentSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { dispatch } = useCart();
  const [orderProcessed, setOrderProcessed] = useState(false);
  
  // Get payment details from URL
  const invoiceId = searchParams.get('invoiceId');
  const amount = searchParams.get('amount');
  const currency = searchParams.get('currency');
  const reference = searchParams.get('reference');
  const status = searchParams.get('status');
  
  useEffect(() => {
    if (status === 'success' && !orderProcessed) {
      // Clear the cart after successful payment
      dispatch({ type: 'CLEAR_CART' });
      
      // Also clear localStorage directly to ensure cart is cleared
      localStorage.removeItem('giftcard-cart');
      
      // Clear session storage
      sessionStorage.removeItem('pendingOrder');
      sessionStorage.removeItem('pendingPXLPurchase');
      
      setOrderProcessed(true);
      
      // Log success for debugging
      console.log('Payment successful - cart cleared:', {
        invoiceId,
        amount,
        currency,
        reference
      });
    }
  }, [status, orderProcessed, dispatch, invoiceId, amount, currency, reference]);
  
  if (status !== 'success') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-4" />
          <p className="text-gray-400">Processing payment...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-gray-900 rounded-2xl p-8 text-center">
          {/* Success Icon */}
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="h-10 w-10 text-green-500" />
          </div>
          
          {/* Success Message */}
          <h1 className="text-3xl font-bold text-white mb-3">
            Payment Successful!
          </h1>
          <p className="text-gray-400 mb-8">
            Your payment has been processed successfully
          </p>
          
          {/* Payment Details */}
          <div className="bg-gray-800 rounded-lg p-6 mb-8 text-left">
            <h3 className="text-sm font-medium text-gray-400 mb-4">Payment Details</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-500 text-sm">Invoice ID</span>
                <span className="text-white font-mono text-sm">{invoiceId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 text-sm">Amount Paid</span>
                <span className="text-white font-semibold">
                  {currency} {amount ? parseFloat(amount).toFixed(2) : '0.00'}
                </span>
              </div>
              {reference && (
                <div className="flex justify-between">
                  <span className="text-gray-500 text-sm">Reference</span>
                  <span className="text-white font-mono text-sm">
                    {reference.slice(0, 20)}...
                  </span>
                </div>
              )}
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="space-y-3">
            <Button
              onClick={() => router.push('/orders')}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              size="lg"
            >
              <Download className="h-5 w-5 mr-2" />
              View Your Orders
            </Button>
            
            <Button
              onClick={() => router.push('/marketplace')}
              variant="outline"
              className="w-full border-gray-700 text-gray-300 hover:bg-gray-800"
              size="lg"
            >
              <ShoppingBag className="h-5 w-5 mr-2" />
              Continue Shopping
            </Button>
          </div>
          
          {/* Additional Info */}
          <div className="mt-8 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <p className="text-sm text-blue-400">
              ✨ A confirmation email has been sent to your registered email address with your gift card details.
            </p>
          </div>
        </div>
        
        {/* Footer Note */}
        <p className="text-center text-xs text-gray-500 mt-6">
          Need help? Contact our support team at support@hotpay.com
        </p>
      </div>
    </div>
  );
}