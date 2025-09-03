'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface NotificationBadgeProps {
  count: number;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  pulse?: boolean;
}

export function NotificationBadge({ 
  count, 
  className = '', 
  size = 'md',
  pulse = true 
}: NotificationBadgeProps) {
  if (count <= 0) return null;

  const sizeClasses = {
    sm: 'min-w-[18px] h-[18px] text-[10px]',
    md: 'min-w-[20px] h-[20px] text-xs',
    lg: 'min-w-[24px] h-[24px] text-sm'
  };

  const displayCount = count > 99 ? '99+' : count.toString();

  return (
    <AnimatePresence>
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        transition={{ duration: 0.2, type: 'spring', stiffness: 500, damping: 15 }}
        className={`
          absolute -top-1 -right-1 
          ${sizeClasses[size]}
          px-1.5
          bg-gradient-to-r from-red-500 to-pink-500
          text-white font-bold
          rounded-full
          flex items-center justify-center
          shadow-lg
          ${pulse && count > 0 ? 'animate-pulse' : ''}
          ${className}
        `}
      >
        <span className="relative">
          {displayCount}
          {pulse && count > 0 && (
            <span className="absolute inset-0 rounded-full bg-red-400 opacity-75 animate-ping" />
          )}
        </span>
      </motion.div>
    </AnimatePresence>
  );
}

export function InlineBadge({ 
  count, 
  className = '' 
}: { 
  count: number; 
  className?: string;
}) {
  if (count <= 0) return null;

  const displayCount = count > 99 ? '99+' : count.toString();

  return (
    <motion.span
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className={`
        inline-flex items-center justify-center
        min-w-[20px] h-5 px-1.5
        bg-gradient-to-r from-red-500 to-pink-500
        text-white text-xs font-bold
        rounded-full
        ${className}
      `}
    >
      {displayCount}
    </motion.span>
  );
}