"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, CreditCard, Smartphone, Globe, ShoppingBag, Bitcoin } from 'lucide-react';

interface PaymentMethod {
  id: number;
  name: string;
  nameAr: string;
  code: string;
  isDirectPayment: boolean;
  serviceCharge: number;
  totalAmount: number;
  currencyIso: string;
  imageUrl: string;
  isRecommended: boolean;
  paymentType: string;
}

export default function TestPaymentMethodsPage() {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [testAmount, setTestAmount] = useState(100);
  const [selectedMethod, setSelectedMethod] = useState<number | null>(null);

  useEffect(() => {
    fetchPaymentMethods();
  }, [testAmount]);

  const fetchPaymentMethods = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/payment/methods?amount=${testAmount}&currency=USD`);
      const data = await response.json();
      if (data.success) {
        setMethods(data.methods);
      }
    } catch (error) {
      console.error('Error fetching payment methods:', error);
    } finally {
      setLoading(false);
    }
  };

  const initiatePayment = async (methodId?: number) => {
    try {
      const response = await fetch('/api/payment/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: testAmount,
          customerName: 'Test Customer',
          customerEmail: 'test@example.com',
          customerMobile: '+96512345678',
          showAllPaymentMethods: !methodId, // Show all if no specific method
          paymentMethodId: methodId,
          items: [{
            name: 'Test Payment',
            quantity: 1,
            price: testAmount,
          }],
        }),
      });

      const data = await response.json();
      if (data.success && data.paymentUrl) {
        window.location.href = data.paymentUrl;
      } else {
        alert('Failed to initiate payment: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error initiating payment:', error);
      alert('Failed to initiate payment');
    }
  };

  const getMethodIcon = (method: PaymentMethod) => {
    const name = method.name.toLowerCase();
    if (name.includes('apple') || name.includes('google') || name.includes('samsung')) {
      return <Smartphone className="h-5 w-5" />;
    }
    if (name.includes('visa') || name.includes('master') || name.includes('amex')) {
      return <CreditCard className="h-5 w-5" />;
    }
    if (name.includes('bitcoin') || name.includes('crypto')) {
      return <Bitcoin className="h-5 w-5" />;
    }
    if (name.includes('tabby') || name.includes('tamara')) {
      return <ShoppingBag className="h-5 w-5" />;
    }
    return <Globe className="h-5 w-5" />;
  };

  const categorizeMethod = (method: PaymentMethod) => {
    const name = method.name.toLowerCase();
    if (name.includes('apple') || name.includes('google') || name.includes('samsung')) {
      return 'Digital Wallets';
    }
    if (name.includes('visa') || name.includes('master') || name.includes('amex')) {
      return 'Credit/Debit Cards';
    }
    if (name.includes('tabby') || name.includes('tamara')) {
      return 'Buy Now Pay Later';
    }
    if (name.includes('crypto') || name.includes('bitcoin')) {
      return 'Cryptocurrency';
    }
    return 'Regional Payment Methods';
  };

  const groupedMethods = methods.reduce((acc, method) => {
    const category = categorizeMethod(method);
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(method);
    return acc;
  }, {} as Record<string, PaymentMethod[]>);

  return (
    <div className="min-h-screen bg-black p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-8">MyFatoorah Payment Methods</h1>
        
        {/* Test Amount Control */}
        <Card className="bg-gray-900 border-gray-800 p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Test Amount</h3>
              <p className="text-gray-400 text-sm">Change the amount to see different payment methods</p>
            </div>
            <div className="flex items-center gap-4">
              <input
                type="number"
                value={testAmount}
                onChange={(e) => setTestAmount(parseFloat(e.target.value) || 0)}
                className="w-32 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                min="1"
                step="10"
              />
              <span className="text-gray-400">USD</span>
            </div>
          </div>
        </Card>

        {/* Show All Payment Methods Button */}
        <Card className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-white mb-2">Test All Payment Options</h3>
              <p className="text-white/80">Let customers choose from all available payment methods</p>
            </div>
            <Button
              onClick={() => initiatePayment()}
              size="lg"
              className="bg-white text-blue-600 hover:bg-gray-100"
            >
              Pay with All Options
            </Button>
          </div>
        </Card>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="space-y-8">
            <div className="text-center text-gray-400">
              <p>Found {methods.length} payment methods available</p>
            </div>

            {Object.entries(groupedMethods).map(([category, categoryMethods]) => (
              <div key={category}>
                <h2 className="text-2xl font-bold text-white mb-4">{category}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {categoryMethods.map((method) => (
                    <Card
                      key={method.id}
                      className={`bg-gray-900 border-gray-800 p-4 cursor-pointer transition-all ${
                        selectedMethod === method.id ? 'border-blue-500 bg-gray-800' : ''
                      } hover:border-gray-600`}
                      onClick={() => setSelectedMethod(method.id)}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          {getMethodIcon(method)}
                          <div>
                            <h3 className="font-semibold text-white">{method.name}</h3>
                            <p className="text-xs text-gray-500">ID: {method.id} | Code: {method.code}</p>
                          </div>
                        </div>
                        {method.isRecommended && (
                          <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded">
                            Recommended
                          </span>
                        )}
                      </div>

                      {method.imageUrl && (
                        <img
                          src={method.imageUrl}
                          alt={method.name}
                          className="h-8 object-contain mb-3"
                        />
                      )}

                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Service Charge:</span>
                          <span className="text-white">
                            {method.serviceCharge > 0 ? `${method.currencyIso} ${method.serviceCharge}` : 'Free'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Total Amount:</span>
                          <span className="text-white font-semibold">
                            {method.currencyIso} {method.totalAmount}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Direct Payment:</span>
                          <span className={method.isDirectPayment ? 'text-green-400' : 'text-yellow-400'}>
                            {method.isDirectPayment ? 'Yes' : 'No'}
                          </span>
                        </div>
                      </div>

                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          initiatePayment(method.id);
                        }}
                        className="w-full mt-4 bg-blue-600 hover:bg-blue-700"
                        size="sm"
                      >
                        Pay with {method.name}
                      </Button>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Information Card */}
        <Card className="bg-gray-900 border-gray-800 p-6 mt-8">
          <h3 className="text-lg font-semibold text-white mb-3">Important Notes</h3>
          <ul className="space-y-2 text-sm text-gray-400">
            <li>• Apple Pay requires HTTPS and domain verification with Apple</li>
            <li>• Google Pay requires HTTPS and merchant registration</li>
            <li>• Regional payment methods availability depends on your MyFatoorah account region</li>
            <li>• Some payment methods may have minimum/maximum amount limits</li>
            <li>• Service charges may apply for certain payment methods</li>
            <li>• Direct Payment methods process instantly without redirects</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}