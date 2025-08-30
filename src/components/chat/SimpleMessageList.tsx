"use client";

import React, { useRef, useEffect } from 'react';
import { ChatMessage } from '@/services/chat/firestore-chat.service';
import { MessageBubble } from './MessageBubble';

interface SimpleMessageListProps {
  messages: ChatMessage[];
  currentUserId: string;
  getUserInfo?: (userId: string) => {
    displayName?: string;
    photoURL?: string;
    tier?: 'starter' | 'rising' | 'pro' | 'pixlbeast' | 'pixlionaire';
  };
  onReply?: (messageId: string) => void;
  onEdit?: (messageId: string, newText: string) => void;
  onDelete?: (messageId: string) => void;
  onReact?: (messageId: string, emoji: string) => void;
}

/**
 * BUG FIX: 2025-01-30 - Simple message list without virtual scrolling
 * Problem: Virtual scrolling causing overlap issues with media messages
 * Solution: Use simple scrollable div with proper spacing
 * Impact: Media messages display correctly without overlap
 */
export const SimpleMessageList: React.FC<SimpleMessageListProps> = ({
  messages,
  currentUserId,
  getUserInfo,
  onReply,
  onEdit,
  onDelete,
  onReact
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastMessageRef = useRef<HTMLDivElement>(null);

  // Deduplicate messages to prevent key conflicts
  const deduplicatedMessages = React.useMemo(() => {
    const seen = new Set<string>();
    const uniqueMessages: ChatMessage[] = [];
    
    // Process messages in reverse to keep the latest version of duplicates
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];
      if (!seen.has(message.id)) {
        seen.add(message.id);
        uniqueMessages.unshift(message);
      }
    }
    
    return uniqueMessages;
  }, [messages]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (lastMessageRef.current) {
      lastMessageRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [deduplicatedMessages.length]);

  return (
    <div 
      ref={scrollRef}
      className="flex-1 overflow-y-auto px-4 py-4 space-y-4"
      style={{ height: '100%' }}
    >
      {deduplicatedMessages.map((message, index) => {
        const isOwn = message.senderId === currentUserId;
        const user = getUserInfo ? getUserInfo(message.senderId) : undefined;
        const isLast = index === deduplicatedMessages.length - 1;

        return (
          <div 
            key={message.id} 
            ref={isLast ? lastMessageRef : null}
            className="w-full"
          >
            <MessageBubble
              message={message}
              isOwn={isOwn}
              user={user}
              showAvatar={!isOwn}
              currentUserId={currentUserId}
              onReply={onReply}
              onEdit={onEdit}
              onDelete={onDelete}
              onReact={onReact}
            />
          </div>
        );
      })}
    </div>
  );
};