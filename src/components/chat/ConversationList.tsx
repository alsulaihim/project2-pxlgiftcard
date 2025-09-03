"use client";

import React from "react";
import { Conversation } from "@/services/chat/firestore-chat.service";
import { NotificationBadge } from "@/components/ui/NotificationBadge";

interface Props {
  conversations: Conversation[];
  activeId?: string;
  onSelect: (c: Conversation) => void;
  onDelete?: (conversationId: string) => void;
  currentUserId?: string;
  getUserInfo?: (userId: string) => {
    displayName?: string;
    photoURL?: string;
    tier?: 'starter' | 'rising' | 'pro' | 'pixlbeast' | 'pixlionaire';
  };
}

export function ConversationList({ conversations, activeId, onSelect, onDelete, currentUserId, getUserInfo }: Props) {
  return (
    <div className="space-y-1">
      {conversations.map((c) => {
        // For direct messages, get the other user's info
        const otherUserId = c.type === "direct" && currentUserId 
          ? c.members.find(id => id !== currentUserId)
          : null;
        const otherUser = otherUserId && getUserInfo ? getUserInfo(otherUserId) : null;
        
        // For group chats, use group info
        const isGroup = c.type === 'group';
        
        // Ensure we always have valid user data
        const displayUser = otherUser || {
          displayName: 'Loading...',
          photoURL: '/default-avatar.png',
          tier: 'starter' as const
        };

        return (
          <div
            key={c.id}
            className={`relative group rounded-lg border ${
              activeId === c.id ? "border-gray-700 bg-gray-900" : "border-gray-900 hover:border-gray-800"
            } text-gray-200`}
          >
            <button
              onClick={() => onSelect(c)}
              className="w-full text-left px-3 py-2 rounded-lg"
            >
              <div className="flex items-center space-x-2 mb-1">
                {/* Profile picture */}
                <div className="relative flex-shrink-0">
                  <img
                    src={isGroup ? (c.groupInfo?.photoURL || '/default-group.svg') : (displayUser.photoURL || '/default-avatar.png')}
                    alt={isGroup ? c.groupInfo?.name : displayUser.displayName}
                    className="w-10 h-10 rounded-full object-cover border-2 border-gray-900 bg-gray-700"
                    onError={(e) => {
                      console.error('❌ Failed to load image:', isGroup ? c.groupInfo?.photoURL : displayUser.photoURL);
                      (e.target as HTMLImageElement).src = isGroup ? '/default-group.svg' : '/default-avatar.png';
                    }}
                  />
                  {/* Tier badge for direct messages only */}
                  {!isGroup && displayUser.tier && (
                    <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border-2 border-gray-900 text-white ${
                      displayUser.tier === 'starter' ? 'tier-bg-starter' :
                      displayUser.tier === 'rising' ? 'tier-bg-rising' :
                      displayUser.tier === 'pro' ? 'tier-bg-pro' :
                      displayUser.tier === 'pixlbeast' ? 'tier-bg-pixlbeast' :
                      displayUser.tier === 'pixlionaire' ? 'tier-bg-pixlionaire' :
                      'tier-bg-starter'
                    }`}>
                      {displayUser.tier === 'starter' ? 'S' :
                       displayUser.tier === 'rising' ? 'R' :
                       displayUser.tier === 'pro' ? 'P' :
                       displayUser.tier === 'pixlbeast' ? 'B' :
                       displayUser.tier === 'pixlionaire' ? 'X' : 'S'}
                    </div>
                  )}
                  {/* Group icon badge */}
                  {isGroup && (
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border-2 border-gray-900 bg-purple-600">
                      G
                    </div>
                  )}
                </div>
                {/* Name and unread count */}
                <div className="flex-1 flex items-center justify-between">
                  <div className="text-sm font-medium truncate">
                    {isGroup ? (c.groupInfo?.name || 'Group Chat') : displayUser.displayName}
                  </div>
                  {(c as any).unreadCount > 0 && activeId !== c.id && (
                    <NotificationBadge count={(c as any).unreadCount} size="sm" pulse={true} className="relative top-0 right-0" />
                  )}
                </div>
              </div>
              {c.lastMessage?.text && (
                <div className="text-xs text-gray-400 truncate pl-12">{c.lastMessage.text}</div>
              )}
            </button>
            
            {/* Delete button - only show on hover and if onDelete is provided */}
            {onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm('Delete this conversation? This action cannot be undone.')) {
                    onDelete(c.id);
                  }
                }}
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-red-600 hover:bg-red-700 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                title="Delete conversation"
              >
                ×
              </button>
            )}
          </div>
        );
      })}
      {conversations.length === 0 && (
        <div className="text-xs text-gray-500">No conversations yet.</div>
      )}
    </div>
  );
}


