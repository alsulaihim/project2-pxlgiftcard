/**
 * New Conversation Modal - Start new chats with users
 * Allows searching and selecting users to start conversations
 */

"use client";

import React, { useState, useEffect, useRef } from 'react';
import { X, Search, Users, User, MessageSquare, Check, Camera } from 'lucide-react';
import { collection, query, getDocs, where, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase-config';
import { useChatStore } from '@/stores/chatStore';
import { TierBadge } from './TierBadge';

interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  tier?: 'starter' | 'rising' | 'pro' | 'pixlbeast' | 'pixlionaire';
  username?: string;
}

interface NewConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string;
}

export const NewConversationModal: React.FC<NewConversationModalProps> = ({
  isOpen,
  onClose,
  currentUserId
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationType, setConversationType] = useState<'direct' | 'group'>('direct');
  const [groupName, setGroupName] = useState('');
  const [groupImage, setGroupImage] = useState<string>('/default-group.svg');
  const [uploadingImage, setUploadingImage] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { createConversation, setActiveConversation } = useChatStore();

  // Search for users
  useEffect(() => {
    // Enforce @ prefix for username search
    const normalizedQuery = searchQuery.startsWith('@') 
      ? searchQuery.substring(1).toLowerCase() 
      : searchQuery;
    
    if (normalizedQuery.length < 1) {
      setUsers([]);
      return;
    }

    const searchUsers = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const usersRef = collection(db, 'users');
        
        // Get all users and filter client-side for now
        // This is a temporary solution until proper indexing is set up
        const snapshot = await getDocs(query(usersRef, limit(50)));
        
        const allUsers: UserProfile[] = [];
        snapshot.forEach((doc) => {
          const userData = doc.data();
          if (doc.id !== currentUserId) {
            const displayName = userData.profile?.displayName || userData.displayName || userData.email?.split('@')[0] || 'Unknown User';
            const username = userData.profile?.username || userData.username || '';
            
            allUsers.push({
              uid: doc.id,
              displayName,
              email: userData.email || '',
              photoURL: userData.profile?.avatarUrl || userData.photoURL || userData.profilePictureUrl,
              tier: userData.profile?.tier || userData.tier || userData.membership || 'starter',
              username
            });
          }
        });
        
        // Filter based on search query
        let filteredUsers = allUsers;
        if (normalizedQuery.length > 0) {
          if (searchQuery.startsWith('@')) {
            // Search by username
            filteredUsers = allUsers.filter(user => 
              user.username?.toLowerCase().includes(normalizedQuery)
            );
          } else {
            // Search by display name
            filteredUsers = allUsers.filter(user => 
              user.displayName.toLowerCase().includes(normalizedQuery.toLowerCase())
            );
          }
        }
        
        setUsers(filteredUsers.slice(0, 10)); // Limit to 10 results
      } catch (err: any) {
        console.error('Error searching users:', err);
        setError('Failed to search users. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    const debounceTimer = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery, currentUserId]);

  const handleUserSelect = (userId: string) => {
    if (conversationType === 'direct') {
      setSelectedUsers(new Set([userId]));
    } else {
      const newSelection = new Set(selectedUsers);
      if (newSelection.has(userId)) {
        newSelection.delete(userId);
      } else {
        newSelection.add(userId);
      }
      setSelectedUsers(newSelection);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      // For now, convert to base64 for preview
      // In production, upload to Firebase Storage
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setGroupImage(result);
        setUploadingImage(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Failed to upload image:', error);
      setUploadingImage(false);
    }
  };

  const handleStartConversation = async () => {
    if (selectedUsers.size === 0) {
      setError('Please select at least one user');
      return;
    }

    if (conversationType === 'group' && !groupName.trim()) {
      setError('Please enter a group name');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const members = [currentUserId, ...Array.from(selectedUsers)];
      const groupInfo = conversationType === 'group' ? {
        name: groupName,
        description: '',
        photoURL: groupImage || '/default-group.svg'
        // admins will be set by createGroupConversation
      } : undefined;

      const conversationId = await createConversation(
        members,
        conversationType,
        groupInfo
      );

      // Set as active conversation
      setActiveConversation(conversationId);
      
      // Close modal
      onClose();
      
      // Reset form
      setSelectedUsers(new Set());
      setSearchQuery('');
      setGroupName('');
      setGroupImage('/default-group.svg');
      setConversationType('direct');
    } catch (err: any) {
      console.error('Error creating conversation:', err);
      setError('Failed to create conversation. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-gray-900 rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">New Conversation</h2>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-700 rounded transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Conversation Type Selector */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setConversationType('direct')}
              className={`flex-1 py-2 px-4 rounded-lg transition-colors ${
                conversationType === 'direct'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              <User className="w-4 h-4 inline mr-2" />
              Direct Message
            </button>
            <button
              onClick={() => setConversationType('group')}
              className={`flex-1 py-2 px-4 rounded-lg transition-colors ${
                conversationType === 'group'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              <Users className="w-4 h-4 inline mr-2" />
              Group Chat
            </button>
          </div>

          {/* Group Name and Image Input */}
          {conversationType === 'group' && (
            <div className="mt-4 space-y-3">
              <div className="flex items-center gap-3">
                {/* Group Image Upload */}
                <div className="relative">
                  <img
                    src={groupImage}
                    alt="Group"
                    className="w-16 h-16 rounded-full object-cover bg-gray-700"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-0 right-0 p-1 bg-blue-600 rounded-full hover:bg-blue-700 transition-colors"
                    disabled={uploadingImage}
                  >
                    <Camera className="w-3 h-3 text-white" />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </div>
                
                {/* Group Name Input */}
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Enter group name..."
                  className="flex-1 px-4 py-2 bg-gray-800 text-white rounded-lg outline-none focus:outline-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-gray-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or @username..."
              className="w-full pl-10 pr-4 py-2 bg-gray-800 text-white rounded-lg outline-none focus:outline-none"
            />
          </div>
        </div>

        {/* User List */}
        <div className="flex-1 overflow-y-auto p-4">
          {error && (
            <div className="p-3 bg-red-900/20 border border-red-500 rounded-lg text-red-400 text-sm mb-4">
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : users.length > 0 ? (
            <div className="space-y-2">
              {users.map((user) => {
                const isSelected = selectedUsers.has(user.uid);
                return (
                  <button
                    key={user.uid}
                    onClick={() => handleUserSelect(user.uid)}
                    className={`w-full p-3 rounded-lg transition-colors flex items-center gap-3 ${
                      isSelected
                        ? 'bg-blue-600/20 border border-blue-500'
                        : 'bg-gray-800 hover:bg-gray-700'
                    }`}
                  >
                    <div className="relative">
                      <img
                        src={user.photoURL || '/default-avatar.png'}
                        alt={user.displayName}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      {user.tier && (
                        <div className="absolute -bottom-1 -right-1">
                          <TierBadge tier={user.tier} size="sm" />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 text-left">
                      <div className="font-medium text-white">{user.displayName}</div>
                      {user.username && (
                        <div className="text-sm text-gray-400">
                          {user.username.startsWith('@') ? user.username : `@${user.username}`}
                        </div>
                      )}
                    </div>

                    {isSelected && (
                      <Check className="w-5 h-5 text-blue-500" />
                    )}
                  </button>
                );
              })}
            </div>
          ) : searchQuery.length >= 1 ? (
            <div className="text-center py-8 text-gray-400">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No users found matching "{searchQuery}"</p>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Start typing to search for users</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-2 px-4 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleStartConversation}
              disabled={selectedUsers.size === 0 || isLoading}
              className={`flex-1 py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 ${
                selectedUsers.size > 0 && !isLoading
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-gray-700 text-gray-500 cursor-not-allowed'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              {conversationType === 'direct' ? 'Start Chat' : `Create Group (${selectedUsers.size})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewConversationModal;