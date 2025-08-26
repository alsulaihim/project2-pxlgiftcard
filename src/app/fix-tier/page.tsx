'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context';
import { calculateTier, TIER_THRESHOLDS } from '@/lib/pxl-currency';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase-config';
import Link from 'next/link';
import { AlertCircle, CheckCircle } from 'lucide-react';

export default function FixTierPage() {
  const { user, platformUser } = useAuth();
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState<string>('');

  const handleFixTier = async () => {
    if (!user || !platformUser) {
      setMessage('You must be logged in to fix your tier.');
      setStatus('error');
      return;
    }

    setStatus('loading');
    setMessage('Recalculating your tier...');

    try {
      const currentBalance = platformUser.wallets?.pxl?.balance || 0;
      const correctTier = calculateTier(currentBalance);
      const currentTier = platformUser.tier?.current || 'starter';

      if (currentTier === correctTier) {
        setMessage(`Your tier is already correct: ${correctTier} (Balance: ${currentBalance} PXL)`);
        setStatus('success');
        return;
      }

      // Update the tier in Firestore
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        'tier.current': correctTier,
        'timestamps.updated': new Date()
      });

      setMessage(`Tier updated from ${currentTier} to ${correctTier} based on your balance of ${currentBalance} PXL`);
      setStatus('success');
    } catch (error: any) {
      console.error('Failed to fix tier:', error);
      setMessage(`Failed to fix tier: ${error.message || 'Unknown error'}`);
      setStatus('error');
    }
  };

  if (!user || !platformUser) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-white mb-4">Please log in to fix your tier.</p>
          <Link href="/auth/signin">
            <Button>Sign In</Button>
          </Link>
        </div>
      </div>
    );
  }

  const currentBalance = platformUser.wallets?.pxl?.balance || 0;
  const currentTier = platformUser.tier?.current || 'starter';
  const expectedTier = calculateTier(currentBalance);
  const needsFix = currentTier !== expectedTier;

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="rounded-md border max-w-md w-full p-6 bg-gray-900 border-gray-800">
        <h1 className="text-2xl font-bold text-white mb-6">Fix Tier Status</h1>
        
        <div className="space-y-4 mb-6">
          <div className="p-4 bg-gray-800 rounded-lg">
            <h2 className="text-sm font-medium text-gray-400 mb-2">Current Status</h2>
            <p className="text-white">Balance: <span className="font-bold">{currentBalance} PXL</span></p>
            <p className="text-white">Current Tier: <span className="font-bold capitalize">{currentTier}</span></p>
            <p className="text-white">Expected Tier: <span className="font-bold capitalize">{expectedTier}</span></p>
          </div>

          <div className="p-4 bg-gray-800 rounded-lg">
            <h2 className="text-sm font-medium text-gray-400 mb-2">Tier Requirements</h2>
            <div className="space-y-1 text-sm">
              <p className="text-gray-300">Starter: 0 PXL</p>
              <p className="text-gray-300">Rising: {TIER_THRESHOLDS.rising.toLocaleString()} PXL</p>
              <p className="text-gray-300">Pro: {TIER_THRESHOLDS.pro.toLocaleString()} PXL</p>
              <p className="text-gray-300">Pixlbeast: {TIER_THRESHOLDS.pixlbeast.toLocaleString()} PXL</p>
              <p className="text-gray-300">Pixlionaire: {TIER_THRESHOLDS.pixlionaire.toLocaleString()} PXL</p>
            </div>
          </div>

          {needsFix && (
            <div className="p-4 bg-yellow-900/20 border border-yellow-800 rounded-lg">
              <div className="flex items-start space-x-2">
                <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5" />
                <div>
                  <p className="text-sm text-yellow-400 font-medium">Tier Mismatch Detected</p>
                  <p className="text-xs text-yellow-300 mt-1">
                    Your tier should be "{expectedTier}" based on your balance.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <Button
          onClick={handleFixTier}
          disabled={status === 'loading' || !needsFix}
          className="w-full"
        >
          {status === 'loading' ? 'Fixing...' : needsFix ? 'Fix My Tier' : 'Tier is Correct'}
        </Button>

        {message && (
          <div className={`mt-4 p-3 rounded-lg ${
            status === 'error' ? 'bg-red-900/20 border border-red-800' : 'bg-green-900/20 border border-green-800'
          }`}>
            <div className="flex items-start space-x-2">
              {status === 'error' ? (
                <AlertCircle className="h-5 w-5 text-red-400 mt-0.5" />
              ) : (
                <CheckCircle className="h-5 w-5 text-green-400 mt-0.5" />
              )}
              <p className={`text-sm ${status === 'error' ? 'text-red-400' : 'text-green-400'}`}>
                {message}
              </p>
            </div>
          </div>
        )}

        <div className="mt-6 text-center">
          <Link href="/dashboard" className="text-sm text-gray-400 hover:text-white">
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
