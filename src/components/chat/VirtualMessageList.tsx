"use client";

/* eslint-disable react/forbid-dom-props */
import React, { useMemo, useRef, useEffect } from 'react';
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
const MessageItem: React.FC<MessageItemProps> = ({ index, style, data }) => {
  const { messages, currentUserId, getUserInfo, onReply, onEdit, onDelete, onReact } = data;
  const message = messages[index];
  const isOwn = message.senderId === currentUserId;
  const user = getUserInfo ? getUserInfo(message.senderId) : undefined;

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
};

export const VirtualMessageList: React.FC<VirtualMessageListProps> = ({
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
  
  // Reverse messages for proper chat order (newest at bottom)
  const reversedMessages = useMemo(() => {
    return [...messages].reverse();
  }, [messages]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (listRef.current && reversedMessages.length > 0) {
      listRef.current.scrollToItem(reversedMessages.length - 1, 'end');
    }
  }, [reversedMessages.length]);

  // Fixed item height for consistent rendering
  const itemSize = 100;

  // Handle scroll to load more messages
  const handleScroll = ({ scrollOffset }: { scrollOffset: number }) => {
    if (scrollOffset === 0 && onLoadMore) {
      onLoadMore();
    }
  };

  const itemData = {
    messages: reversedMessages,
    currentUserId,
    getUserInfo,
    onReply,
    onEdit,
    onDelete,
    onReact
  };

  return (
    <div className="flex-1 overflow-hidden pt-4">
      <List
        ref={listRef}
        height={height - 16} // Adjust height to account for padding
        width="100%"
        itemCount={reversedMessages.length}
        itemSize={itemSize}
        itemData={itemData}
        onScroll={handleScroll}
        className="scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800"
      >
        {MessageItem}
      </List>
    </div>
  );
};
