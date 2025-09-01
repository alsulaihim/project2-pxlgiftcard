"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, CreditCard, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

export default function TestPaymentPage() {
  const [loading, setLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [paymentUrl, setPaymentUrl] = useState('');
  
  // Test customer data
  const [formData, setFormData] = useState({
    amount: 10.00,
    customerName: 'Test Customer',
    customerEmail: 'test@example.com',
    customerMobile: '12345678',  // Kuwait mobile format
  });

  const handleTestPayment = async () => {
    setLoading(true);
    setPaymentStatus('processing');
    setErrorMessage('');
    
    try {
      // Call our API to initiate payment
      const response = await fetch('/api/payment/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: formData.amount,
          customerName: formData.customerName,
          customerEmail: formData.customerEmail,
          customerMobile: formData.customerMobile,
          items: [
            {
              name: 'Test Gift Card',
              quantity: 1,
              price: formData.amount,
            },
          ],
        }),
      });

      const data = await response.json();

      if (data.success && data.paymentUrl) {
        setPaymentUrl(data.paymentUrl);
        setPaymentStatus('success');
        
        // Redirect to MyFatoorah payment page after 2 seconds
        setTimeout(() => {
          window.location.href = data.paymentUrl;
        }, 2000);
      } else {
        setPaymentStatus('error');
        setErrorMessage(data.error || 'Payment initiation failed');
      }
    } catch (error) {
      setPaymentStatus('error');
      setErrorMessage('Failed to connect to payment service');
      console.error('Payment error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-2">MyFatoorah Payment Test</h1>
          <p className="text-gray-400">Test the payment integration with MyFatoorah</p>
        </div>

        <div className="bg-gray-900 rounded-lg p-6 space-y-4">
          {/* Test Form */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Amount (USD)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({...formData, amount: parseFloat(e.target.value)})}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Customer Name
              </label>
              <input
                type="text"
                value={formData.customerName}
                onChange={(e) => setFormData({...formData, customerName: e.target.value})}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Email
              </label>
              <input
                type="email"
                value={formData.customerEmail}
                onChange={(e) => setFormData({...formData, customerEmail: e.target.value})}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Mobile (Optional)
              </label>
              <input
                type="tel"
                value={formData.customerMobile}
                onChange={(e) => setFormData({...formData, customerMobile: e.target.value})}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white"
                placeholder="12345678"
              />
            </div>
          </div>

          {/* Status Messages */}
          {paymentStatus === 'success' && (
            <div className="bg-green-500/10 border border-green-500 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-green-500 font-medium">Payment initiated successfully!</p>
                  <p className="text-sm text-gray-400 mt-1">Redirecting to payment page...</p>
                </div>
              </div>
            </div>
          )}

          {paymentStatus === 'error' && (
            <div className="bg-red-500/10 border border-red-500 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <XCircle className="h-5 w-5 text-red-500" />
                <div>
                  <p className="text-red-500 font-medium">Payment failed</p>
                  <p className="text-sm text-gray-400 mt-1">{errorMessage}</p>
                </div>
              </div>
            </div>
          )}

          {/* Test Payment Button */}
          <Button
            onClick={handleTestPayment}
            disabled={loading || !formData.amount || !formData.customerName || !formData.customerEmail}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CreditCard className="h-4 w-4 mr-2" />
                Test Payment with MyFatoorah
              </>
            )}
          </Button>

          {/* Payment URL Display */}
          {paymentUrl && (
            <div className="mt-4 p-3 bg-gray-800 rounded-lg">
              <p className="text-xs text-gray-400 mb-1">Payment URL:</p>
              <p className="text-xs text-blue-400 break-all">{paymentUrl}</p>
            </div>
          )}
        </div>

        {/* Test Information */}
        <div className="bg-yellow-500/10 border border-yellow-500 rounded-lg p-4">
          <div className="flex items-start space-x-2">
            <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5" />
            <div className="text-sm">
              <p className="text-yellow-500 font-medium mb-1">Test Mode</p>
              <p className="text-gray-400">
                This is using MyFatoorah test credentials. You can use the following test cards:
              </p>
              <ul className="mt-2 text-gray-400 space-y-1">
                <li>• Visa: 4111 1111 1111 1111</li>
                <li>• MasterCard: 5123 4567 8901 2346</li>
                <li>• CVV: Any 3 digits</li>
                <li>• Expiry: Any future date</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}