"use client";

import React from 'react';
import { Mic } from 'lucide-react';
import { TierBadge } from './TierBadge';

interface RecordingIndicatorProps {
  recordingUsers: Array<{
    userId: string;
    displayName?: string;
    tier?: 'starter' | 'rising' | 'pro' | 'pixlbeast' | 'pixlionaire';
  }>;
}

/**
 * Recording indicator component showing who is currently recording a voice message
 * Similar to TypingIndicator but for voice recordings
 */
export const RecordingIndicator: React.FC<RecordingIndicatorProps> = ({ recordingUsers }) => {
  if (recordingUsers.length === 0) {
    return null;
  }

  const formatRecordingText = () => {
    if (recordingUsers.length === 1) {
      return `${recordingUsers[0].displayName || 'Someone'} is recording a voice message...`;
    } else if (recordingUsers.length === 2) {
      return `${recordingUsers[0].displayName || 'Someone'} and ${recordingUsers[1].displayName || 'someone'} are recording...`;
    } else {
      return `${recordingUsers.length} people are recording...`;
    }
  };

  return (
    <div className="flex items-center px-4 py-2 text-sm text-red-400 bg-red-900/20">
      <div className="flex items-center space-x-2">
        {/* Show tier badges for recording users */}
        <div className="flex -space-x-1">
          {recordingUsers.slice(0, 3).map((user) => (
            <div key={user.userId} className="flex items-center">
              {user.tier && (
                <TierBadge tier={user.tier} size="sm" className="ring-2 ring-gray-900" />
              )}
            </div>
          ))}
        </div>
        
        {/* Recording animation */}
        <div className="flex items-center space-x-2">
          <Mic className="w-4 h-4 text-red-500 animate-pulse" />
          <span>{formatRecordingText()}</span>
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse [animation-delay:200ms]" />
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse [animation-delay:400ms]" />
          </div>
        </div>
      </div>
    </div>
  );
};