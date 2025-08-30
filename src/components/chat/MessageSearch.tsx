/**
 * Message Search Component - Client-side encrypted message search
 * Searches through decrypted messages locally
 */

"use client";

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Search, X, Calendar, User, MessageSquare } from 'lucide-react';
import { useChatStore, Message } from '@/stores/chatStore';
import { debounce } from '@/utils/debounce';

interface SearchResult {
  message: Message;
  conversationName: string;
  matchedText: string;
  context: string;
}

export const MessageSearch: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'text' | 'media' | 'voice'>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  
  const { messages, conversations, searchMessages } = useChatStore();

  // Debounced search function
  const performSearch = useCallback(
    debounce(async (query: string) => {
      if (!query.trim()) {
        setResults([]);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);

      try {
        // Search through all messages
        const searchResults: SearchResult[] = [];
        const queryLower = query.toLowerCase();
        const now = new Date();

        for (const [conversationId, conversationMessages] of messages) {
          const conversation = conversations.get(conversationId);
          if (!conversation) continue;

          for (const message of conversationMessages) {
            // Apply type filter
            if (selectedFilter !== 'all' && message.type !== selectedFilter) continue;

            // Apply date filter
            if (dateFilter !== 'all') {
              const messageDate = message.timestamp.toDate();
              const daysDiff = Math.floor((now.getTime() - messageDate.getTime()) / (1000 * 60 * 60 * 24));
              
              if (dateFilter === 'today' && daysDiff > 0) continue;
              if (dateFilter === 'week' && daysDiff > 7) continue;
              if (dateFilter === 'month' && daysDiff > 30) continue;
            }

            // Search in decrypted content
            const content = message.decryptedContent || '';
            if (content.toLowerCase().includes(queryLower)) {
              // Extract context around the match
              const matchIndex = content.toLowerCase().indexOf(queryLower);
              const contextStart = Math.max(0, matchIndex - 50);
              const contextEnd = Math.min(content.length, matchIndex + query.length + 50);
              const context = content.substring(contextStart, contextEnd);

              searchResults.push({
                message,
                conversationName: conversation.groupInfo?.name || 
                  Array.from(conversation.memberDetails.values())
                    .map(m => m.displayName)
                    .join(', '),
                matchedText: content.substring(matchIndex, matchIndex + query.length),
                context: contextStart > 0 ? '...' + context : context
              });
            }

            // Also search in file names for media messages
            if (message.metadata?.fileName?.toLowerCase().includes(queryLower)) {
              searchResults.push({
                message,
                conversationName: conversation.groupInfo?.name || 
                  Array.from(conversation.memberDetails.values())
                    .map(m => m.displayName)
                    .join(', '),
                matchedText: message.metadata.fileName,
                context: `File: ${message.metadata.fileName}`
              });
            }
          }
        }

        // Sort by relevance and date
        searchResults.sort((a, b) => {
          // Exact matches first
          const aExact = a.message.decryptedContent?.toLowerCase() === queryLower;
          const bExact = b.message.decryptedContent?.toLowerCase() === queryLower;
          if (aExact && !bExact) return -1;
          if (!aExact && bExact) return 1;
          
          // Then by date (newest first)
          return b.message.timestamp.toMillis() - a.message.timestamp.toMillis();
        });

        setResults(searchResults);
      } finally {
        setIsSearching(false);
      }
    }, 300),
    [messages, conversations, selectedFilter, dateFilter]
  );

  // Trigger search when query or filters change
  useEffect(() => {
    performSearch(searchQuery);
  }, [searchQuery, performSearch]);

  const handleResultClick = (result: SearchResult) => {
    // Navigate to the conversation and message
    const { setActiveConversation } = useChatStore.getState();
    setActiveConversation(result.message.conversationId);
    
    // Scroll to message (you'd implement this based on your message list)
    setTimeout(() => {
      const messageElement = document.getElementById(`message-${result.message.id}`);
      messageElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      messageElement?.classList.add('highlight-message');
      setTimeout(() => {
        messageElement?.classList.remove('highlight-message');
      }, 2000);
    }, 100);
    
    setIsOpen(false);
  };

  const formatDate = (timestamp: any) => {
    const date = timestamp.toDate();
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  const highlightMatch = (text: string, query: string) => {
    if (!query) return text;
    
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, index) => 
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={index} className="bg-yellow-500/30 text-white font-semibold">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <>
      {/* Search button */}
      <button
        onClick={() => setIsOpen(true)}
        className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
        title="Search messages"
      >
        <Search className="w-5 h-5 text-gray-400" />
      </button>

      {/* Search modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/50 backdrop-blur-sm">
          <div className="bg-gray-900 rounded-xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col">
            {/* Search header */}
            <div className="p-4 border-b border-gray-700">
              <div className="flex items-center gap-3">
                <Search className="w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search messages..."
                  className="flex-1 bg-transparent outline-none text-white placeholder-gray-400"
                  autoFocus
                />
                {isSearching && (
                  <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 hover:bg-gray-700 rounded transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              {/* Filters */}
              <div className="flex gap-2 mt-3">
                {/* Type filter */}
                <div className="flex gap-1 p-1 bg-gray-800 rounded-lg">
                  {(['all', 'text', 'media', 'voice'] as const).map(filter => (
                    <button
                      key={filter}
                      onClick={() => setSelectedFilter(filter)}
                      className={`px-3 py-1 rounded text-sm transition-colors ${
                        selectedFilter === filter
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      {filter.charAt(0).toUpperCase() + filter.slice(1)}
                    </button>
                  ))}
                </div>

                {/* Date filter */}
                <div className="flex gap-1 p-1 bg-gray-800 rounded-lg">
                  {(['all', 'today', 'week', 'month'] as const).map(filter => (
                    <button
                      key={filter}
                      onClick={() => setDateFilter(filter)}
                      className={`px-3 py-1 rounded text-sm transition-colors ${
                        dateFilter === filter
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      {filter === 'all' ? 'All time' :
                       filter === 'today' ? 'Today' :
                       filter === 'week' ? 'This week' : 'This month'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Search results */}
            <div className="flex-1 overflow-y-auto">
              {results.length === 0 && searchQuery && !isSearching ? (
                <div className="p-8 text-center text-gray-400">
                  <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No messages found for "{searchQuery}"</p>
                  <p className="text-sm mt-2">Try different keywords or filters</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-800">
                  {results.map((result, index) => (
                    <button
                      key={`${result.message.id}-${index}`}
                      onClick={() => handleResultClick(result)}
                      className="w-full p-4 hover:bg-gray-800/50 transition-colors text-left"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <User className="w-4 h-4 text-gray-500" />
                            <span className="text-sm font-medium text-gray-300">
                              {result.conversationName}
                            </span>
                            <span className="text-xs text-gray-500">
                              {formatDate(result.message.timestamp)}
                            </span>
                          </div>
                          <p className="text-gray-100 text-sm">
                            {highlightMatch(result.context, searchQuery)}
                          </p>
                        </div>
                        <div className="text-xs text-gray-500">
                          {result.message.type === 'voice' && '🎤 Voice'}
                          {result.message.type === 'image' && '📷 Image'}
                          {result.message.type === 'file' && '📎 File'}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Results count */}
            {results.length > 0 && (
              <div className="p-3 border-t border-gray-700 text-center text-sm text-gray-400">
                Found {results.length} {results.length === 1 ? 'message' : 'messages'}
              </div>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        :global(.highlight-message) {
          animation: highlight 2s ease-in-out;
        }
        
        @keyframes highlight {
          0%, 100% { background-color: transparent; }
          50% { background-color: rgba(59, 130, 246, 0.2); }
        }
      `}</style>
    </>
  );
};

export default MessageSearch;