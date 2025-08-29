"use client";

import React from "react";
import { Conversation } from "@/services/chat/firestore-chat.service";

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
                {c.type === "direct" && otherUser ? (
                  <>
                    <div className="relative flex-shrink-0">
                      <img
                        src={otherUser.photoURL || '/default-avatar.png'}
                        alt={otherUser.displayName || 'User'}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      {/* Tier ring */}
                      <div className={`absolute inset-0 rounded-full border-2 ${
                        otherUser.tier === 'starter' ? 'border-gray-400' :
                        otherUser.tier === 'rising' ? 'border-blue-500' :
                        otherUser.tier === 'pro' ? 'border-purple-500' :
                        otherUser.tier === 'pixlbeast' ? 'border-yellow-500' :
                        otherUser.tier === 'pixlionaire' ? 'border-red-500' :
                        'border-gray-400'
                      }`}></div>
                    </div>
                    <div className="text-sm font-medium truncate">
                      {otherUser.displayName || 'Unknown User'}
                    </div>
                  </>
                ) : (
                  <div className="text-sm font-medium truncate">
                    {c.type === "direct" ? "Direct Message" : "Group Chat"}
                  </div>
                )}
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


