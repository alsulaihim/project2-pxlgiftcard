/**
 * Create Group Chat component
 * Allows users to create new group conversations with multiple members
 * As specified in chat-architecture.mdc
 */

"use client";

import React, { useState, useEffect } from 'react';
import { X, Users, Search, Plus, Check } from 'lucide-react';
import { createGroupConversation } from '@/services/chat/firestore-chat.service';
import { db } from '@/lib/firebase-config';
import { collection, query, where, limit, getDocs } from 'firebase/firestore';

interface CreateGroupChatProps {
  currentUserId: string;
  onGroupCreated: (conversation: any) => void;
  onClose: () => void;
}

interface User {
  uid: string;
  username: string;
  profile: {
    firstName: string;
    lastName: string;
    avatarUrl?: string;
  };
  tier: {
    current: string;
  };
}

export const CreateGroupChat: React.FC<CreateGroupChatProps> = ({
  currentUserId,
  onGroupCreated,
  onClose
}) => {
  const [step, setStep] = useState<'info' | 'members'>('info');
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Search for users to add to group
   */
  const searchUsers = async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      // Normalize search term
      const normalizedSearch = searchTerm.startsWith('@') ? searchTerm : `@${searchTerm}`;
      
      // Search by username
      const q = query(
        collection(db, 'users'),
        where('username', '>=', normalizedSearch),
        where('username', '<=', normalizedSearch + '\uf8ff'),
        limit(10)
      );
      
      const snapshot = await getDocs(q);
      const results = snapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data()
      })) as User[];
      
      // Filter out current user and already selected members
      const filteredResults = results.filter(user => 
        user.uid !== currentUserId && 
        !selectedMembers.some(member => member.uid === user.uid)
      );
      
      setSearchResults(filteredResults);
    } catch (error) {
      console.error('Failed to search users:', error);
      setError('Failed to search users');
    } finally {
      setIsSearching(false);
    }
  };

  /**
   * Debounced search effect
   */
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery) {
        searchUsers(searchQuery);
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, selectedMembers]);

  /**
   * Add user to selected members
   */
  const addMember = (user: User) => {
    setSelectedMembers(prev => [...prev, user]);
    setSearchQuery('');
    setSearchResults([]);
  };

  /**
   * Remove user from selected members
   */
  const removeMember = (userId: string) => {
    setSelectedMembers(prev => prev.filter(member => member.uid !== userId));
  };

  /**
   * Create the group chat
   */
  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      setError('Group name is required');
      return;
    }

    if (selectedMembers.length === 0) {
      setError('At least one member is required');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const memberIds = selectedMembers.map(member => member.uid);
      
      const conversation = await createGroupConversation(memberIds, {
        name: groupName.trim(),
        description: groupDescription.trim(),
        createdBy: currentUserId
      });

      console.log('✅ Group chat created:', conversation.id);
      onGroupCreated(conversation);
      onClose();

    } catch (error) {
      console.error('Failed to create group:', error);
      setError(error instanceof Error ? error.message : 'Failed to create group');
    } finally {
      setIsCreating(false);
    }
  };

  /**
   * Get tier color for user
   */
  const getTierColor = (tier: string): string => {
    const colors = {
      starter: 'ring-gray-500',
      rising: 'ring-blue-500',
      pro: 'ring-purple-500',
      pixlbeast: 'ring-yellow-500',
      pixlionaire: 'ring-red-500'
    };
    return colors[tier as keyof typeof colors] || 'ring-gray-500';
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg w-full max-w-md mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">
            {step === 'info' ? 'Create Group' : 'Add Members'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-700 rounded-full transition-colors"
            title="Close dialog"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-4 bg-red-900/20 border-b border-red-500/30 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Step 1: Group Info */}
        {step === 'info' && (
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Group Name *
              </label>
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Enter group name"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                maxLength={50}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Description (Optional)
              </label>
              <textarea
                value={groupDescription}
                onChange={(e) => setGroupDescription(e.target.value)}
                placeholder="What's this group about?"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                rows={3}
                maxLength={200}
              />
            </div>

            <button
              onClick={() => setStep('members')}
              disabled={!groupName.trim()}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              Next: Add Members
            </button>
          </div>
        )}

        {/* Step 2: Add Members */}
        {step === 'members' && (
          <div className="flex flex-col h-96">
            {/* Search */}
            <div className="p-4 border-b border-gray-700">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search users by @username"
                  className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Selected Members */}
            {selectedMembers.length > 0 && (
              <div className="p-4 border-b border-gray-700">
                <div className="text-sm text-gray-300 mb-2">
                  Selected Members ({selectedMembers.length})
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedMembers.map(member => (
                    <div
                      key={member.uid}
                      className="flex items-center space-x-2 bg-gray-800 rounded-full px-3 py-1"
                    >
                      <div className={`w-6 h-6 rounded-full ring-2 ${getTierColor(member.tier.current)} overflow-hidden`}>
                        {member.profile.avatarUrl ? (
                          <img
                            src={member.profile.avatarUrl}
                            alt={member.username}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-700 flex items-center justify-center text-xs text-gray-300">
                            {member.profile.firstName.charAt(0)}
                          </div>
                        )}
                      </div>
                      <span className="text-sm text-white">{member.username}</span>
                      <button
                        onClick={() => removeMember(member.uid)}
                        className="p-1 hover:bg-gray-600 rounded-full transition-colors"
                        title={`Remove ${member.username}`}
                        aria-label={`Remove ${member.username}`}
                      >
                        <X className="w-3 h-3 text-gray-400" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Search Results */}
            <div className="flex-1 overflow-y-auto">
              {isSearching ? (
                <div className="p-4 text-center text-gray-400">
                  Searching users...
                </div>
              ) : searchResults.length > 0 ? (
                <div className="p-2">
                  {searchResults.map(user => (
                    <button
                      key={user.uid}
                      onClick={() => addMember(user)}
                      className="w-full flex items-center space-x-3 p-3 hover:bg-gray-800 rounded-lg transition-colors"
                    >
                      <div className={`w-10 h-10 rounded-full ring-2 ${getTierColor(user.tier.current)} overflow-hidden`}>
                        {user.profile.avatarUrl ? (
                          <img
                            src={user.profile.avatarUrl}
                            alt={user.username}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-700 flex items-center justify-center text-sm text-gray-300">
                            {user.profile.firstName.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 text-left">
                        <div className="text-white font-medium">{user.username}</div>
                        <div className="text-sm text-gray-400">
                          {user.profile.firstName} {user.profile.lastName}
                        </div>
                      </div>
                      <Plus className="w-5 h-5 text-gray-400" />
                    </button>
                  ))}
                </div>
              ) : searchQuery ? (
                <div className="p-4 text-center text-gray-400">
                  No users found
                </div>
              ) : (
                <div className="p-4 text-center text-gray-400">
                  Search for users to add to your group
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="p-4 border-t border-gray-700 flex space-x-3">
              <button
                onClick={() => setStep('info')}
                className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleCreateGroup}
                disabled={selectedMembers.length === 0 || isCreating}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center justify-center space-x-2"
              >
                {isCreating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Creating...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Create Group</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
