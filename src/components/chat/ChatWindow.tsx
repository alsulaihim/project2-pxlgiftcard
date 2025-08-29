"use client";

import React, { useState, useEffect, useRef } from "react";
import { ChatMessage, markMessageAsRead } from "@/services/chat/firestore-chat.service";
import { VirtualMessageList } from "./VirtualMessageList";
import { TypingIndicator } from "./TypingIndicator";
import { presenceService } from "@/services/chat/presence.service";

interface ChatWindowProps {
  messages: ChatMessage[];
  currentUserId: string;
  conversationId?: string;
  memberIds?: string[];
  onLoadMore?: () => void;
  getUserInfo?: (userId: string) => {
    displayName?: string;
    photoURL?: string;
    tier?: 'starter' | 'rising' | 'pro' | 'pixlbeast' | 'pixlionaire';
  };
}

/**
 * Enhanced chat window with virtual scrolling, typing indicators, and presence
 * As specified in chat-architecture.mdc
 */
export const ChatWindow: React.FC<ChatWindowProps> = ({ 
  messages, 
  currentUserId,
  conversationId,
  memberIds = [],
  onLoadMore,
  getUserInfo
}) => {
  const [typingUsers, setTypingUsers] = useState<Array<{
    userId: string;
    displayName?: string;
    tier?: 'starter' | 'rising' | 'pro' | 'pixlbeast' | 'pixlionaire';
  }>>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(400);

  // Subscribe to typing indicators
  useEffect(() => {
    if (!conversationId || memberIds.length === 0) return;

    const unsubscribe = presenceService.subscribeToTyping(
      conversationId,
      memberIds,
      (typingUserIds) => {
        const typingUsersWithInfo = typingUserIds.map(userId => {
          const userInfo = getUserInfo ? getUserInfo(userId) : {};
          return {
            userId,
            displayName: userInfo.displayName,
            tier: userInfo.tier
          };
        });
        setTypingUsers(typingUsersWithInfo);
      }
    );

    return unsubscribe;
  }, [conversationId, memberIds, getUserInfo]);

  // Update container height on resize
  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerHeight(rect.height);
      }
    };

    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  // Mark messages as read when they come into view
  useEffect(() => {
    if (!conversationId || messages.length === 0) return;

    const markUnreadMessages = async () => {
      const unreadMessages = messages.filter(msg => 
        msg.senderId !== currentUserId && 
        (!msg.readBy || !msg.readBy.includes(currentUserId))
      );

      for (const message of unreadMessages) {
        try {
          await markMessageAsRead(conversationId, message.id, currentUserId);
        } catch (error) {
          console.error('Failed to mark message as read:', error);
        }
      }
    };

    // Debounce the read marking to avoid excessive calls
    const timeoutId = setTimeout(markUnreadMessages, 1000);
    return () => clearTimeout(timeoutId);
  }, [messages, conversationId, currentUserId]);

  if (messages.length === 0) {
    return (
      <div ref={containerRef} className="flex-1 flex items-center justify-center">
        <div className="text-center text-gray-500">
          <div className="text-6xl mb-4">💬</div>
          <h3 className="text-lg font-medium mb-2">No messages yet</h3>
          <p className="text-sm">Start the conversation with an encrypted message!</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex-1 flex flex-col">
      {/* Virtual scrolling message list */}
      <VirtualMessageList
        messages={messages}
        currentUserId={currentUserId}
        height={containerHeight - (typingUsers.length > 0 ? 50 : 0)}
        getUserInfo={getUserInfo}
        onLoadMore={onLoadMore}
      />
      
      {/* Typing indicator */}
      <TypingIndicator typingUsers={typingUsers} />
    </div>
  );
};


