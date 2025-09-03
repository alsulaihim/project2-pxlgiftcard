"use client";

/* eslint-disable react/forbid-dom-props */
import React, { useMemo, useRef, useEffect, useCallback } from 'react';
import { VariableSizeList as List } from 'react-window';
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
    // Use the exact style provided by react-window without modification
    <div className="w-full px-4 py-3" style={style}>
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

MessageItem.displayName = 'MessageItem';

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
  const itemSizeMap = useRef<{ [index: number]: number }>({});
  
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

  // BUG FIX: 2025-01-30 - Proper height calculation for media messages
  // Problem: Media messages overlapping due to insufficient height allocation
  // Solution: Increased heights and added proper padding for each message type
  // Impact: All message types display without overlap
  
  // Get item size - estimate based on message content
  const getItemSize = useCallback((index: number) => {
    // Return cached size if available
    if (itemSizeMap.current[index]) {
      return itemSizeMap.current[index];
    }
    
    // Estimate size based on message content
    const message = orderedMessages[index];
    if (!message) return 100;
    
    // Base height includes padding and margins
    let height = 80; // Base padding and UI elements
    
    // Check message type and add appropriate height
    const messageType = message.type || 'text';
    const metadata = message.metadata || {};
    
    if (messageType === 'image' || metadata.mediaType === 'image') {
      // Images: account for thumbnail height + bubble padding + spacing
      // max-w-sm (384px) with typical aspect ratio needs ~250px
      // Plus bubble chrome, padding, and safe spacing
      height = 380;
    } else if (messageType === 'file' || metadata.mediaType === 'file') {
      // File attachments: icon + filename + size info + padding
      height = 140;
    } else if (messageType === 'voice' || metadata.mediaType === 'voice') {
      // Voice messages: waveform visualization + controls + padding  
      height = 160;
    } else {
      // Text message - calculate based on content length
      const textLength = (message.decryptedContent || message.content || message.text || '').length;
      // Estimate ~50 chars per line, 24px per line
      const lines = Math.ceil(textLength / 50);
      height += lines * 24;
    }
    
    // Add height for reactions row
    if (message.reactions && Object.keys(message.reactions).length > 0) {
      height += 40;
    }
    
    // Add height for reply preview
    if (message.replyTo) {
      height += 50;
    }
    
    // Add universal spacing buffer to prevent any overlap
    height += 30;
    
    // Minimum height to prevent too-tight spacing
    height = Math.max(height, 100);
    // Maximum height for very long messages
    height = Math.min(height, 600);
    
    itemSizeMap.current[index] = height;
    return height;
  }, [orderedMessages]);

  // Reset size cache when messages change
  useEffect(() => {
    itemSizeMap.current = {};
    if (listRef.current) {
      listRef.current.resetAfterIndex(0);
    }
  }, [messages]);

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
        itemSize={getItemSize}
        itemData={itemData}
        onScroll={handleScroll}
        className="scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800"
      >
        {MessageItem}
      </List>
    </div>
  );
});

VirtualMessageList.displayName = 'VirtualMessageList';
