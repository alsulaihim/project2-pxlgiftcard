'use client';

import { useState } from 'react';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase-config';
import { generateMockRateData, DEFAULT_TIER_BENEFITS, PURCHASE_DISCOUNTS } from '@/lib/pxl-currency';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CheckCircle, AlertCircle } from 'lucide-react';

export default function InitPXLPage() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const initializePXLCurrency = async () => {
    setStatus('loading');
    setMessage('Initializing PXL currency data...');

    try {
      const mockData = generateMockRateData(100);
      
      const currencyData = {
        id: 'pxl-currency',
        currentRate: mockData.currentRate,
        baseRate: 100,
        marketData: {
          hourlyRates: mockData.hourlyRates,
          dailyRates: mockData.dailyRates,
          trend: mockData.trend,
          volatility: mockData.volatility,
        },
        tierMultipliers: DEFAULT_TIER_BENEFITS,
        purchaseDiscounts: PURCHASE_DISCOUNTS,
        lastUpdated: Timestamp.now(),
      };

      // Save to Firestore
      await setDoc(doc(db, 'pxl-currency', 'main'), currencyData);
      
      setStatus('success');
      setMessage(`PXL currency initialized successfully! Current rate: 1 USD = ${mockData.currentRate.toFixed(2)} PXL`);
    } catch (error) {
      console.error('Error initializing PXL currency:', error);
      setStatus('error');
      setMessage(`Failed to initialize: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-6 bg-gray-900 border-gray-800">
        <h1 className="text-2xl font-bold text-white mb-4">Initialize PXL Currency</h1>
        
        {status === 'idle' && (
          <>
            <p className="text-gray-400 mb-6">
              This will create the initial PXL currency data in Firestore. 
              Run this once to set up exchange rates and tier configurations.
            </p>
            <Button 
              onClick={initializePXLCurrency}
              className="w-full"
            >
              Initialize PXL Currency
            </Button>
          </>
        )}

        {status === 'loading' && (
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-gray-400">{message}</p>
          </div>
        )}

        {status === 'success' && (
          <div className="text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <p className="text-green-400 mb-4">{message}</p>
            <Button 
              onClick={() => window.location.href = '/dashboard'}
              className="w-full"
            >
              Go to Dashboard
            </Button>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-400 mb-4">{message}</p>
            <Button 
              onClick={initializePXLCurrency}
              variant="secondary"
              className="w-full"
            >
              Try Again
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
