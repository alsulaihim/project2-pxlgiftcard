"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context';
import { 
  Coins, 
  CreditCard, 
  TrendingUp, 
  Gift, 
  Zap,
  Shield,
  Loader2,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { formatPXL, formatUSD } from '@/lib/pxl-currency';

// PXL Package Options
const PXL_PACKAGES = [
  {
    id: 'starter',
    name: 'Starter Pack',
    pxl: 1000,
    usd: 10,
    bonus: 0,
    popular: false,
    description: 'Perfect for trying out PXL'
  },
  {
    id: 'basic',
    name: 'Basic Pack',
    pxl: 5000,
    usd: 50,
    bonus: 250, // 5% bonus
    popular: false,
    description: 'Great for regular shoppers'
  },
  {
    id: 'popular',
    name: 'Popular Pack',
    pxl: 10000,
    usd: 100,
    bonus: 1000, // 10% bonus
    popular: true,
    description: 'Most popular choice'
  },
  {
    id: 'pro',
    name: 'Pro Pack',
    pxl: 25000,
    usd: 250,
    bonus: 3750, // 15% bonus
    popular: false,
    description: 'Best value for power users'
  },
  {
    id: 'enterprise',
    name: 'Enterprise Pack',
    pxl: 50000,
    usd: 500,
    bonus: 10000, // 20% bonus
    popular: false,
    description: 'Maximum savings & rewards'
  }
];

export default function BuyPXLPage() {
  const router = useRouter();
  const { user, platformUser } = useAuth();
  const [selectedPackage, setSelectedPackage] = useState(PXL_PACKAGES[2]); // Popular pack by default
  const [customAmount, setCustomAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  const handlePurchase = async () => {
    if (!user) {
      router.push('/auth/signin?redirect=/buy-pxl');
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      // Prepare customer info
      const customerName = platformUser?.profile?.firstName && platformUser?.profile?.lastName
        ? `${platformUser.profile.firstName} ${platformUser.profile.lastName}`
        : user.email?.split('@')[0] || 'Customer';
      
      const customerEmail = user.email || 'customer@example.com';
      const customerMobile = platformUser?.profile?.phone || '';

      // Calculate final PXL amount with bonus
      const totalPXL = selectedPackage.pxl + selectedPackage.bonus;

      // Call MyFatoorah API to initiate payment
      const response = await fetch('/api/payment/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: selectedPackage.usd,
          customerName,
          customerEmail,
          customerMobile: customerMobile.replace(/[^0-9]/g, '').slice(-8),
          items: [{
            name: `PXL ${selectedPackage.name} - ${formatPXL(totalPXL)} PXL`,
            quantity: 1,
            price: selectedPackage.usd
          }],
        }),
      });

      const data = await response.json();

      if (data.success && data.paymentUrl) {
        // Store purchase info in session storage for callback
        sessionStorage.setItem('pendingPXLPurchase', JSON.stringify({
          packageId: selectedPackage.id,
          pxlAmount: totalPXL,
          usdAmount: selectedPackage.usd,
          orderId: data.orderId,
          invoiceId: data.invoiceId
        }));

        // Redirect to MyFatoorah payment page
        window.location.href = data.paymentUrl;
      } else {
        setError(data.error || 'Failed to initiate payment');
        setIsProcessing(false);
      }
    } catch (error) {
      console.error('Payment error:', error);
      setError('Failed to process payment. Please try again.');
      setIsProcessing(false);
    }
  };

  const currentBalance = platformUser?.wallets?.pxl?.balance || 0;

  return (
    <div className="min-h-screen bg-black py-12">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600/20 rounded-full mb-4">
            <Coins className="h-8 w-8 text-blue-400" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">Buy PXL Currency</h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Purchase PXL to unlock exclusive discounts, earn cashback, and level up your tier status
          </p>
          {user && (
            <div className="mt-4 inline-flex items-center space-x-2 bg-gray-900 rounded-lg px-4 py-2">
              <span className="text-gray-400">Current Balance:</span>
              <span className="text-white font-semibold">{formatPXL(currentBalance)}</span>
            </div>
          )}
        </div>

        {/* Benefits */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
            <Gift className="h-8 w-8 text-green-400 mb-3" />
            <h3 className="text-white font-semibold mb-2">Instant Discounts</h3>
            <p className="text-gray-400 text-sm">
              Save up to 13% on every gift card purchase based on your tier
            </p>
          </div>
          <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
            <TrendingUp className="h-8 w-8 text-blue-400 mb-3" />
            <h3 className="text-white font-semibold mb-2">Earn Cashback</h3>
            <p className="text-gray-400 text-sm">
              Get up to 3% PXL cashback on all purchases
            </p>
          </div>
          <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
            <Zap className="h-8 w-8 text-yellow-400 mb-3" />
            <h3 className="text-white font-semibold mb-2">Level Up Faster</h3>
            <p className="text-gray-400 text-sm">
              Reach higher tiers for better rewards and exclusive perks
            </p>
          </div>
        </div>

        {/* Package Selection */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-6">Choose Your Package</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {PXL_PACKAGES.map((pkg) => (
              <button
                key={pkg.id}
                onClick={() => setSelectedPackage(pkg)}
                className={`relative rounded-xl p-6 border-2 transition-all ${
                  selectedPackage.id === pkg.id
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-gray-800 bg-gray-900 hover:border-gray-700'
                }`}
              >
                {pkg.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                      POPULAR
                    </span>
                  </div>
                )}
                <div className="text-center">
                  <p className="text-3xl font-bold text-white mb-1">
                    {formatPXL(pkg.pxl + pkg.bonus)}
                  </p>
                  <p className="text-gray-400 text-sm mb-3">PXL</p>
                  {pkg.bonus > 0 && (
                    <div className="bg-green-500/20 text-green-400 text-xs font-semibold px-2 py-1 rounded mb-3">
                      +{formatPXL(pkg.bonus)} BONUS
                    </div>
                  )}
                  <p className="text-2xl font-bold text-white mb-1">
                    ${pkg.usd}
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    {pkg.description}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Purchase Section */}
        <div className="max-w-2xl mx-auto">
          <div className="bg-gray-900 rounded-xl p-8 border border-gray-800">
            <h3 className="text-xl font-semibold text-white mb-6">Order Summary</h3>
            
            <div className="space-y-4 mb-6">
              <div className="flex justify-between">
                <span className="text-gray-400">Package</span>
                <span className="text-white font-medium">{selectedPackage.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Base PXL</span>
                <span className="text-white">{formatPXL(selectedPackage.pxl)}</span>
              </div>
              {selectedPackage.bonus > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Bonus PXL</span>
                  <span className="text-green-400">+{formatPXL(selectedPackage.bonus)}</span>
                </div>
              )}
              <div className="border-t border-gray-800 pt-4">
                <div className="flex justify-between text-lg font-semibold">
                  <span className="text-white">Total PXL</span>
                  <span className="text-white">{formatPXL(selectedPackage.pxl + selectedPackage.bonus)}</span>
                </div>
                <div className="flex justify-between mt-2">
                  <span className="text-white">Amount to Pay</span>
                  <span className="text-2xl font-bold text-white">${selectedPackage.usd}</span>
                </div>
              </div>
            </div>

            {/* Payment Button */}
            <Button
              onClick={handlePurchase}
              disabled={isProcessing}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-3"
              size="lg"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard className="h-5 w-5 mr-2" />
                  Pay with MyFatoorah
                </>
              )}
            </Button>

            {/* Error Message */}
            {error && (
              <div className="mt-4 p-3 bg-red-500/10 border border-red-500 rounded-lg">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="h-5 w-5 text-red-500" />
                  <p className="text-red-500 text-sm">{error}</p>
                </div>
              </div>
            )}

            {/* Security Notice */}
            <div className="mt-6 flex items-center justify-center space-x-2 text-xs text-gray-500">
              <Shield className="h-4 w-4" />
              <span>Secure payment powered by MyFatoorah</span>
            </div>
          </div>
        </div>

        {/* Info Section */}
        <div className="mt-12 text-center">
          <p className="text-gray-400 text-sm mb-4">
            PXL is our platform currency. 1 PXL = $0.01 USD
          </p>
          <div className="flex items-center justify-center space-x-4 text-sm">
            <button 
              onClick={() => router.push('/pxl')}
              className="text-blue-400 hover:text-blue-300"
            >
              Learn More About PXL
            </button>
            <span className="text-gray-600">•</span>
            <button 
              onClick={() => router.push('/marketplace')}
              className="text-blue-400 hover:text-blue-300"
            >
              Browse Gift Cards
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}