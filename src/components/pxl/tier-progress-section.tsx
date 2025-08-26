"use client";

import * as React from "react";
import { Star, Zap, Crown, Trophy, Gem, CheckCircle } from "lucide-react";

/**
 * Tier progression section showing current tier, progress, and benefits
 */
export function TierProgressSection() {
  // Mock data - would come from API/context in real app
  const tierData = {
    currentTier: "pro" as const,
    currentBalance: 12450,
    nextTierThreshold: 25000,
    tierBenefits: {
      discountPercentage: 8,
      cashbackPercentage: 3,
    }
  };

  const tiers = [
    {
      id: "starter",
      name: "Starter",
      threshold: 0,
      icon: Star,
      color: "text-gray-400",
      bgColor: "bg-gray-800",
      discount: 0,
      cashback: 0,
    },
    {
      id: "rising",
      name: "Rising",
      threshold: 1000,
      icon: Zap,
      color: "text-blue-400",
      bgColor: "bg-blue-500/20",
      discount: 3,
      cashback: 1,
    },
    {
      id: "pro",
      name: "Pro",
      threshold: 5000,
      icon: Crown,
      color: "text-green-400",
      bgColor: "bg-green-500/20",
      discount: 8,
      cashback: 3,
    },
    {
      id: "pixlbeast",
      name: "Pixlbeast",
      threshold: 25000,
      icon: Trophy,
      color: "text-yellow-400",
      bgColor: "bg-yellow-500/20",
      discount: 13,
      cashback: 5,
    },
    {
      id: "pixlionaire",
      name: "Pixlionaire",
      threshold: 100000,
      icon: Gem,
      color: "text-purple-400",
      bgColor: "bg-purple-500/20",
      discount: 15,
      cashback: 8,
    },
  ];

  const currentTierIndex = tiers.findIndex(tier => tier.id === tierData.currentTier);
  const currentTierInfo = tiers[currentTierIndex];
  const nextTierInfo = tiers[currentTierIndex + 1];
  
  const progressPercentage = nextTierInfo 
    ? ((tierData.currentBalance - currentTierInfo.threshold) / (nextTierInfo.threshold - currentTierInfo.threshold)) * 100
    : 100;

  const pxlNeeded = nextTierInfo ? nextTierInfo.threshold - tierData.currentBalance : 0;

  return (
    <section className="space-y-4">
      {/* Current Tier Status */}
      <div className="rounded-xl border border-gray-800 bg-gray-950 p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-white">Tier Status</h2>
            <p className="text-gray-400">Your current tier and progression</p>
          </div>
          <div className={`flex items-center space-x-3 rounded-lg px-4 py-2 ${currentTierInfo.bgColor}`}>
            <currentTierInfo.icon className={`h-6 w-6 ${currentTierInfo.color}`} />
            <span className="font-semibold text-white">{currentTierInfo.name}</span>
          </div>
        </div>

        {/* Progress Bar */}
        {nextTierInfo && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">
                Progress to {nextTierInfo.name}
              </span>
              <span className="text-sm text-white">
                {Math.round(progressPercentage)}%
              </span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-3 relative overflow-hidden">
              <div 
                className={`bg-white h-3 rounded-full transition-all duration-300 ${
                  progressPercentage >= 100 ? 'w-full' : 
                  progressPercentage >= 75 ? 'w-3/4' :
                  progressPercentage >= 50 ? 'w-1/2' :
                  progressPercentage >= 25 ? 'w-1/4' :
                  progressPercentage >= 10 ? 'w-1/12' : 'w-0'
                }`}
              />
            </div>
            <div className="flex items-center justify-between mt-2 text-sm">
              <span className="text-gray-400">
                PXL {tierData.currentBalance.toLocaleString()}
              </span>
              <span className="text-gray-400">
                PXL {nextTierInfo.threshold.toLocaleString()}
              </span>
            </div>
            {pxlNeeded > 0 && (
              <p className="text-center text-sm text-gray-300 mt-2">
                <span className="font-medium text-white">PXL {pxlNeeded.toLocaleString()}</span> needed for next tier
              </p>
            )}
          </div>
        )}

        {/* Current Benefits */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Star className="h-5 w-5 text-gray-300" />
              <span className="font-medium text-white">Discount</span>
            </div>
            <p className="text-2xl font-bold text-white">
              {tierData.tierBenefits.discountPercentage}%
            </p>
            <p className="text-xs text-gray-400">On PXL purchases</p>
          </div>
          <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Zap className="h-5 w-5 text-gray-300" />
              <span className="font-medium text-white">Cashback</span>
            </div>
            <p className="text-2xl font-bold text-white">
              {tierData.tierBenefits.cashbackPercentage}%
            </p>
            <p className="text-xs text-gray-400">PXL earned back</p>
          </div>
        </div>
      </div>

      {/* All Tiers Timeline */}
      <div className="rounded-xl border border-gray-800 bg-gray-950 p-3">
        <h3 className="text-lg font-semibold text-white mb-3">Tier Progression</h3>
        
        {/* Horizontal Timeline Container */}
        <div className="relative overflow-x-auto pb-2">
          {/* Timeline Items */}
          <div className="flex justify-between items-start min-w-[700px] relative">
            {/* Background Timeline Line - positioned at fixed height */}
            <div className="absolute top-5 left-6 right-6 h-0.5 bg-gray-700 z-0"></div>
            
            {/* Progress Line - positioned at fixed height */}
            <div className={`absolute top-5 left-6 h-0.5 bg-gradient-to-r from-green-400 to-blue-400 transition-all duration-500 z-0 ${
              currentTierIndex === 0 ? 'w-0' :
              currentTierIndex === 1 ? 'w-1/4' :
              currentTierIndex === 2 ? 'w-2/4' :
              currentTierIndex === 3 ? 'w-3/4' :
              currentTierIndex >= 4 ? 'w-full' : 'w-0'
            }`}></div>
            
            {tiers.map((tier, index) => {
              const isCurrentTier = tier.id === tierData.currentTier;
              const isCompleted = index <= currentTierIndex;
              const isNext = index === currentTierIndex + 1;
              
              // Get tier-specific classes
              const getTierClasses = () => {
                switch (tier.id) {
                  case 'starter': return {
                    border: 'border-gray-300',
                    bg: 'bg-gray-300',
                    bgLight: 'bg-gray-300/20',
                    text: 'text-gray-300'
                  };
                  case 'rising': return {
                    border: 'border-blue-500',
                    bg: 'bg-blue-500',
                    bgLight: 'bg-blue-500/20',
                    text: 'text-blue-500'
                  };
                  case 'pro': return {
                    border: 'border-green-500',
                    bg: 'bg-green-500',
                    bgLight: 'bg-green-500/20',
                    text: 'text-green-500'
                  };
                  case 'pixlbeast': return {
                    border: 'border-amber-500',
                    bg: 'bg-amber-500',
                    bgLight: 'bg-amber-500/20',
                    text: 'text-amber-500'
                  };
                  case 'pixlionaire': return {
                    border: 'border-purple-500',
                    bg: 'bg-purple-500',
                    bgLight: 'bg-purple-500/20',
                    text: 'text-purple-500'
                  };
                  default: return {
                    border: 'border-gray-600',
                    bg: 'bg-gray-800',
                    bgLight: 'bg-gray-800',
                    text: 'text-gray-400'
                  };
                }
              };
              
              const tierClasses = getTierClasses();
              
              return (
                <div key={tier.id} className="flex flex-col items-center flex-1 relative">
                  {/* Timeline Node */}
                  <div className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all ${
                    isCurrentTier 
                      ? 'border-white bg-white shadow-lg shadow-white/20' 
                      : isCompleted 
                      ? `${tierClasses.border} ${tierClasses.bg}` 
                      : isNext
                      ? 'border-blue-400 bg-gray-900 ring-2 ring-blue-400/30'
                      : `${tierClasses.border} ${tierClasses.bgLight}`
                  }`}>
                    {isCompleted && !isCurrentTier ? (
                      <CheckCircle className="h-5 w-5 text-white" />
                    ) : (
                      <tier.icon className={`h-4 w-4 ${
                        isCurrentTier 
                          ? 'text-black' 
                          : isCompleted 
                          ? 'text-white' 
                          : isNext
                          ? 'text-blue-400'
                          : tierClasses.text
                      }`} />
                    )}
                  </div>
                  
                  {/* Tier Content */}
                  <div className="mt-3 text-center max-w-[120px]">
                    <div className="space-y-1">
                      <div className="flex flex-col items-center space-y-0.5">
                        <span className={`font-semibold text-xs ${
                          isCurrentTier ? 'text-white' : isCompleted ? tierClasses.text : tierClasses.text
                        }`}>
                          {tier.name}
                        </span>
                        {isCurrentTier && (
                          <span className="rounded-full bg-white px-1.5 py-0.5 text-xs font-bold text-black">
                            CURRENT
                          </span>
                        )}
                        {isNext && (
                          <span className="rounded-full bg-blue-500/20 border border-blue-400 px-1.5 py-0.5 text-xs font-medium text-blue-400">
                            NEXT
                          </span>
                        )}
                      </div>
                      
                      <div className="flex justify-center space-x-1 text-xs">
                        <div className="text-center">
                          <div className={`font-medium text-xs ${isCurrentTier ? 'text-white' : 'text-gray-400'}`}>
                            {tier.discount}%
                          </div>
                          <div className="text-gray-500 text-xs">off</div>
                        </div>
                        <div className="text-center">
                          <div className={`font-medium text-xs ${isCurrentTier ? 'text-white' : 'text-gray-400'}`}>
                            {tier.cashback}%
                          </div>
                          <div className="text-gray-500 text-xs">back</div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-0.5 text-xs text-gray-500">
                      {tier.threshold === 0 
                        ? 'Start' 
                        : `${tier.threshold.toLocaleString()}+`
                      }
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
