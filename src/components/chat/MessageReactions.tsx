/**
 * Message Reactions Component - Emoji reactions for messages
 * Similar to WhatsApp/Slack reactions
 */

import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { useChatStore } from '@/stores/chatStore';

interface MessageReactionsProps {
  messageId: string;
  reactions?: Map<string, string[]>; // emoji -> userIds
  currentUserId: string;
  isOwn: boolean;
}

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏', '🎉', '🔥'];

export const MessageReactions: React.FC<MessageReactionsProps> = ({
  messageId,
  reactions = new Map(),
  currentUserId,
  isOwn
}) => {
  const [showPicker, setShowPicker] = useState(false);
  const { addReaction, removeReaction } = useChatStore();

  const handleReaction = (emoji: string) => {
    const users = reactions.get(emoji) || [];
    const hasReacted = users.includes(currentUserId);
    
    if (hasReacted) {
      removeReaction(messageId, emoji);
    } else {
      addReaction(messageId, emoji);
    }
    
    setShowPicker(false);
  };

  const getReactionCount = () => {
    let count = 0;
    reactions.forEach(users => {
      count += users.length;
    });
    return count;
  };

  if (reactions.size === 0 && !showPicker) {
    return null;
  }

  return (
    <div className={`flex items-center gap-1 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
      {/* Existing reactions */}
      <div className="flex flex-wrap gap-1">
        {Array.from(reactions.entries()).map(([emoji, users]) => {
          const hasReacted = users.includes(currentUserId);
          return (
            <button
              key={emoji}
              onClick={() => handleReaction(emoji)}
              className={`
                px-2 py-1 rounded-full text-xs flex items-center gap-1
                transition-all duration-200 hover:scale-110
                ${hasReacted 
                  ? 'bg-blue-500/20 border border-blue-500' 
                  : 'bg-gray-700/50 border border-gray-600 hover:bg-gray-700'}
              `}
            >
              <span>{emoji}</span>
              {users.length > 1 && (
                <span className="text-[10px] font-medium">{users.length}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Add reaction button */}
      <div className="relative">
        <button
          onClick={() => setShowPicker(!showPicker)}
          className="p-1 rounded-full hover:bg-gray-700/50 transition-colors"
          title="Add reaction"
        >
          {showPicker ? (
            <X className="w-4 h-4 text-gray-400" />
          ) : (
            <Plus className="w-4 h-4 text-gray-400" />
          )}
        </button>

        {/* Quick reaction picker */}
        {showPicker && (
          <div className={`
            absolute z-50 bg-gray-800 rounded-lg shadow-xl p-2
            ${isOwn ? 'right-0' : 'left-0'}
            bottom-full mb-2
          `}>
            <div className="flex gap-1">
              {QUICK_REACTIONS.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => handleReaction(emoji)}
                  className="p-2 hover:bg-gray-700 rounded transition-colors text-lg"
                  title={emoji}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageReactions;