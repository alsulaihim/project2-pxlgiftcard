'use client';

import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { doc, getDoc, deleteDoc, updateDoc, getDocs, collection, Timestamp } from "firebase/firestore";
import { 
  Plus, Search, Users, Mic, Phone, Video, 
  Info, ChevronDown, MessageSquare,
  Trash2, Camera
} from "lucide-react";
import { MessageInput } from "@/components/chat/MessageInput";
import { SimpleMessageList } from "@/components/chat/SimpleMessageList";
import { NewConversationModal } from "@/components/chat/NewConversationModal";
import { ProfileSlider } from "@/components/chat/ProfileSlider";
import { useAuth } from "@/contexts/auth-context";
import type { SocketMessage } from "@/services/chat/socket.service";
import type { Message } from "@/stores/chatStore";
import { useChatStore } from "@/stores/chatStore";
import { encryptionService } from "@/services/chat/encryption.service";
import { keyExchangeService } from "@/services/chat/key-exchange.service";
import { presenceService } from "@/services/chat/presence.service";
import { socketService } from "@/services/chat/socket.service";
import { offlineQueue } from "@/services/chat/offline-queue.service";
import { db } from "@/lib/firebase-config";
import { authManager } from "@/lib/firebase-auth-manager";

export default function EnhancedMessagesPage() {
  const { user, platformUser } = useAuth();
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [showRightSidebar, setShowRightSidebar] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'fallback'>('connecting');
  const [userProfiles, setUserProfiles] = useState<Map<string, {
    uid: string;
    displayName?: string;
    email?: string;
    photoURL?: string;
    tier?: 'starter' | 'rising' | 'pro' | 'pixlbeast' | 'pixlionaire';
    createdAt?: Date;
    lastSeen?: Date;
    country?: string;
    region?: string;
    [key: string]: unknown;
  }>>(new Map());
  const [searchQuery, setSearchQuery] = useState('');
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTypingState = useRef<boolean>(false);
  const [showProfileSlider, setShowProfileSlider] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<{
    uid: string;
    displayName?: string;
    email?: string;
    photoURL?: string;
    tier?: 'starter' | 'rising' | 'pro' | 'pixlbeast' | 'pixlionaire';
    createdAt?: Date;
    lastSeen?: Date;
    country?: string;
    region?: string;
  } | null>(null);
  const [forceUpdate, setForceUpdate] = useState(0);
  
  const {
    conversations,
    messages,
    activeConversationId,
    typing,
    recording,
    presence,
    replyingTo,
    loadConversations,
    loadMessages,
    setActiveConversation,
    sendMessage,
    initializeSocket,
    initializeEncryption,
    updateTyping,
    setTypingUser,
    markAsRead,
    markAsDelivered,
    addReaction,
    removeReaction,
    deleteConversation,
    deleteMessage,
    editMessage,
    setReplyingTo,
    reset
  } = useChatStore();
  

  // Set userId in store
  useEffect(() => {
    if (user?.uid) {
      useChatStore.setState({ userId: user.uid });
    }
  }, [user]);


  // Initialize chat system
  useEffect(() => {
    if (!user) return;

    const initializeChat = async () => {
      try {
        // Wait for Firebase Auth to be ready using auth manager
        console.log('🔐 Waiting for Firebase Auth...');
        const authUser = await authManager.waitForAuth();
        
        if (!authUser) {
          console.error('❌ No authenticated user in messages page');
          return;
        }
        
        // Ensure token is fresh
        await authManager.ensureFreshToken();
        console.log('✅ Auth ready with user:', authUser.uid);
        
        // Ensure userId is set in the store before any operations
        useChatStore.setState({ userId: user.uid });
        
        // Initialize encryption (this now properly calls keyExchangeService.initializeUserKeys internally)
        await initializeEncryption(user.uid);
        await presenceService.initializePresence(user.uid);
        
        const socket = await socketService.initialize(user.uid);
        
        // Expose socketService to window for store access
        (window as Window & { socketService?: typeof socketService }).socketService = socketService;
        
        if (socket) {
          initializeSocket(socket);
          
          socket.on('connect', () => {
            setConnectionStatus('connected');
            console.log('✅ Real-time connection established');
          });
          
          socket.on('disconnect', () => {
            setConnectionStatus('fallback');
            console.log('⚠️ Falling back to Firestore');
          });
          
          // Listen for typing updates from other users
          socketService.on('typing:update', (data: { conversationId: string; userId: string; typing: boolean }) => {
            console.log('⌨️ Typing update:', data);
            
            // Don't show typing for current user
            if (data.userId !== user.uid) {
              setTypingUser(data.conversationId, data.userId, data.typing);
            }
          });
          
          // Listen for new messages via WebSocket
          socketService.on('message:new', async (socketMessage: SocketMessage) => {
            console.log('📨 New message received via WebSocket in Messages page:', socketMessage);
            
            // Decrypt the message if it's from another user
            let decryptedText = socketMessage.content || '';
            
            if (socketMessage.senderId !== user?.uid && socketMessage.nonce) {
              try {
                const senderPublicKey = await keyExchangeService.getPublicKey(socketMessage.senderId);
                if (senderPublicKey) {
                  const decrypted = encryptionService.decryptMessage(
                    { content: socketMessage.content || '', nonce: socketMessage.nonce },
                    senderPublicKey
                  );
                  decryptedText = decrypted || '[Unable to decrypt]';
                  console.log('🔓 Successfully decrypted message from:', socketMessage.senderId);
                } else {
                  console.warn('⚠️ Could not get public key for sender:', socketMessage.senderId);
                  decryptedText = socketMessage.content || '[Unable to decrypt - key not found]';
                }
              } catch (error) {
                console.error('🔥 Failed to decrypt message:', error);
                decryptedText = socketMessage.content || '[Decryption failed]';
              }
            }
            
            // Convert SocketMessage to Message type with decrypted content
            const message: Message = {
              ...socketMessage,
              timestamp: Timestamp.fromDate(new Date(socketMessage.timestamp)),
              text: decryptedText, // For display compatibility
              decryptedContent: decryptedText,
              content: socketMessage.content || ''
            };
            
            // Check if conversation exists, if not reload conversations
            const conversations = useChatStore.getState().conversations;
            if (!conversations.has(message.conversationId)) {
              console.log('🆕 New conversation detected, reloading conversations');
              await loadConversations();
            }
            
            // Add message to the store and remove any temp messages from the same sender
            const messages = useChatStore.getState().messages.get(message.conversationId) || [];
            const messageExists = messages.some(m => m.id === message.id);
            
            if (!messageExists) {
              useChatStore.setState((state) => {
                const conversationMessages = state.messages.get(message.conversationId) || [];
                // Remove any temp messages from the same sender (they're being replaced by the real message)
                const filteredMessages = conversationMessages.filter(m => {
                  // Keep message if it's not a temp message or if it's from a different sender
                  return !m.id.startsWith('temp_') || m.senderId !== message.senderId;
                });
                state.messages.set(message.conversationId, [...filteredMessages, message]);
              });
              
              // Update conversation's last message
              useChatStore.setState((state) => {
                const conversation = state.conversations.get(message.conversationId);
                if (conversation) {
                  conversation.lastMessage = {
                    text: message.content,
                    senderId: message.senderId,
                    timestamp: message.timestamp
                  };
                  // Increment unread count if not active conversation
                  if (state.activeConversationId !== message.conversationId && message.senderId !== user?.uid) {
                    conversation.unreadCount = (conversation.unreadCount || 0) + 1;
                  }
                }
              });
            }
          });
          
          // Listen for new conversation notifications
          socketService.on('new-conversation', async (data: { conversationId: string }) => {
            console.log('🆕 New conversation notification received:', data.conversationId);
            // Reload conversations to get the new one
            await loadConversations();
          });
        } else {
          console.warn('Socket connection not available, using Firestore fallback');
          setConnectionStatus('fallback');
        }
        
        await loadConversations();
        
        const queueStatus = offlineQueue.getStatus();
        if (queueStatus.queueSize > 0) {
          console.log(`📦 ${queueStatus.queueSize} messages in offline queue`);
        }
        
      } catch (error) {
        console.error('Failed to initialize chat:', error);
        setConnectionStatus('fallback');
      }
    };

    initializeChat();

    return () => {
      presenceService.cleanup();
      socketService.disconnect();
      reset();
    };
  }, [user]);


  // Load messages for active conversation
  useEffect(() => {
    if (activeConversationId && user?.uid) {
      loadMessages(activeConversationId);
      
      const conversationMessages = messages.get(activeConversationId) || [];
      
      // Mark messages as delivered first
      const undeliveredIds = conversationMessages
        .filter(m => m.senderId !== user.uid && !m.delivered?.includes(user.uid))
        .map(m => m.id);
      
      for (const msgId of undeliveredIds) {
        markAsDelivered(msgId, user.uid);
      }
      
      // Then mark as read
      const unreadIds = conversationMessages
        .filter(m => m.senderId !== user.uid && !m.read?.includes(user.uid))
        .map(m => m.id);
      
      if (unreadIds.length > 0) {
        markAsRead(unreadIds, user.uid);
      }
    }
  }, [activeConversationId, user?.uid]);
  
  // Fetch user profiles for conversations
  useEffect(() => {
    const fetchUserProfiles = async () => {
      const profiles = new Map();
      
      for (const conversation of Array.from(conversations.values())) {
        for (const memberId of conversation.members) {
          if (memberId !== user?.uid && !profiles.has(memberId)) {
            try {
              const userDoc = await getDoc(doc(db, 'users', memberId));
              if (userDoc.exists()) {
                const userData = userDoc.data();
                const avatarUrl = userData.profile?.avatarUrl || 
                                userData.avatarUrl || 
                                userData.photoURL || 
                                '/default-avatar.png';
                
                const profile = {
                  displayName: userData.displayName || userData.email?.split('@')[0] || 'Unknown User',
                  photoURL: avatarUrl,
                  tier: (typeof userData.tier === 'object' ? userData.tier?.current : userData.tier) || 'starter',
                  username: userData.username,
                  email: userData.email,
                  country: userData.profile?.country || userData.country,
                  region: userData.profile?.region || userData.region,
                  createdAt: userData.createdAt || userData.timestamps?.created,
                  lastSeen: userData.lastSeen || userData.timestamps?.lastActive
                };
                
                profiles.set(memberId, profile);
              }
            } catch (error) {
              console.error('Failed to fetch user profile:', error);
            }
          }
        }
      }
      
      setUserProfiles(profiles);
    };
    
    if (conversations.size > 0 && user) {
      fetchUserProfiles();
    }
  }, [conversations, user]);

  const activeConversation = activeConversationId ? conversations.get(activeConversationId) : null;
  const activeMessages = useMemo(() => {
    if (!activeConversationId) return [];
    const msgs = messages.get(activeConversationId) || [];
    console.log(`📊 Active messages for ${activeConversationId}:`, msgs.length);
    // Convert Message type to ChatMessage type for compatibility
    return msgs.map((msg: Message) => ({
      ...msg,
      text: msg.text || msg.decryptedContent || msg.content || '',
      readBy: msg.readBy || msg.read || [],
      deliveredTo: msg.deliveredTo || msg.delivered || []
    }));
  }, [activeConversationId, messages]);
  const typingUsers = activeConversationId ? typing.get(activeConversationId) || [] : [];
  const recordingUsers = activeConversationId ? recording.get(activeConversationId) || [] : [];

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || !activeConversationId) return;
    await sendMessage(text, 'text');
  };

  // BUG FIX: 2025-01-30 - Fix media message delivery to recipients
  // Problem: Media messages not showing for recipients due to missing metadata
  // Solution: Ensure downloadUrl is both in text field and metadata
  // Impact: Media messages now properly display for all users
  const handleMediaSend = async (mediaMessage: {
    type?: 'image' | 'file' | 'voice';
    mediaType?: 'image' | 'file' | 'voice'; 
    url?: string;
    downloadUrl?: string;
    encryptedKey?: string;
    nonce?: string;
    metadata?: { 
      fileName?: string; 
      fileSize?: number; 
      mimeType?: string; 
      duration?: number;
    };
  }) => {
    if (!activeConversationId) return;
    
    const messageType = (mediaMessage.type || mediaMessage.mediaType) || 'file';
    
    // Ensure all media metadata is properly included
    const metadata = {
      ...mediaMessage.metadata,
      downloadUrl: mediaMessage.downloadUrl || mediaMessage.url,
      encryptedKey: mediaMessage.encryptedKey,
      nonce: mediaMessage.nonce,
      mediaType: mediaMessage.type || mediaMessage.mediaType,
      fileName: mediaMessage.metadata?.fileName,
      fileSize: mediaMessage.metadata?.fileSize,
      duration: mediaMessage.metadata?.duration
    };
    
    // Send downloadUrl as text content for backward compatibility
    // and full metadata for proper rendering
    await sendMessage(mediaMessage.downloadUrl || mediaMessage.url || '', messageType, metadata);
  };

  const handleTyping = (isTyping: boolean) => {
    if (!activeConversationId) return;
    
    // Clear any existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    
    if (isTyping) {
      // If starting to type, send immediately if not already typing
      if (!lastTypingState.current) {
        console.log(`📝 Sending typing start for conversation: ${activeConversationId}`);
        updateTyping(activeConversationId, true);
        lastTypingState.current = true;
      }
      
      // Set timeout to stop typing after 3 seconds of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        console.log(`📝 Auto-stopping typing for conversation: ${activeConversationId}`);
        updateTyping(activeConversationId, false);
        lastTypingState.current = false;
      }, 3000);
    } else {
      // If explicitly stopping, send stop immediately
      if (lastTypingState.current) {
        console.log(`📝 Sending typing stop for conversation: ${activeConversationId}`);
        updateTyping(activeConversationId, false);
        lastTypingState.current = false;
      }
    }
  };

  const handleDeleteConversation = async (conversationId: string) => {
    if (confirm('Delete this conversation? This will remove all messages and start fresh. This action cannot be undone.')) {
      try {
        // Delete all messages in the conversation from Firestore
        const messagesRef = collection(db, 'conversations', conversationId, 'messages');
        const messagesSnapshot = await getDocs(messagesRef);
        
        // Delete each message document
        const deletePromises = messagesSnapshot.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(deletePromises);
        
        // Delete the conversation document from Firestore
        await deleteDoc(doc(db, 'conversations', conversationId));
        
        // Use store's deleteConversation to clear from local state AND Firestore
        // This will handle clearing messages and conversation from both the store and Firestore
        await deleteConversation(conversationId);
        
        // Reload conversations to ensure sync with Firestore
        await loadConversations();
      } catch (error) {
        console.error('Failed to delete conversation:', error);
      }
    }
  };

  // BUG FIX: 2025-01-30 - Ensure group image updates reflect immediately in sidebar
  // Problem: Group images not updating in sidebar after upload
  // Solution: Force refresh of conversations and verify data is loaded correctly
  // Impact: Group images now display immediately after upload
  const handleChangeChannelImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeConversation || activeConversation.type !== 'group') return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      try {
        console.log('📸 Updating group image for conversation:', activeConversationId);
        console.log('📸 Base64 image length:', base64.length);
        
        // Update in Firestore
        await updateDoc(doc(db, 'conversations', activeConversationId!), {
          'groupInfo.photoURL': base64,
          'updatedAt': new Date()
        });
        
        console.log('✅ Firestore updated, now refreshing conversations...');
        
        // Small delay to ensure Firestore has propagated the change
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Reload conversations from Firestore to get the updated data
        await loadConversations();
        
        // Force a re-render of the sidebar
        setForceUpdate(prev => prev + 1);
        
        // Verify the update was successful
        const updatedConv = conversations.get(activeConversationId!);
        console.log('✅ Group image updated. New photoURL:', updatedConv?.groupInfo?.photoURL?.substring(0, 50));
      } catch (error) {
        console.error('Failed to update channel image:', error);
      }
    };
    reader.readAsDataURL(file);
  };

  // Memoize callbacks to prevent re-renders - MUST be before any conditional returns
  const getUserInfo = useCallback((userId: string) => {
    // Check cached profiles first
    const profile = userProfiles.get(userId);
    if (profile) return profile;
    
    // Check if it's the current user
    if (userId === user?.uid) {
      return {
        displayName: user?.displayName || user?.email?.split('@')[0] || 'You',
        photoURL: user?.photoURL || '/default-avatar.png',
        tier: platformUser?.tier?.current || 'starter',
        country: platformUser?.profile?.country,
        region: platformUser?.profile?.region
      };
    }
    
    // Handle test users
    if (userId === 'test-user-1') {
      return {
        displayName: 'Test User 1',
        photoURL: '/default-avatar.png',
        tier: 'pro' as const
      };
    }
    
    if (userId === 'test-user-2') {
      return {
        displayName: 'Test User 2',
        photoURL: '/default-avatar.png',
        tier: 'rising' as const
      };
    }
    
    return {
      displayName: 'User',
      photoURL: '/default-avatar.png',
      tier: 'starter' as const
    };
  }, [userProfiles, user, platformUser]);


  const handleReply = useCallback((messageId: string) => {
    const message = messages.get(activeConversationId || '')?.find(m => m.id === messageId);
    if (message) {
      setReplyingTo(message);
    }
  }, [setReplyingTo, messages, activeConversationId]);

  const handleEdit = useCallback((messageId: string, newText: string) => {
    editMessage(messageId, newText);
  }, [editMessage]);

  const handleDelete = useCallback((messageId: string) => {
    deleteMessage(messageId);
  }, [deleteMessage]);

  const handleReact = useCallback(async (messageId: string, emoji: string) => {
    // Find the message to check if user already reacted
    const message = activeMessages.find(m => m.id === messageId);
    if (message?.reactions?.[emoji]?.includes(user?.uid || '')) {
      // User already reacted, remove it
      await removeReaction(messageId, emoji);
    } else {
      // Add reaction
      await addReaction(messageId, emoji);
    }
  }, [activeMessages, user, addReaction, removeReaction]);

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <div className="text-gray-400">Please sign in to access messages</div>
      </div>
    );
  }

  // Get conversation display info
  const getConversationInfo = () => {
    if (!activeConversation) return null;
    
    if (activeConversation.type === 'group') {
      return {
        name: activeConversation.groupInfo?.name || 'Group Chat',
        avatar: activeConversation.groupInfo?.photoURL || '/default-group.svg',
        subtitle: `${activeConversation.members.length} members`,
        isGroup: true
      };
    } else {
      const otherUserId = activeConversation.members.find(id => id !== user.uid);
      const otherUser = otherUserId ? userProfiles.get(otherUserId) : null;
      return {
        name: otherUser?.displayName || 'Direct Message',
        avatar: otherUser?.photoURL || '/default-avatar.png',
        subtitle: presence.get(otherUserId || '') ? 'Active now' : 'Offline',
        isGroup: false,
        tier: otherUser?.tier
      };
    }
  };

  const conversationInfo = getConversationInfo();

  // Get tier ring color - always show a ring for all tiers
  const getTierRingColor = (tier?: string) => {
    switch (tier) {
      case 'pixlionaire': return 'ring-2 ring-purple-500';
      case 'pixlbeast': return 'ring-2 ring-amber-500';
      case 'pro': return 'ring-2 ring-green-500';
      case 'rising': return 'ring-2 ring-blue-500';
      case 'starter': return 'ring-2 ring-gray-400';
      default: return 'ring-2 ring-gray-400'; // Default to starter styling
    }
  };

  return (
    <div className="fixed inset-0 bg-black flex flex-col">
      {/* New Conversation Modal */}
      <NewConversationModal
        isOpen={showNewConversation}
        onClose={() => setShowNewConversation(false)}
        currentUserId={user.uid}
      />

      {/* Profile Slider */}
      {selectedProfile && (
        <ProfileSlider
          isOpen={showProfileSlider}
          onClose={() => {
            setShowProfileSlider(false);
            setSelectedProfile(null);
          }}
          user={selectedProfile!}
          isOnline={presence.get(selectedProfile?.uid || '') || false}
          conversationId={activeConversationId || undefined}
          messages={activeMessages}
        />
      )}
      
      <div className="flex flex-1 overflow-hidden">
        {/* Channel Sidebar */}
        <div className="w-64 bg-[#0a0a0a] border-r border-[#262626] flex flex-col">
          {/* Workspace Header */}
          <div className="p-4 border-b border-[#262626]">
            <button type="button" aria-label="Open workspace menu" className="w-full flex items-center justify-between hover:bg-[#1a1a1a] px-2 py-1 rounded transition-colors">
              <span className="font-semibold text-white">PXL Chat</span>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>
          </div>

          {/* Search */}
          <div className="p-3 border-b border-[#262626]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-[#1a1a1a] text-gray-300 rounded-md outline-none text-sm"
              />
            </div>
          </div>

          {/* Channels & DMs */}
          <div className="flex-1 overflow-y-auto">
            {/* Channels Section */}
            <div className="px-3 py-2">
              <button type="button" aria-label="Toggle channels section" className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 mb-1">
                <ChevronDown className="w-3 h-3" />
                <span>Channels</span>
              </button>
              
              {Array.from(conversations.values())
                .filter(c => c.type === 'group')
                .map(conv => {
                  console.log('Group conversation:', conv.id, 'photoURL:', conv.groupInfo?.photoURL?.substring(0, 50));
                  return (
                  <div key={`${conv.id}-${forceUpdate}`} className="group relative">
                    <div
                      onClick={() => setActiveConversation(conv.id)}
                      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-[#1a1a1a] transition-colors cursor-pointer ${
                        activeConversationId === conv.id ? 'bg-[#1a1a1a] text-white' : 'text-gray-400'
                      }`}
                    >
                      <div className="relative flex-shrink-0">
                        {(() => {
                          const hasCustomImage = conv.groupInfo?.photoURL && 
                                                conv.groupInfo.photoURL !== '/default-group.svg' &&
                                                conv.groupInfo.photoURL.length > 0;
                          
                          if (hasCustomImage) {
                            return (
                              <img
                                src={conv.groupInfo!.photoURL}
                                alt={conv.groupInfo?.name || 'Group'}
                                className="w-10 h-10 rounded-full object-cover bg-[#262626]"
                                onError={(e) => {
                                  console.error('Failed to load group image:', conv.id);
                                  (e.target as HTMLImageElement).style.display = 'none';
                                  const parent = (e.target as HTMLImageElement).parentElement;
                                  if (parent) {
                                    parent.innerHTML = '<div class="w-10 h-10 rounded-full bg-[#262626] flex items-center justify-center"><svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg></div>';
                                  }
                                }}
                              />
                            );
                          } else {
                            return (
                              <div className="w-10 h-10 rounded-full bg-[#262626] flex items-center justify-center">
                                <Users className="w-5 h-5 text-gray-500" />
                              </div>
                            );
                          }
                        })()}
                      </div>
                      <span className="text-sm truncate flex-1">{conv.groupInfo?.name || 'group-chat'}</span>
                      <button
                        type="button"
                        aria-label="Delete conversation"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteConversation(conv.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 rounded transition-all"
                      >
                        <Trash2 className="w-3 h-3 text-red-400" />
                      </button>
                    </div>
                  </div>
                )})}
              
              <button
                type="button"
                aria-label="Create new channel"
                onClick={() => setShowNewConversation(true)}
                className="w-full flex items-center gap-2 px-2 py-1 rounded hover:bg-[#1a1a1a] transition-colors text-gray-400 mt-1"
              >
                <Plus className="w-4 h-4" />
                <span className="text-sm">Add channel</span>
              </button>
            </div>

            {/* Direct Messages Section */}
            <div className="px-3 py-2 border-t border-[#262626]">
              <button type="button" aria-label="Toggle direct messages section" className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 mb-1">
                <ChevronDown className="w-3 h-3" />
                <span>Direct Messages</span>
              </button>
              
              {Array.from(conversations.values())
                .filter(c => c.type === 'direct')
                .map(conv => {
                  const otherUserId = conv.members.find(id => id !== user.uid);
                  const otherUser = otherUserId ? userProfiles.get(otherUserId) : null;
                  const isOnline = presence.get(otherUserId || '');
                  
                  return (
                    <div key={conv.id} className="group relative">
                      <div
                        onClick={() => setActiveConversation(conv.id)}
                        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-[#1a1a1a] transition-colors cursor-pointer ${
                          activeConversationId === conv.id ? 'bg-[#1a1a1a] text-white' : 'text-gray-400'
                        }`}
                      >
                        <div className="relative flex-shrink-0">
                          <img
                            src={otherUser?.photoURL || '/default-avatar.png'}
                            alt={otherUser?.displayName || 'User'}
                            className={`w-10 h-10 rounded-full object-cover bg-[#262626] cursor-pointer hover:opacity-80 transition-opacity ${getTierRingColor(otherUser?.tier)}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (otherUserId) {
                                const userInfo = getUserInfo(otherUserId);
                                setSelectedProfile({
                                  uid: otherUserId,
                                  displayName: userInfo.displayName,
                                  email: otherUser?.email,
                                  photoURL: userInfo.photoURL,
                                  tier: userInfo.tier,
                                  createdAt: otherUser?.createdAt,
                                  lastSeen: otherUser?.lastSeen,
                                  country: userInfo.country || otherUser?.country,
                                  region: userInfo.region || otherUser?.region
                                });
                                setShowProfileSlider(true);
                              }
                            }}
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = '/default-avatar.png';
                            }}
                          />
                          {isOnline && (
                            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border border-[#0a0a0a]" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1">
                            <span className="text-sm truncate">
                              {otherUser?.displayName || 'Unknown User'}
                            </span>
                            {otherUser?.tier && typeof otherUser.tier === 'string' && otherUser.tier !== 'starter' && (
                              <span className={`text-[9px] px-1 py-0.5 rounded font-medium flex-shrink-0 ${
                                otherUser.tier === 'pixlionaire' ? 'bg-purple-900/30 text-purple-400' :
                                otherUser.tier === 'pixlbeast' ? 'bg-amber-900/30 text-amber-400' :
                                otherUser.tier === 'pro' ? 'bg-green-900/30 text-green-400' :
                                otherUser.tier === 'rising' ? 'bg-blue-900/30 text-blue-400' :
                                'bg-gray-900/30 text-gray-400'
                              }`}>
                                {String(otherUser.tier).toUpperCase()}
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          aria-label="Delete conversation"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteConversation(conv.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 rounded transition-all"
                        >
                          <Trash2 className="w-3 h-3 text-red-400" />
                        </button>
                      </div>
                    </div>
                  );
                })}
                
              <button
                type="button"
                aria-label="Start new direct message"
                onClick={() => setShowNewConversation(true)}
                className="w-full flex items-center gap-2 px-2 py-1 rounded hover:bg-[#1a1a1a] transition-colors text-gray-400 mt-1"
              >
                <Plus className="w-4 h-4" />
                <span className="text-sm">New message</span>
              </button>
            </div>
          </div>

          {/* Connection Status */}
          <div className="p-3 border-t border-[#262626]">
            <div className={`text-xs px-2 py-1 rounded text-center ${
              connectionStatus === 'connected' ? 'bg-green-900/20 text-green-400' :
              connectionStatus === 'fallback' ? 'bg-yellow-900/20 text-yellow-400' :
              'bg-gray-900 text-gray-500'
            }`}>
              {connectionStatus === 'connected' ? '● Connected' :
               connectionStatus === 'fallback' ? '● Fallback Mode' :
               '○ Connecting...'}
            </div>
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col bg-black">
          {activeConversation ? (
            <>
              {/* Chat Header - with top padding to avoid being covered by page header */}
              <div className="h-32 pt-20 border-b border-[#262626] bg-[#0a0a0a] flex items-center justify-between px-4 relative z-10">
                <div className="flex items-center gap-3">
                  {conversationInfo?.isGroup ? (
                    <div className="relative group">
                      <img
                        src={conversationInfo.avatar}
                        alt={conversationInfo.name}
                        className="w-9 h-9 rounded-full object-cover bg-[#262626] cursor-pointer"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/default-group.svg';
                        }}
                      />
                      <label className="absolute inset-0 cursor-pointer opacity-0 hover:opacity-100 bg-black/50 rounded-full flex items-center justify-center transition-opacity">
                        <Camera className="w-4 h-4 text-white" />
                        <input
                          type="file"
                          accept="image/*"
                          aria-label="Upload channel image"
                          onChange={handleChangeChannelImage}
                          className="hidden"
                        />
                      </label>
                    </div>
                  ) : (
                    <img
                      src={conversationInfo?.avatar}
                      alt={conversationInfo?.name}
                      className={`w-9 h-9 rounded-full object-cover bg-[#262626] cursor-pointer hover:opacity-80 transition-opacity ${getTierRingColor(conversationInfo?.tier)}`}
                      onClick={() => {
                        // For direct messages, show recipient profile
                        if (activeConversation.type === 'direct') {
                          const otherUserId = activeConversation.members.find(id => id !== user.uid);
                          if (otherUserId) {
                            const userInfo = getUserInfo(otherUserId);
                            setSelectedProfile({
                              uid: otherUserId,
                              displayName: userInfo.displayName,
                              email: userProfiles.get(otherUserId)?.email,
                              photoURL: userInfo.photoURL,
                              tier: userInfo.tier,
                              createdAt: userProfiles.get(otherUserId)?.createdAt,
                              lastSeen: userProfiles.get(otherUserId)?.lastSeen,
                              country: userInfo.country || userProfiles.get(otherUserId)?.country,
                              region: userInfo.region || userProfiles.get(otherUserId)?.region
                            });
                            setShowProfileSlider(true);
                          }
                        }
                      }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/default-avatar.png';
                      }}
                    />
                  )}
                  
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white">
                        {conversationInfo?.name}
                      </span>
                      {conversationInfo?.tier && conversationInfo.tier !== 'starter' && (
                        <span className={`text-xs px-1.5 py-0.5 rounded ${
                          conversationInfo.tier === 'pixlionaire' ? 'bg-purple-900/20 text-purple-400' :
                          conversationInfo.tier === 'pixlbeast' ? 'bg-amber-900/20 text-amber-400' :
                          conversationInfo.tier === 'pro' ? 'bg-green-900/20 text-green-400' :
                          conversationInfo.tier === 'rising' ? 'bg-blue-900/20 text-blue-400' :
                          'bg-gray-900/20 text-gray-400'
                        }`}>
                          {conversationInfo.tier}
                        </span>
                      )}
                    </div>
                    <div className="text-sm">
                      {(() => {
                        // Always show status for direct messages
                        if (activeConversation.type === 'direct') {
                          const otherUserId = activeConversation.members.find(id => id !== user.uid);
                          const isOnline = otherUserId ? presence.get(otherUserId) : false;
                          
                          // Show recording if someone is recording, then typing, otherwise show online status
                          if (recordingUsers.length > 0) {
                            return (
                              <div className="flex items-center gap-1 text-red-400">
                                <Mic className="w-3 h-3 animate-pulse" />
                                <span>
                                  {recordingUsers.map(userId => userProfiles.get(userId)?.displayName || 'Someone').join(', ')}
                                </span>
                                <span>{recordingUsers.length === 1 ? 'is' : 'are'} recording</span>
                              </div>
                            );
                          }
                          
                          if (typingUsers.length > 0) {
                            return (
                              <div className="flex items-center gap-1">
                                <span>
                                  {typingUsers.map(userId => userProfiles.get(userId)?.displayName || 'Someone').join(', ')}
                                </span>
                                <span>{typingUsers.length === 1 ? 'is' : 'are'} typing</span>
                                <div className="flex gap-0.5">
                                  <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" />
                                  <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce [animation-delay:100ms]" />
                                  <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce [animation-delay:200ms]" />
                                </div>
                              </div>
                            );
                          }
                          
                          // Always show online/offline status for direct messages
                          return isOnline ? (
                            <div className="flex items-center gap-1.5">
                              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                              <span className="text-green-500 font-medium text-sm">Online</span>
                            </div>
                          ) : (
                            <div className="text-gray-400 font-medium text-sm">Offline</div>
                          );
                        }
                        
                        // For group conversations, show recording, then typing, or subtitle
                        if (recordingUsers.length > 0) {
                          return (
                            <div className="flex items-center gap-1 text-red-400">
                              <Mic className="w-3 h-3 animate-pulse" />
                              <span>
                                {recordingUsers.map(userId => userProfiles.get(userId)?.displayName || 'Someone').join(', ')}
                              </span>
                              <span>{recordingUsers.length === 1 ? 'is' : 'are'} recording</span>
                            </div>
                          );
                        }
                        
                        if (typingUsers.length > 0) {
                          return (
                            <div className="flex items-center gap-1">
                              <span>
                                {typingUsers.map(userId => userProfiles.get(userId)?.displayName || 'Someone').join(', ')}
                              </span>
                              <span>{typingUsers.length === 1 ? 'is' : 'are'} typing</span>
                              <div className="flex gap-0.5">
                                <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" />
                                <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce [animation-delay:100ms]" />
                                <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce [animation-delay:200ms]" />
                              </div>
                            </div>
                          );
                        }
                        
                        return <span>{conversationInfo?.subtitle || ''}</span>;
                      })()}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button type="button" aria-label="Start voice call" className="p-2 hover:bg-[#1a1a1a] rounded transition-colors">
                    <Phone className="w-4 h-4 text-gray-400" />
                  </button>
                  <button type="button" aria-label="Start video call" className="p-2 hover:bg-[#1a1a1a] rounded transition-colors">
                    <Video className="w-4 h-4 text-gray-400" />
                  </button>
                  {activeConversation.type === 'group' && (
                    <button 
                      type="button"
                      aria-label="Toggle information sidebar"
                      onClick={() => setShowRightSidebar(!showRightSidebar)}
                      className="p-2 hover:bg-[#1a1a1a] rounded transition-colors"
                    >
                      <Info className="w-4 h-4 text-gray-400" />
                    </button>
                  )}
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-hidden flex flex-col">
                {activeMessages.length > 0 ? (
                  <>
                    <div className="flex-1 overflow-hidden">
                      <SimpleMessageList
                        messages={activeMessages}
                        currentUserId={user?.uid || 'test-user-1'}
                        getUserInfo={getUserInfo}
                        onReply={handleReply}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onReact={handleReact}
                      />
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="text-5xl mb-4">💬</div>
                      <p className="text-gray-400">No messages yet. Start the conversation!</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Message Input */}
              <MessageInput
                onSend={handleSendMessage}
                onMediaSend={handleMediaSend}
                onTyping={handleTyping}
                placeholder={`Write a message...`}
                conversationId={activeConversationId || undefined}
                recipientId={activeConversation.type === 'direct' ? activeConversation.members.find(id => id !== user.uid) || undefined : undefined}
                replyingTo={replyingTo}
                onCancelReply={() => setReplyingTo(null)}
              />
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="w-16 h-16 text-gray-700 mx-auto mb-4" />
                <h3 className="text-xl text-gray-400 mb-2">Select a conversation</h3>
                <p className="text-gray-600">Choose a channel or DM from the sidebar</p>
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar - Members for Groups Only */}
        {activeConversation && activeConversation.type === 'group' && showRightSidebar && (
          <div className="w-64 bg-[#0a0a0a] border-l border-[#262626] flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-[#262626]">
              <h3 className="font-semibold text-white">Channel Details</h3>
            </div>

            {/* Members Section */}
            <div className="p-4">
              <h4 className="text-sm font-medium text-gray-400 mb-3">Members ({activeConversation.members.length})</h4>
              <div className="space-y-2">
                {activeConversation.members.map(memberId => {
                  const memberProfile = memberId === user.uid ? {
                    displayName: user.displayName || 'You',
                    photoURL: user.photoURL || '/default-avatar.png',
                    tier: platformUser?.tier?.current || 'starter'
                  } : userProfiles.get(memberId) || {
                    displayName: 'Loading...',
                    photoURL: '/default-avatar.png',
                    tier: 'starter'
                  };
                  
                  return (
                    <div key={memberId} className="flex items-center gap-2">
                      <img
                        src={memberProfile.photoURL}
                        alt={memberProfile.displayName}
                        className={`w-8 h-8 rounded-full object-cover ${getTierRingColor(memberProfile.tier)}`}
                      />
                      <div className="flex-1">
                        <div className="text-sm text-white">
                          {memberProfile.displayName}
                          {memberId === user.uid && ' (You)'}
                        </div>
                        <div className="text-xs text-gray-500">{memberProfile.tier}</div>
                      </div>
                      {presence.get(memberId) && (
                        <div className="w-2 h-2 bg-green-500 rounded-full" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}