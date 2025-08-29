"use client";

import React from 'react';
import { TierBadge } from './TierBadge';

interface TypingIndicatorProps {
  typingUsers: Array<{
    userId: string;
    displayName?: string;
    tier?: 'starter' | 'rising' | 'pro' | 'pixlbeast' | 'pixlionaire';
  }>;
}

/**
 * Typing indicator component showing who is currently typing
 * As specified in chat-architecture.mdc with tier indicators
 */
export const TypingIndicator: React.FC<TypingIndicatorProps> = ({ typingUsers }) => {
  if (typingUsers.length === 0) {
    return null;
  }

  const formatTypingText = () => {
    if (typingUsers.length === 1) {
      return `${typingUsers[0].displayName || 'Someone'} is typing...`;
    } else if (typingUsers.length === 2) {
      return `${typingUsers[0].displayName || 'Someone'} and ${typingUsers[1].displayName || 'someone'} are typing...`;
    } else {
      return `${typingUsers.length} people are typing...`;
    }
  };

  return (
    <div className="flex items-center px-4 py-2 text-sm text-gray-400">
      <div className="flex items-center space-x-2">
        {/* Show tier badges for typing users */}
        <div className="flex -space-x-1">
          {typingUsers.slice(0, 3).map((user) => (
            <div key={user.userId} className="flex items-center">
              {user.tier && (
                <TierBadge tier={user.tier} size="sm" className="ring-2 ring-gray-900" />
              )}
            </div>
          ))}
        </div>
        
        {/* Typing animation */}
        <div className="flex items-center space-x-1">
          <span>{formatTypingText()}</span>
          <div className="flex space-x-1">
            <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" />
            <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce [animation-delay:100ms]" />
            <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce [animation-delay:200ms]" />
          </div>
        </div>
      </div>
    </div>
  );
};
