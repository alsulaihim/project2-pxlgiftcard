"use client";

import React, { useState, useEffect } from 'react';
import { X, Users, Plus, Camera, Shield } from 'lucide-react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db, storage } from '@/lib/firebase-config';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '@/contexts/auth-context';

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateGroup: (groupData: {
    name: string;
    description: string;
    members: string[];
    photoURL?: string;
  }) => Promise<void>;
}

interface User {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  tier?: string;
}

export function CreateGroupModal({ isOpen, onClose, onCreateGroup }: CreateGroupModalProps) {
  const { user } = useAuth();
  const [groupName, setGroupName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [groupPhoto, setGroupPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);

  // Load available users
  useEffect(() => {
    if (isOpen) {
      loadUsers();
    }
  }, [isOpen]);

  const loadUsers = async () => {
    try {
      const usersSnapshot = await getDocs(collection(db, 'platformUsers'));
      const users = usersSnapshot.docs
        .map(doc => ({ uid: doc.id, ...doc.data() } as User))
        .filter(u => u.uid !== user?.uid); // Exclude current user
      setAvailableUsers(users);
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setGroupPhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const toggleMember = (userId: string) => {
    setSelectedMembers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedMembers.length < 1) {
      alert('Please enter a group name and select at least 1 member');
      return;
    }

    setIsCreating(true);

    try {
      let photoURL: string | undefined;

      // Upload group photo if provided
      if (groupPhoto) {
        const photoRef = ref(storage, `group-photos/${Date.now()}_${groupPhoto.name}`);
        const snapshot = await uploadBytes(photoRef, groupPhoto);
        photoURL = await getDownloadURL(snapshot.ref);
      }

      // Create group with current user included
      await onCreateGroup({
        name: groupName,
        description,
        members: [...selectedMembers, user!.uid],
        photoURL
      });

      // Reset form
      setGroupName('');
      setDescription('');
      setSelectedMembers([]);
      setGroupPhoto(null);
      setPhotoPreview(null);
      onClose();
    } catch (error) {
      console.error('Failed to create group:', error);
      alert('Failed to create group. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const filteredUsers = availableUsers.filter(u =>
    u.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#0a0a0a] rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden border border-gray-800">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-white" />
            <h2 className="text-lg font-semibold text-white">Create New Group</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-800 rounded transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(80vh-140px)]">
          {/* Group Photo */}
          <div className="flex items-center gap-4">
            <div className="relative">
              {photoPreview ? (
                <img
                  src={photoPreview}
                  alt="Group"
                  className="w-20 h-20 rounded-full object-cover"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gray-800 flex items-center justify-center">
                  <Users className="w-8 h-8 text-gray-600" />
                </div>
              )}
              <label className="absolute bottom-0 right-0 p-1 bg-white rounded-full cursor-pointer hover:bg-gray-200 transition-colors">
                <Camera className="w-4 h-4 text-black" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoSelect}
                  className="hidden"
                />
              </label>
            </div>
            <div className="flex-1 space-y-4">
              <input
                type="text"
                placeholder="Group name"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="w-full px-4 py-2 bg-[#1a1a1a] border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gray-600"
              />
              <textarea
                placeholder="Description (optional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full px-4 py-2 bg-[#1a1a1a] border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gray-600 resize-none"
              />
            </div>
          </div>

          {/* Privacy Toggle */}
          <div className="flex items-center justify-between p-4 bg-[#1a1a1a] rounded-lg">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-white font-medium">Private Group</p>
                <p className="text-xs text-gray-400">Only admins can add members</p>
              </div>
            </div>
            <button
              onClick={() => setIsPrivate(!isPrivate)}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                isPrivate ? 'bg-white' : 'bg-gray-600'
              }`}
            >
              <div
                className={`absolute top-1 left-1 w-4 h-4 bg-black rounded-full transition-transform ${
                  isPrivate ? 'translate-x-6' : ''
                }`}
              />
            </button>
          </div>

          {/* Member Selection */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-400">Add Members</h3>
            
            {/* Search */}
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 bg-[#1a1a1a] border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gray-600"
            />

            {/* User List */}
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {filteredUsers.map(u => (
                <div
                  key={u.uid}
                  onClick={() => toggleMember(u.uid)}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedMembers.includes(u.uid)
                      ? 'bg-white/10 border border-white/20'
                      : 'bg-[#1a1a1a] hover:bg-[#262626]'
                  }`}
                >
                  <img
                    src={u.photoURL || '/default-avatar.png'}
                    alt={u.displayName}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div className="flex-1">
                    <p className="text-white font-medium">{u.displayName}</p>
                    <p className="text-xs text-gray-400">{u.email}</p>
                  </div>
                  {selectedMembers.includes(u.uid) && (
                    <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-black rounded-full" />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {selectedMembers.length > 0 && (
              <p className="text-sm text-gray-400">
                {selectedMembers.length} member{selectedMembers.length > 1 ? 's' : ''} selected
              </p>
            )}
          </div>
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
            onClick={handleCreateGroup}
            disabled={isCreating || !groupName.trim() || selectedMembers.length < 1}
            className={`px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
              isCreating || !groupName.trim() || selectedMembers.length < 1
                ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                : 'bg-white text-black hover:bg-gray-200'
            }`}
          >
            {isCreating ? (
              <>
                <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                Create Group
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}