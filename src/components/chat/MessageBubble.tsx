"use client";

import React from "react";
import { ChatMessage } from "@/services/chat/firestore-chat.service";
import { TierBadge } from "./TierBadge";

interface MessageBubbleProps {
  message: ChatMessage;
  isOwn: boolean;
  user?: {
    displayName?: string;
    photoURL?: string;
    tier?: 'starter' | 'rising' | 'pro' | 'pixlbeast' | 'pixlionaire';
  };
  showAvatar?: boolean;
}

/**
 * Enhanced message bubble component with tier indicators
 * As specified in chat-architecture.mdc and uiux.mdc
 */
export const MessageBubble: React.FC<MessageBubbleProps> = ({ 
  message, 
  isOwn, 
  user,
  showAvatar = true 
}) => {
  const formatTime = (timestamp: any) => {
    if (!timestamp || typeof timestamp.toDate !== 'function') return '';
    const date = timestamp.toDate();
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"} mb-4 px-4`}>
      <div className={`flex ${isOwn ? 'flex-row-reverse' : 'flex-row'} items-end max-w-[70%]`}>
        {/* Avatar with tier ring */}
        {showAvatar && user && (
          <div className="relative mx-2 flex-shrink-0">
            <img 
              src={user.photoURL || '/default-avatar.png'} 
              alt={user.displayName || 'User'}
              className="w-8 h-8 rounded-full object-cover"
            />
            {user.tier && (
              <div className="absolute -bottom-1 -right-1">
                <TierBadge tier={user.tier} size="sm" />
              </div>
            )}
          </div>
        )}
        
        {/* Message content */}
        <div className={`
          px-4 py-2 rounded-2xl
          ${isOwn 
            ? 'bg-blue-600 text-white rounded-br-sm' 
            : 'bg-gray-800 text-gray-100 rounded-bl-sm'}
        `}>
          {/* User name for non-own messages */}
          {!isOwn && user?.displayName && (
            <div className="text-xs opacity-70 mb-1 flex items-center gap-1">
              <span>{user.displayName}</span>
              {user.tier && <TierBadge tier={user.tier} size="sm" />}
            </div>
          )}
          
          <p className="text-sm whitespace-pre-wrap">{message.text}</p>
          
          <div className="flex items-center justify-between mt-1">
            <span className="text-xs opacity-70">
              {formatTime(message.timestamp)}
            </span>
            
            {/* Message status indicators */}
            {isOwn && (
              <div className="flex items-center ml-2">
                {message.readBy && message.readBy.length > 0 ? (
                  <span className="text-xs opacity-70 text-blue-400">✓✓</span>
                ) : (
                  <span className="text-xs opacity-70">✓</span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};


