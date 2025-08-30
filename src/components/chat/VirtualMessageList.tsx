"use client";

/* eslint-disable react/forbid-dom-props */
import React, { useMemo, useRef, useEffect, useCallback } from 'react';
import { FixedSizeList as List } from 'react-window';
import { ChatMessage } from '@/services/chat/firestore-chat.service';
import { MessageBubble } from './MessageBubble';

interface VirtualMessageListProps {
  messages: ChatMessage[];
  currentUserId: string;
  height: number;
  getUserInfo?: (userId: string) => {
    displayName?: string;
    photoURL?: string;
    tier?: 'starter' | 'rising' | 'pro' | 'pixlbeast' | 'pixlionaire';
  };
  onLoadMore?: () => void;
  onReply?: (message: ChatMessage) => void;
  onEdit?: (messageId: string, newText: string) => void;
  onDelete?: (messageId: string) => void;
  onReact?: (messageId: string, emoji: string) => void;
}

interface MessageItemData {
  messages: ChatMessage[];
  currentUserId: string;
  getUserInfo?: (userId: string) => {
    displayName?: string;
    photoURL?: string;
    tier?: 'starter' | 'rising' | 'pro' | 'pixlbeast' | 'pixlionaire';
  };
  onReply?: (message: ChatMessage) => void;
  onEdit?: (messageId: string, newText: string) => void;
  onDelete?: (messageId: string) => void;
  onReact?: (messageId: string, emoji: string) => void;
}

interface MessageItemProps {
  index: number;
  style: React.CSSProperties;
  data: MessageItemData;
}

/**
 * Virtual scrolling message list for performance with thousands of messages
 * As specified in chat-architecture.mdc using react-window
 */
const MessageItem = React.memo<MessageItemProps>(({ index, style, data }) => {
  const { messages, currentUserId, getUserInfo, onReply, onEdit, onDelete, onReact } = data;
  const message = messages[index];
  const isOwn = message.senderId === currentUserId;
  const user = useMemo(() => getUserInfo ? getUserInfo(message.senderId) : undefined, [getUserInfo, message.senderId]);

  return (
    // Note: The style prop is required by react-window for virtual scrolling positioning
    // This is not a regular inline style but a virtual scrolling requirement
    <div className="w-full" {...{ style }}>
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
});

export const VirtualMessageList = React.memo<VirtualMessageListProps>(({
  messages,
  currentUserId,
  height,
  getUserInfo,
  onLoadMore,
  onReply,
  onEdit,
  onDelete,
  onReact
}) => {
  const listRef = useRef<List>(null);
  
  // Messages are already in chronological order (oldest to newest)
  // No need to reverse them
  const orderedMessages = useMemo(() => {
    return messages;
  }, [messages]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (listRef.current && orderedMessages.length > 0) {
      listRef.current.scrollToItem(orderedMessages.length - 1, 'end');
    }
  }, [orderedMessages.length]);

  // Fixed item height for consistent rendering
  const itemSize = 100;

  // Handle scroll to load more messages
  const handleScroll = useCallback(({ scrollOffset }: { scrollOffset: number }) => {
    if (scrollOffset === 0 && onLoadMore) {
      onLoadMore();
    }
  }, [onLoadMore]);

  // Memoize the item data to prevent unnecessary re-renders
  const itemData = useMemo<MessageItemData>(() => ({
    messages: orderedMessages,
    currentUserId,
    getUserInfo,
    onReply,
    onEdit,
    onDelete,
    onReact
  }), [orderedMessages, currentUserId, getUserInfo, onReply, onEdit, onDelete, onReact]);

  return (
    <div className="w-full" style={{ height: `${height}px` }}>
      <List
        ref={listRef}
        height={height}
        width="100%"
        itemCount={orderedMessages.length}
        itemSize={itemSize}
        itemData={itemData}
        onScroll={handleScroll}
        className="scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800"
      >
        {MessageItem}
      </List>
    </div>
  );
});
