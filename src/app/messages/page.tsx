'use client';

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useChatStore } from "@/stores/chatStore";
import { ConversationList } from "@/components/chat/ConversationList";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { MessageInput } from "@/components/chat/MessageInput";
import { VirtualMessageList } from "@/components/chat/VirtualMessageList";
import { TypingIndicator } from "@/components/chat/TypingIndicator";
import { NewConversationModal } from "@/components/chat/NewConversationModal";
import { keyExchangeService } from "@/services/chat/key-exchange.service";
import { presenceService } from "@/services/chat/presence.service";
import { socketService } from "@/services/chat/socket.service";
import { offlineQueue } from "@/services/chat/offline-queue.service";
import { 
  Plus, Search, Users, Mic, Settings, Bell, Phone, Video, 
  Info, Star, MoreVertical, Hash, Lock, ChevronDown, 
  Paperclip, Image as ImageIcon, Smile, Send, File, X, Home, MessageSquare,
  CreditCard, Wallet, User as UserIcon, Trash2, Camera, Edit2
} from "lucide-react";
import { doc, getDoc, deleteDoc, updateDoc, getDocs, collection } from "firebase/firestore";
import { db } from "@/lib/firebase-config";

export default function EnhancedMessagesPage() {
  const { user, platformUser } = useAuth();
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [showRightSidebar, setShowRightSidebar] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'fallback'>('connecting');
  const [userProfiles, setUserProfiles] = useState<Map<string, any>>(new Map());
  const [searchQuery, setSearchQuery] = useState('');
  const [showChannelImageUpload, setShowChannelImageUpload] = useState(false);
  const [messageListHeight, setMessageListHeight] = useState(600);
  
  const {
    conversations,
    messages,
    activeConversationId,
    isConnected,
    typing,
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
  
  // Calculate message list height dynamically
  useEffect(() => {
    const calculateHeight = () => {
      // Account for header (80px), message input (120px), and some padding
      const height = window.innerHeight - 200;
      setMessageListHeight(Math.max(400, height)); // Minimum 400px
    };

    calculateHeight();
    window.addEventListener('resize', calculateHeight);
    return () => window.removeEventListener('resize', calculateHeight);
  }, []);

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
        await initializeEncryption(user.uid);
        await keyExchangeService.initializeUserKeys(user.uid);
        await presenceService.initializePresence(user.uid);
        
        const socket = await socketService.initialize(user.uid);
        
        // Expose socketService to window for store access
        (window as any).socketService = socketService;
        
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
          socketService.on('typing:update', (data: { conversationId: string; userId: string; isTyping: boolean }) => {
            console.log('⌨️ Typing update:', data);
            
            // Don't show typing for current user
            if (data.userId !== user.uid) {
              setTypingUser(data.conversationId, data.userId, data.isTyping);
            }
          });
          
          // Listen for new messages via WebSocket
          socketService.on('message:new', (message: any) => {
            console.log('📨 New message received via WebSocket in Messages page:', message);
            // The message will be handled by the store's initializeSocket handler
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
      presenceService.stopHeartbeat();
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
      
      for (const conversation of conversations.values()) {
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
                  tier: userData.tier?.current || userData.tier || 'starter',
                  username: userData.username,
                  email: userData.email
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
    return msgs.map((msg: any) => ({
      ...msg,
      text: msg.decryptedContent || msg.content || msg.text || '',
      readBy: msg.read || msg.readBy || [],
      deliveredTo: msg.delivered || msg.deliveredTo || []
    }));
  }, [activeConversationId, messages]);
  const typingUsers = activeConversationId ? typing.get(activeConversationId) || [] : [];

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || !activeConversationId) return;
    await sendMessage(text, 'text');
  };

  const handleMediaSend = async (mediaMessage: any) => {
    if (!activeConversationId) return;
    
    const messageType = mediaMessage.mediaType === 'image' ? 'image' : 
                       mediaMessage.mediaType === 'voice' ? 'voice' : 
                       mediaMessage.mediaType === 'file' ? 'file' : 'media';
    
    await sendMessage(mediaMessage.downloadUrl || '', messageType, {
      ...mediaMessage.metadata,
      downloadUrl: mediaMessage.downloadUrl,
      encryptedKey: mediaMessage.encryptedKey,
      nonce: mediaMessage.nonce,
      mediaType: mediaMessage.mediaType
    });
  };

  const handleTyping = (isTyping: boolean) => {
    if (activeConversationId) {
      console.log(`📝 Sending typing ${isTyping ? 'start' : 'stop'} for conversation: ${activeConversationId}`);
      updateTyping(activeConversationId, isTyping);
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
        
        // Use store's deleteConversation to clear from local state
        // This will handle clearing messages and conversation from the store
        deleteConversation(conversationId);
        
        // Reload conversations to ensure sync with Firestore
        await loadConversations();
      } catch (error) {
        console.error('Failed to delete conversation:', error);
      }
    }
  };

  const handleChangeChannelImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeConversation || activeConversation.type !== 'group') return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      try {
        // Update in Firestore
        await updateDoc(doc(db, 'conversations', activeConversationId!), {
          'groupInfo.photoURL': base64
        });
        
        // Small delay to ensure Firestore has updated
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Reload conversations to get the updated data
        await loadConversations();
        
        console.log('✅ Group image updated successfully');
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
        tier: platformUser?.tier?.current || 'starter'
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

  const handleLoadMore = useCallback(() => {
    const oldest = activeMessages[0];
    if (oldest && activeConversationId) {
      loadMessages(activeConversationId, {
        limit: 50,
        before: oldest.id
      });
    }
  }, [activeMessages, activeConversationId, loadMessages]);

  const handleReply = useCallback((message: any) => {
    setReplyingTo(message);
  }, [setReplyingTo]);

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

  // Get tier ring color
  const getTierRingColor = (tier?: string) => {
    switch (tier) {
      case 'pixlionaire': return 'ring-2 ring-purple-500';
      case 'pixlbeast': return 'ring-2 ring-amber-500';
      case 'pro': return 'ring-2 ring-green-500';
      case 'rising': return 'ring-2 ring-blue-500';
      default: return 'ring-1 ring-gray-600';
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
      
      <div className="flex flex-1 overflow-hidden">
        {/* Channel Sidebar */}
        <div className="w-64 bg-[#0a0a0a] border-r border-[#262626] flex flex-col">
          {/* Workspace Header */}
          <div className="p-4 border-b border-[#262626]">
            <button className="w-full flex items-center justify-between hover:bg-[#1a1a1a] px-2 py-1 rounded transition-colors">
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
              <button className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 mb-1">
                <ChevronDown className="w-3 h-3" />
                <span>Channels</span>
              </button>
              
              {Array.from(conversations.values())
                .filter(c => c.type === 'group')
                .map(conv => (
                  <div key={conv.id} className="group relative">
                    <div
                      onClick={() => setActiveConversation(conv.id)}
                      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-[#1a1a1a] transition-colors cursor-pointer ${
                        activeConversationId === conv.id ? 'bg-[#1a1a1a] text-white' : 'text-gray-400'
                      }`}
                    >
                      <div className="relative flex-shrink-0">
                        <img
                          src={conv.groupInfo?.photoURL || '/default-group.svg'}
                          alt={conv.groupInfo?.name || 'Group'}
                          className="w-10 h-10 rounded-full object-cover bg-[#262626]"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/default-group.svg';
                          }}
                        />
                      </div>
                      <span className="text-sm truncate flex-1">{conv.groupInfo?.name || 'group-chat'}</span>
                      <button
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
                ))}
              
              <button
                onClick={() => setShowNewConversation(true)}
                className="w-full flex items-center gap-2 px-2 py-1 rounded hover:bg-[#1a1a1a] transition-colors text-gray-400 mt-1"
              >
                <Plus className="w-4 h-4" />
                <span className="text-sm">Add channel</span>
              </button>
            </div>

            {/* Direct Messages Section */}
            <div className="px-3 py-2 border-t border-[#262626]">
              <button className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 mb-1">
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
                            className={`w-10 h-10 rounded-full object-cover bg-[#262626] ${getTierRingColor(otherUser?.tier)}`}
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
                            {otherUser?.tier && otherUser.tier !== 'starter' && (
                              <span className={`text-[9px] px-1 py-0.5 rounded font-medium flex-shrink-0 ${
                                otherUser.tier === 'pixlionaire' ? 'bg-purple-900/30 text-purple-400' :
                                otherUser.tier === 'pixlbeast' ? 'bg-amber-900/30 text-amber-400' :
                                otherUser.tier === 'pro' ? 'bg-green-900/30 text-green-400' :
                                otherUser.tier === 'rising' ? 'bg-blue-900/30 text-blue-400' :
                                'bg-gray-900/30 text-gray-400'
                              }`}>
                                {otherUser.tier.toUpperCase()}
                              </span>
                            )}
                          </div>
                        </div>
                        <button
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
              {/* Chat Header */}
              <div className="h-14 border-b border-[#262626] bg-[#0a0a0a] flex items-center justify-between px-4">
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
                          onChange={handleChangeChannelImage}
                          className="hidden"
                        />
                      </label>
                    </div>
                  ) : (
                    <img
                      src={conversationInfo?.avatar}
                      alt={conversationInfo?.name}
                      className={`w-9 h-9 rounded-full object-cover bg-[#262626] ${getTierRingColor(conversationInfo?.tier)}`}
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
                    <div className="text-xs text-gray-500">
                      {typingUsers.length > 0 ? (
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
                      ) : activeConversation.type === 'direct' ? (
                        (() => {
                          const otherUserId = activeConversation.members.find(id => id !== user.uid);
                          const isOnline = otherUserId && presence.get(otherUserId);
                          // Debug presence
                          if (otherUserId) {
                            console.log('👤 Presence check:', {
                              otherUserId,
                              isOnline,
                              presenceSize: presence.size,
                              allOnlineUsers: Array.from(presence.entries()).filter(([, online]) => online).map(([id]) => id)
                            });
                          }
                          return isOnline ? (
                            <span className="flex items-center gap-1">
                              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                              <span>Online</span>
                            </span>
                          ) : (
                            <span className="text-gray-400">Offline</span>
                          );
                        })()
                      ) : (
                        <span>{conversationInfo?.subtitle}</span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button className="p-2 hover:bg-[#1a1a1a] rounded transition-colors">
                    <Phone className="w-4 h-4 text-gray-400" />
                  </button>
                  <button className="p-2 hover:bg-[#1a1a1a] rounded transition-colors">
                    <Video className="w-4 h-4 text-gray-400" />
                  </button>
                  {activeConversation.type === 'group' && (
                    <button 
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
                    <div className="p-4 pb-2">
                      <div className="text-sm text-gray-500">
                        Showing {activeMessages.length} messages
                      </div>
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <VirtualMessageList
                        messages={activeMessages}
                        currentUserId={user?.uid || userId || 'test-user-1'}
                        height={messageListHeight}
                        getUserInfo={getUserInfo}
                        onLoadMore={handleLoadMore}
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
                conversationId={activeConversationId}
                recipientId={activeConversation.type === 'direct' ? activeConversation.members.find(id => id !== user.uid) : undefined}
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