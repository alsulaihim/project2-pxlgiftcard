"use client";

import React, { useState, useEffect } from 'react';
import { X, Forward, Search, Check } from 'lucide-react';
import { ChatMessage, Conversation } from '@/services/chat/firestore-chat.service';
import { useChatStore } from '@/stores/chatStore';
import { useAuth } from '@/contexts/auth-context';

interface ForwardMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: ChatMessage | null;
  onForward: (conversationIds: string[]) => Promise<void>;
}

export function ForwardMessageModal({ 
  isOpen, 
  onClose, 
  message, 
  onForward 
}: ForwardMessageModalProps) {
  const { user } = useAuth();
  const { conversations } = useChatStore();
  const [selectedConversations, setSelectedConversations] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isForwarding, setIsForwarding] = useState(false);

  // Reset selections when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedConversations([]);
      setSearchQuery('');
    }
  }, [isOpen]);

  if (!isOpen || !message) return null;

  const toggleConversation = (conversationId: string) => {
    setSelectedConversations(prev =>
      prev.includes(conversationId)
        ? prev.filter(id => id !== conversationId)
        : [...prev, conversationId]
    );
  };

  const handleForward = async () => {
    if (selectedConversations.length === 0) return;

    setIsForwarding(true);
    try {
      await onForward(selectedConversations);
      onClose();
    } catch (error) {
      console.error('Failed to forward message:', error);
      alert('Failed to forward message. Please try again.');
    } finally {
      setIsForwarding(false);
    }
  };

  // Filter conversations based on search
  const filteredConversations = Array.from(conversations.values()).filter(conv => {
    if (!searchQuery) return true;
    
    if (conv.type === 'group') {
      return conv.groupInfo?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    } else {
      // For direct messages, search by member names
      const otherMemberId = conv.members.find(id => id !== user?.uid);
      // In a real app, you'd have user info here
      return otherMemberId?.toLowerCase().includes(searchQuery.toLowerCase());
    }
  });

  // Format message preview
  const getMessagePreview = () => {
    if (message.type === 'image') return '📷 Image';
    if (message.type === 'file') return '📎 File';
    if (message.type === 'voice') return '🎤 Voice message';
    
    const text = message.text || message.decryptedContent || '';
    return text.length > 100 ? text.substring(0, 100) + '...' : text;
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#0a0a0a] rounded-lg max-w-md w-full max-h-[80vh] overflow-hidden border border-gray-800">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Forward className="w-5 h-5 text-white" />
            <h2 className="text-lg font-semibold text-white">Forward Message</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-800 rounded transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Message Preview */}
        <div className="px-6 py-3 bg-[#1a1a1a] border-b border-gray-800">
          <p className="text-sm text-gray-400 mb-1">Forwarding:</p>
          <p className="text-white text-sm">{getMessagePreview()}</p>
        </div>

        {/* Content */}
        <div className="flex flex-col h-[calc(80vh-200px)]">
          {/* Search */}
          <div className="px-6 py-3 border-b border-gray-800">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-[#1a1a1a] border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gray-600"
              />
            </div>
          </div>

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto px-6 py-3 space-y-2">
            {filteredConversations.map(conv => {
              const isSelected = selectedConversations.includes(conv.id);
              
              return (
                <div
                  key={conv.id}
                  onClick={() => toggleConversation(conv.id)}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-white/10 border border-white/20'
                      : 'bg-[#1a1a1a] hover:bg-[#262626]'
                  }`}
                >
                  {/* Avatar */}
                  {conv.type === 'group' ? (
                    <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center">
                      {conv.groupInfo?.photoURL ? (
                        <img
                          src={conv.groupInfo.photoURL}
                          alt={conv.groupInfo.name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-white text-sm">
                          {conv.groupInfo?.name?.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center">
                      <span className="text-white text-sm">DM</span>
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1">
                    <p className="text-white font-medium">
                      {conv.type === 'group' 
                        ? conv.groupInfo?.name 
                        : 'Direct Message'}
                    </p>
                    <p className="text-xs text-gray-400">
                      {conv.type === 'group' 
                        ? `${conv.members.length} members`
                        : 'Private conversation'}
                    </p>
                  </div>

                  {/* Checkbox */}
                  {isSelected && (
                    <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center">
                      <Check className="w-3 h-3 text-black" />
                    </div>
                  )}
                </div>
              );
            })}

            {filteredConversations.length === 0 && (
              <div className="text-center text-gray-400 py-8">
                No conversations found
              </div>
            )}
          </div>

          {/* Selected count */}
          {selectedConversations.length > 0 && (
            <div className="px-6 py-2 border-t border-gray-800">
              <p className="text-sm text-gray-400">
                {selectedConversations.length} conversation{selectedConversations.length > 1 ? 's' : ''} selected
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-800 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleForward}
            disabled={isForwarding || selectedConversations.length === 0}
            className={`px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
              isForwarding || selectedConversations.length === 0
                ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                : 'bg-white text-black hover:bg-gray-200'
            }`}
          >
            {isForwarding ? (
              <>
                <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                Forwarding...
              </>
            ) : (
              <>
                <Forward className="w-4 h-4" />
                Forward
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}