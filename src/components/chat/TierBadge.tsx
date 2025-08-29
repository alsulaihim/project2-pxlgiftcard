"use client";

import React from 'react';

export interface TierBadgeProps {
  tier: 'starter' | 'rising' | 'pro' | 'pixlbeast' | 'pixlionaire';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Tier badge component as specified in uiux.mdc
 * Displays user tier status with consistent visual hierarchy
 */
export const TierBadge: React.FC<TierBadgeProps> = ({ 
  tier, 
  size = 'sm', 
  className = '' 
}) => {
  const tierConfig = {
    starter: {
      color: 'rgb(226, 223, 223)',
      bgColor: 'bg-gray-600',
      textColor: 'text-gray-100',
      label: 'S',
      fullName: 'Starter'
    },
    rising: {
      color: '#0070f3',
      bgColor: 'bg-blue-600',
      textColor: 'text-blue-100',
      label: 'R',
      fullName: 'Rising'
    },
    pro: {
      color: 'rgb(8, 205, 1)',
      bgColor: 'bg-green-600',
      textColor: 'text-green-100',
      label: 'P',
      fullName: 'Pro'
    },
    pixlbeast: {
      color: '#f59e0b',
      bgColor: 'bg-amber-600',
      textColor: 'text-amber-100',
      label: 'B',
      fullName: 'Pixlbeast'
    },
    pixlionaire: {
      color: 'rgb(185, 43, 228)',
      bgColor: 'bg-purple-600',
      textColor: 'text-purple-100',
      label: 'X',
      fullName: 'Pixlionaire'
    }
  };

  const config = tierConfig[tier];
  
  const sizeClasses = {
    sm: 'w-4 h-4 text-[10px]',
    md: 'w-6 h-6 text-xs',
    lg: 'w-8 h-8 text-sm'
  };

  return (
    <div 
      className={`
        ${sizeClasses[size]} 
        ${config.bgColor} 
        ${config.textColor}
        rounded-full 
        flex items-center justify-center 
        font-semibold 
        border-2 
        ${className}
      `}
      title={config.fullName}
    >
      {config.label}
    </div>
  );
};
