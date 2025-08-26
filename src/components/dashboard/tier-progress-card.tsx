'use client';

import { Card } from '@/components/ui/card';
import { Star, TrendingUp, Lock } from 'lucide-react';

interface TierProgressCardProps {
  currentTier: string;
  currentBalance: number;
  nextTierThreshold: number;
  tierBenefits: {
    discountPercentage: number;
    cashbackPercentage: number;
  };
}

const tierInfo = {
  starter: { 
    name: 'Starter', 
    color: 'rgb(226, 223, 223)', 
    bgColor: 'rgba(226, 223, 223, 0.1)',
    next: 'Rising',
    benefits: { discount: 0, cashback: 0 }
  },
  rising: { 
    name: 'Rising', 
    color: '#0070f3', 
    bgColor: 'rgba(0, 112, 243, 0.1)',
    next: 'Pro',
    benefits: { discount: 5, cashback: 1 }
  },
  pro: { 
    name: 'Pro', 
    color: 'rgb(8, 205, 1)', 
    bgColor: 'rgba(8, 205, 1, 0.1)',
    next: 'Pixlbeast',
    benefits: { discount: 8, cashback: 2 }
  },
  pixlbeast: { 
    name: 'Pixlbeast', 
    color: '#f59e0b', 
    bgColor: 'rgba(245, 158, 11, 0.1)',
    next: 'Pixlionaire',
    benefits: { discount: 10, cashback: 2.5 }
  },
  pixlionaire: { 
    name: 'Pixlionaire', 
    color: 'rgb(185, 43, 228)', 
    bgColor: 'rgba(185, 43, 228, 0.1)',
    next: null,
    benefits: { discount: 13, cashback: 3 }
  }
};

export function TierProgressCard({ 
  currentTier, 
  currentBalance, 
  nextTierThreshold,
  tierBenefits 
}: TierProgressCardProps) {
  const tier = tierInfo[currentTier as keyof typeof tierInfo] || tierInfo.starter;
  const progress = Math.min((currentBalance / nextTierThreshold) * 100, 100);
  const pxlNeeded = Math.max(nextTierThreshold - currentBalance, 0);

  return (
    <Card className="bg-gray-900/50 border-gray-800 p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-white">Tier Progress</h2>
        <div className="flex items-center gap-2">
          <div 
            className={`flex items-center gap-2 px-4 py-2 rounded-full ${
              currentTier === 'starter' ? 'bg-gray-200/10' :
              currentTier === 'rising' ? 'bg-blue-500/10' :
              currentTier === 'pro' ? 'bg-green-500/10' :
              currentTier === 'pixlbeast' ? 'bg-amber-500/10' :
              'bg-purple-500/10'
            }`}
          >
            <Star className={`h-5 w-5 ${
              currentTier === 'starter' ? 'text-gray-300' :
              currentTier === 'rising' ? 'text-blue-500' :
              currentTier === 'pro' ? 'text-green-500' :
              currentTier === 'pixlbeast' ? 'text-amber-500' :
              'text-purple-500'
            }`} />
            <span className={`font-medium ${
              currentTier === 'starter' ? 'text-gray-300' :
              currentTier === 'rising' ? 'text-blue-500' :
              currentTier === 'pro' ? 'text-green-500' :
              currentTier === 'pixlbeast' ? 'text-amber-500' :
              'text-purple-500'
            }`}>
              {tier.name} Tier
            </span>
          </div>
        </div>
      </div>

      {/* Progress Ring */}
      <div className="flex items-center justify-center mb-8">
        <div className="relative w-48 h-48">
          <svg className="w-full h-full transform -rotate-90">
            {/* Background circle */}
            <circle
              cx="96"
              cy="96"
              r="88"
              stroke="#262626"
              strokeWidth="16"
              fill="none"
            />
            {/* Progress circle */}
            <circle
              cx="96"
              cy="96"
              r="88"
              className={`transition-all duration-1000 ease-out ${
                currentTier === 'starter' ? 'stroke-gray-300' :
                currentTier === 'rising' ? 'stroke-blue-500' :
                currentTier === 'pro' ? 'stroke-green-500' :
                currentTier === 'pixlbeast' ? 'stroke-amber-500' :
                'stroke-purple-500'
              }`}
              strokeWidth="16"
              fill="none"
              strokeDasharray={`${2 * Math.PI * 88}`}
              strokeDashoffset={`${2 * Math.PI * 88 * (1 - progress / 100)}`}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-4xl font-bold text-white">{progress.toFixed(0)}%</p>
            <p className="text-sm text-gray-400">Complete</p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-800/50 rounded-lg p-4">
          <p className="text-sm text-gray-400 mb-1">Current Balance</p>
          <p className="text-xl font-semibold text-white">
            {currentBalance.toLocaleString()} PXL
          </p>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-4">
          <p className="text-sm text-gray-400 mb-1">Next Tier In</p>
          <p className="text-xl font-semibold text-white">
            {pxlNeeded.toLocaleString()} PXL
          </p>
        </div>
      </div>

      {/* Current Benefits */}
      <div className="mb-6">
        <h3 className="text-lg font-medium text-white mb-3">Your Current Benefits</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-3 bg-green-500/10 rounded-lg p-3">
            <div className="p-2 bg-green-500/20 rounded-md">
              <TrendingUp className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Discount</p>
              <p className="text-lg font-semibold text-green-500">
                {tier.benefits.discount}%
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-blue-500/10 rounded-lg p-3">
            <div className="p-2 bg-blue-500/20 rounded-md">
              <Star className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Cashback</p>
              <p className="text-lg font-semibold text-blue-500">
                {tier.benefits.cashback}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Next Tier Preview */}
      {tier.next && (
        <div className="border-t border-gray-800 pt-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-medium text-white">Unlock {tier.next} Tier</h3>
            <Lock className="h-5 w-5 text-gray-500" />
          </div>
          <div className="bg-gray-800/30 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">Enhanced Benefits</span>
              <span className="text-sm font-medium text-white">
                {tierInfo[tier.next.toLowerCase() as keyof typeof tierInfo]?.benefits.discount}% discount • {tierInfo[tier.next.toLowerCase() as keyof typeof tierInfo]?.benefits.cashback}% cashback
              </span>
            </div>
            <p className="text-xs text-gray-500">
              Plus exclusive chat channels and early access to deals
            </p>
          </div>
        </div>
      )}
    </Card>
  );
}
