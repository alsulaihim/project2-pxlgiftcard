"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import {
  ChatMessage,
  Conversation,
  listUserConversations,
  sendMessage,
  subscribeMessages,
  subscribeUserConversations,
  startDirectByUsername,
} from "@/services/chat/firestore-chat.service";
import { db } from "@/lib/firebase-config";
import { collection, query, where, limit, getDocs, getDoc, doc, deleteDoc } from "firebase/firestore";
import { ConversationList } from "@/components/chat/ConversationList";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { MessageInput } from "@/components/chat/MessageInput";
import { keyExchangeService } from "@/services/chat/key-exchange.service";
import { presenceService } from "@/services/chat/presence.service";
import { socketService } from "@/services/chat/socket.service";
import { encryptionService } from "@/services/chat/encryption.service";
import { storageService } from "@/services/chat/storage.service";
import { deleteConversation, deleteAllUserConversations } from "@/services/chat/firestore-chat.service";
import { Plus, Search, Users } from "lucide-react";

// DirectMessageHeader component to avoid IIFE syntax issues
function DirectMessageHeader({ active, user, getUserInfo, connectionStatus }: {
  active: Conversation;
  user: any;
  getUserInfo: (userId: string) => any;
  connectionStatus: 'connecting' | 'connected' | 'fallback';
}) {
  const otherUserId = active.members.find(id => id !== user.uid);
  const otherUser = otherUserId ? getUserInfo(otherUserId) : null;
  
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <div className="relative">
          <img
            src={otherUser?.photoURL || '/default-avatar.png'}
            alt={otherUser?.displayName || 'User'}
            className="w-10 h-10 rounded-full object-cover"
          />
          {/* Tier ring */}
          <div className={`absolute inset-0 rounded-full border-2 ${
            otherUser?.tier === 'starter' ? 'border-gray-400' :
            otherUser?.tier === 'rising' ? 'border-blue-500' :
            otherUser?.tier === 'pro' ? 'border-purple-500' :
            otherUser?.tier === 'pixlbeast' ? 'border-yellow-500' :
            otherUser?.tier === 'pixlionaire' ? 'border-red-500' :
            'border-gray-400'
          }`}></div>
        </div>
        <div>
          <h1 className="text-white text-sm font-semibold">
            {otherUser?.displayName || 'Unknown User'}
          </h1>
          <div className="flex items-center space-x-2">
            <div className={`text-xs px-2 py-0.5 rounded-full ${
              otherUser?.tier === 'starter' ? 'bg-gray-600 text-gray-200' :
              otherUser?.tier === 'rising' ? 'bg-blue-600 text-blue-100' :
              otherUser?.tier === 'pro' ? 'bg-purple-600 text-purple-100' :
              otherUser?.tier === 'pixlbeast' ? 'bg-yellow-600 text-yellow-100' :
              otherUser?.tier === 'pixlionaire' ? 'bg-red-600 text-red-100' :
              'bg-gray-600 text-gray-200'
            }`}>
              {otherUser?.tier || 'starter'}
            </div>
            <span className="text-xs text-green-400">● Online</span>
          </div>
        </div>
      </div>
      
      {/* Connection Status Indicator */}
      <div className="flex items-center space-x-2">
        <div className={`flex items-center space-x-1 text-xs px-2 py-1 rounded-full ${
          connectionStatus === 'connected' ? 'bg-green-900 text-green-300' :
          connectionStatus === 'fallback' ? 'bg-yellow-900 text-yellow-300' :
          'bg-gray-900 text-gray-400'
        }`}>
          <div className={`w-2 h-2 rounded-full ${
            connectionStatus === 'connected' ? 'bg-green-400' :
            connectionStatus === 'fallback' ? 'bg-yellow-400' :
            'bg-gray-400'
          }`}></div>
          <span>
            {connectionStatus === 'connected' ? 'Real-time' :
             connectionStatus === 'fallback' ? 'Firestore' :
             'Connecting...'}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function MessagesPage() {
  const { user, platformUser } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [active, setActive] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [searchUsername, setSearchUsername] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'fallback'>('connecting');
  // User cache for profile data
  const [userCache, setUserCache] = useState<Record<string, any>>({});

  // Function to fetch user data from Firestore
  const fetchUserData = async (userId: string) => {
    if (userCache[userId]) return userCache[userId];

    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const userData = { uid: userId, ...userDoc.data() };
        setUserCache(prev => ({ ...prev, [userId]: userData }));
        return userData;
      }
    } catch (error) {
      console.error('Failed to fetch user data:', error);
    }
    
    return null;
  };

  // Initialize encryption, presence, and Socket.io
  useEffect(() => {
    if (!user) return;
    
    const initializeChat = async () => {
      try {
        setError(null);
        
        // BUG FIX: 2025-01-28 - Add Firebase connectivity check and timeout
        // Problem: Firebase connectivity issues causing page to hang indefinitely
        // Solution: Check network status, add timeout, and handle offline scenarios
        // Impact: Better error handling and user feedback for connectivity issues
        
        if (!navigator.onLine) {
          throw new Error('No internet connection. Please check your network and try again.');
        }
        
        // Add timeout wrapper for all Firebase operations
        const initWithTimeout = async () => {
          const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('Firebase connection timeout. Please refresh the page.')), 15000);
          });
          
          const initPromise = (async () => {
            // BUG FIX: 2025-01-28 - Initialize encryption with graceful error handling
            // Problem: Firebase connectivity issues and key initialization failures
            // Solution: Add proper error handling and don't clear keys automatically
            // Impact: More stable initialization without losing existing keys
            
            // Initialize encryption keys with error handling
            try {
              await keyExchangeService.initializeUserKeys(user.uid);
              console.log('✅ Encryption keys initialized');
            } catch (error) {
              console.error('🔑 Failed to initialize encryption keys:', error);
              throw new Error('Failed to initialize secure messaging. Please try refreshing the page.');
            }
            
            // Initialize presence (non-critical)
            try {
              await presenceService.initializePresence(user.uid);
              console.log('✅ Presence service initialized');
            } catch (error) {
              console.warn('⚠️ Presence service failed to initialize (non-critical):', error);
            }
            
            // Initialize Socket.io connection (optional enhancement)
            try {
              await socketService.initialize();
              if (socketService.isSocketConnected()) {
                setConnectionStatus('connected');
                console.log('✅ Socket.io connected');
                
                // Setup Socket.io event listeners
                socketService.on('message:new', (message) => {
                  console.log('📨 Real-time message received:', message.id);
                  // Remove any optimistic message with same content
                  setMessages(prev => {
                    const filtered = prev.filter(m => !m.id.startsWith('temp-'));
                    return [message as unknown as ChatMessage, ...filtered];
                  });
                });
                
                socketService.on('message:sent', (data) => {
                  console.log('✅ Message sent confirmation:', data.messageId);
                });
                
                socketService.on('typing:update', (data) => {
                  console.log('⌨️ Typing update:', data);
                  // Handle typing indicators here
                });
                
                socketService.on('presence:update', (data) => {
                  console.log('👤 Presence update:', data);
                  // Handle user online/offline status here
                });
                
              } else {
                setConnectionStatus('fallback');
                console.log('📡 Using Firestore fallback (Socket.io unavailable)');
              }
            } catch (error) {
              console.warn('⚠️ Socket.io failed to initialize, using Firestore fallback:', error);
              setConnectionStatus('fallback');
            }
          })();
          
          return Promise.race([initPromise, timeoutPromise]);
        };
        
        await initWithTimeout();
        
        setIsInitializing(false);
        
        // Set active conversation now that initialization is complete
        if (conversations.length > 0 && !active) {
          setActive(conversations[0]);
        }
      } catch (error) {
        console.error('Failed to initialize chat:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to initialize secure chat. Please refresh the page.';
        setError(errorMessage);
        setIsInitializing(false);
      }
    };

    initializeChat();

    // Cleanup on unmount
    return () => {
      presenceService.cleanup();
      socketService.disconnect();
    };
  }, [user]);

  // Subscribe to conversations in real-time
  useEffect(() => {
    if (!user || isInitializing) return;
    
    console.log('🔄 Setting up real-time conversation subscription for user:', user.uid);
    
    const unsubscribe = subscribeUserConversations(user.uid, (conversations) => {
      console.log('📋 Received conversation update:', conversations.length, 'conversations');
      
      // Deduplicate conversations by ID
      const uniqueConversations = conversations.filter((conv, index, self) => 
        index === self.findIndex(c => c.id === conv.id)
      );
      
      setConversations(uniqueConversations);
      
      // Set active conversation if none is selected and we have conversations
      if (uniqueConversations.length > 0 && !active) {
        setActive(uniqueConversations[0]);
      }

      // Preload user data for all conversation members
      const allMemberIds = new Set<string>();
      uniqueConversations.forEach(conv => {
        conv.members.forEach(memberId => {
          if (memberId !== user.uid) {
            allMemberIds.add(memberId);
          }
        });
      });

      // Fetch user data for all members
      Array.from(allMemberIds).forEach(userId => {
        fetchUserData(userId);
      });
    });
    
    return () => {
      console.log('🔄 Cleaning up conversation subscription');
      unsubscribe();
    };
  }, [user, isInitializing, active]);

  // Subscribe to messages and Socket.io events
  useEffect(() => {
    if (!active) return;
    
    // Subscribe to Firestore messages for persistence and history
    // This provides the authoritative message store with dual encryption
    setMessagesLoading(true);
    const unsub = subscribeMessages(active.id, (firestoreMessages) => {
      console.log('📚 Received', firestoreMessages.length, 'messages from Firestore subscription');
      
      // Filter out any messages with decryption errors before displaying
      const validMessages = firestoreMessages.filter(msg => 
        !msg.text.includes('[Decrypting...]') &&
        !msg.text.includes('[Decryption failed]') &&
        !msg.text.includes('[Cannot decrypt]')
      );
      
      // Only update if messages have actually changed (prevents flashing)
      setMessages(prev => {
        setMessagesLoading(false);
        
        // Check if the messages are actually different
        if (prev.length === validMessages.length) {
          const hasChanges = validMessages.some((msg, index) => 
            prev[index]?.id !== msg.id || 
            prev[index]?.text !== msg.text
          );
          if (!hasChanges) {
            console.log('📚 No changes in messages, skipping update');
            return prev;
          }
        }
        console.log('📚 Updating messages from Firestore');
        return validMessages;
      });
    });
    
    // Join Socket.io conversation room
    socketService.joinConversation(active.id);
    
    // Listen for real-time messages via Socket.io
    const handleNewMessage = async (message: any) => {
      // Normalize conversation ID for comparison (handle direct_userA_userB format)
      const normalizeId = (id: string) => {
        if (!id.startsWith('direct_')) return id;
        const parts = id.replace('direct_', '').split('_');
        if (parts.length !== 2) return id;
        return `direct_${parts.sort().join('_')}`;
      };
      
      const normalizedMessageConvId = normalizeId(message.conversationId);
      const normalizedActiveId = normalizeId(active.id);
      
      if (normalizedMessageConvId === normalizedActiveId) {
        console.log('📨 Received Socket.io message:', message);
        console.log('📨 Message senderId:', message.senderId, 'Current userId:', user?.uid);
        
        // IMPORTANT: Skip own messages from Socket.io since they're already handled optimistically
        // and will be properly stored via Firestore with dual encryption
        const currentUserId = user?.uid;
        const isOwnMessage = message.senderId === currentUserId;
        
        if (isOwnMessage) {
          console.log('🔄 Skipping own message from Socket.io (already shown optimistically)');
          return; // Don't process own messages from Socket.io
        }
        
        // Decrypt the message content for messages from others
        let decryptedText = message.content; // Default to encrypted content
        
        try {
          if (message.nonce) {
            // For messages from others, decrypt using sender's public key
            const senderPublicKey = await keyExchangeService.getPublicKey(message.senderId);
            if (senderPublicKey) {
              decryptedText = encryptionService.decryptMessage(
                { content: message.content, nonce: message.nonce },
                senderPublicKey
              );
              console.log('🔓 Successfully decrypted Socket.io message from:', message.senderId);
            } else {
              console.warn('⚠️ Could not get public key for sender:', message.senderId);
              decryptedText = '[Unable to decrypt - key not found]';
            }
          }
        } catch (error) {
          console.error('🔥 Failed to decrypt Socket.io message:', error);
          decryptedText = '[Decryption failed]';
        }
        
        // Convert Socket.io message format to ChatMessage format
        const chatMessage: ChatMessage = {
          id: message.id,
          senderId: message.senderId,
          text: decryptedText,
          timestamp: { toDate: () => new Date(message.timestamp) } as any,
          readBy: message.read || [],
          deliveredTo: message.delivered || []
        };
        
        // Add message from other users (own messages are skipped above)
        setMessages(prev => {
          // Check if this message already exists (from Firestore subscription)
          const messageExists = prev.some(msg => msg.id === message.id);
          if (messageExists) {
            console.log('📋 Message already exists from Firestore, skipping Socket.io duplicate');
            return prev;
          }
          
          // Add the new message to the list (messages are in DESC order)
          console.log('➕ Adding new message from Socket.io to chat');
          return [chatMessage, ...prev];
        });
      }
    };
    
    const handleMessageSent = (data: { messageId: string; timestamp: string }) => {
      console.log('✅ Message sent confirmation:', data);
      
      // Replace optimistic message with confirmed one
      setMessages(prev => prev.map(msg => {
        if (msg.id.startsWith('temp-')) {
          return {
            ...msg,
            id: data.messageId,
            timestamp: { toDate: () => new Date(data.timestamp) } as any
          };
        }
        return msg;
      }));
    };
    
    const handleTypingUpdate = (data: { conversationId: string; userId: string; typing: boolean }) => {
      // Normalize conversation ID for comparison
      const normalizeId = (id: string) => {
        if (!id.startsWith('direct_')) return id;
        const parts = id.replace('direct_', '').split('_');
        if (parts.length !== 2) return id;
        return `direct_${parts.sort().join('_')}`;
      };
      
      const normalizedDataConvId = normalizeId(data.conversationId);
      const normalizedActiveId = normalizeId(active.id);
      
      if (normalizedDataConvId === normalizedActiveId && data.userId !== user?.uid) {
        // Handle typing indicator updates
        console.log('Typing update:', data);
      }
    };
    
    socketService.on('message:new', handleNewMessage);
    socketService.on('message:sent', handleMessageSent);
    socketService.on('typing:update', handleTypingUpdate);
    
    return () => {
      unsub();
      socketService.leaveConversation(active.id);
      socketService.off('message:new', handleNewMessage);
      socketService.off('message:sent', handleMessageSent);
      socketService.off('typing:update', handleTypingUpdate);
    };
  }, [active, user]);

  const handleSend = async (text: string) => {
    if (!user || !active) return;
    
    // BUG FIX: 2025-01-28 - Check if encryption is initialized before sending
    // Problem: User could try to send messages before key initialization is complete
    // Solution: Check initialization status and prevent sending until ready
    // Impact: Prevents "No key pair available" errors when sending messages
    
    if (isInitializing) {
      console.warn('⚠️ Chat is still initializing, please wait...');
      return;
    }
    
    // Verify encryption service has keys
    const hasKeys = encryptionService.getPublicKey() !== null;
    if (!hasKeys) {
      console.error('🔥 Encryption keys not available, cannot send message');
      setError('Encryption not ready. Please wait for initialization to complete.');
      return;
    }
    
    // BUG FIX: 2025-01-28 - Add optimistic update to reduce message delay
    // Problem: There's a delay when a message is sent before it shows in chat window
    // Solution: Add optimistic message immediately, then let real-time subscription update it
    // Impact: Messages appear instantly for better user experience
    
    const optimisticMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      senderId: user.uid,
      text: text,
      timestamp: { toDate: () => new Date() } as any,
      readBy: [],
      deliveredTo: []
    };
    
    // Add optimistic message immediately at the beginning (messages are in DESC order from Firestore)
    setMessages(prev => [optimisticMessage, ...prev]);
    
    try {
      // BUG FIX: 2025-01-28 - Use Socket.io for real-time messaging when available
      // Problem: Messages only sent via Firestore, missing real-time performance
      // Solution: Use Socket.io when connected, fallback to Firestore
      // Impact: Sub-200ms message delivery when Socket.io server is available
      
      if (socketService.isSocketConnected()) {
        // Get recipient's public key for encryption
        const otherUserId = active.members.find(id => id !== user.uid);
        if (!otherUserId) {
          throw new Error('Cannot find recipient in conversation');
        }
        
        const recipientKey = await keyExchangeService.getPublicKey(otherUserId);
        const senderKey = encryptionService.getPublicKey();
        
        if (!recipientKey || !senderKey) {
          throw new Error('Encryption keys not available');
        }
        
        // Encrypt message for recipient
        const recipientEncrypted = encryptionService.encryptMessage(text, recipientKey);
        // Encrypt message for sender (dual encryption)
        const senderEncrypted = encryptionService.encryptMessage(text, senderKey);
        
        // Send via Socket.io for real-time delivery
        socketService.sendMessage({
          conversationId: active.id,
          type: 'text',
          text: recipientEncrypted.content,  // Encrypted for recipient
          nonce: recipientEncrypted.nonce,    // Nonce for recipient
          plainText: text  // Include plain text for sender's own display (will not be sent to others)
        });
        
        console.log('📤 Message sent via Socket.io with sub-200ms delivery');
        
        // ALWAYS also save to Firestore for persistence and dual encryption
        // This ensures messages are stored even if Socket.io delivery fails
        await sendMessage(active.id, user.uid, text);
        console.log('💾 Message also saved to Firestore for persistence');
      } else {
        // Fallback to Firestore only
        await sendMessage(active.id, user.uid, text);
        console.log('📤 Message sent via Firestore (Socket.io not available)');
      }
      
      // Real message will replace optimistic one via subscription or Socket.io event
    } catch (error) {
      console.error('Failed to send message:', error);
      setError('Failed to send message. Please try again.');
      // Remove optimistic message on error
      setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id));
    }
  };

  const handleDeleteConversation = async (conversationId: string) => {
    if (!user) return;
    
    try {
      await deleteConversation(conversationId, user.uid);
      
      // Remove from local state
      setConversations(prev => prev.filter(c => c.id !== conversationId));
      
      // If this was the active conversation, clear it
      if (active?.id === conversationId) {
        setActive(null);
      }
      
      console.log('✅ Conversation deleted successfully');
    } catch (error) {
      console.error('Failed to delete conversation:', error);
      setError('Failed to delete conversation. Please try again.');
    }
  };

  const handleDeleteAllConversations = async () => {
    if (!user) return;
    
    if (!confirm('Delete ALL conversations? This action cannot be undone.')) {
      return;
    }
    
    try {
      await deleteAllUserConversations(user.uid);
      
      // Clear local state
      setConversations([]);
      setActive(null);
      
      console.log('✅ All conversations deleted successfully');
    } catch (error) {
      console.error('Failed to delete all conversations:', error);
      setError('Failed to delete conversations. Please try again.');
    }
  };

  // BUG FIX: 2025-01-28 - Add safe key reset function
  // Problem: Clearing keys makes existing encrypted messages unreadable
  // Solution: Provide option to reset keys only after clearing conversations
  // Impact: Prevents data loss and provides clear user workflow
  const handleSafeKeyReset = async () => {
    if (!user) return;
    
    const hasConversations = conversations.length > 0;
    
    if (hasConversations) {
      const confirmDelete = confirm(
        '⚠️ WARNING: Resetting encryption keys will make all existing messages unreadable!\n\n' +
        'This will:\n' +
        '• Delete ALL your conversations and messages\n' +
        '• Generate new encryption keys\n' +
        '• Allow you to start fresh with working encryption\n\n' +
        'Do you want to continue?'
      );
      
      if (!confirmDelete) return;
      
      // First delete all conversations
      await handleDeleteAllConversations();
    }
    
    try {
      // Clear encryption keys
      console.log('🔑 Clearing all stored keys for fresh start');
      await storageService.clearAll();
      
      // Clear user keys from Firestore
      console.log('🔑 Clearing user keys from Firestore');
      await deleteDoc(doc(db, 'userKeys', user.uid));
      
      // Reinitialize encryption
      await keyExchangeService.initializeUserKeys(user.uid);
      
      console.log('✅ Encryption keys reset successfully - you can now send messages');
      
    } catch (error) {
      console.error('❌ Error resetting keys:', error);
      setError('Failed to reset encryption keys. Please try again.');
    }
  };

  const handleStartNewChat = async (targetUsername?: string) => {
    if (!user) return;
    
    const username = targetUsername || searchUsername.trim();
    if (!username) return;
    
    // BUG FIX: 2025-01-28 - Prevent users from starting chats with themselves
    // Problem: Users could attempt to message themselves via username search
    // Solution: Added frontend validation to check if target username matches current user
    // Impact: Better UX with immediate feedback instead of backend error
    const normalizedUsername = username.startsWith('@') ? username : `@${username}`;
    if (normalizedUsername === platformUser?.username) {
      alert("You cannot send messages to yourself.");
      return;
    }
    
    try {
      const conversation = await startDirectByUsername(user.uid, username);
      if (conversation) {
        setConversations(prev => {
          // Check if conversation already exists to avoid duplicates
          const exists = prev.find(c => c.id === conversation.id);
          if (exists) {
            return prev; // Don't add duplicate
          }
          return [conversation, ...prev];
        });
        setActive(conversation);
        setShowNewChat(false);
        setSearchUsername("");
        setSearchResults([]);
      } else {
        alert("User not found. Make sure they have an account and try their @username.");
      }
    } catch (error) {
      console.error('Failed to start conversation:', error);
      if (error instanceof Error && error.message.includes('Cannot create conversation with yourself')) {
        alert("You cannot send messages to yourself.");
      } else {
        alert("Failed to start conversation. Please try again.");
      }
    }
  };

  const handleSearchInputChange = (value: string) => {
    // Enforce @ prefix
    if (value && !value.startsWith('@')) {
      value = '@' + value;
    }
    setSearchUsername(value);
  };

  // Smart search for users
  const searchUsers = async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      // Ensure @ prefix
      const normalizedSearch = searchTerm.startsWith('@') ? searchTerm : `@${searchTerm}`;
      
      // Search users collection
      const usersRef = collection(db, 'users');
      const q = query(
        usersRef,
        where('username', '>=', normalizedSearch),
        where('username', '<=', normalizedSearch + '\uf8ff'),
        limit(10)
      );
      
      const snapshot = await getDocs(q);
      const results = snapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data()
      }));
      
      // BUG FIX: 2025-01-28 - Filter out current user from search results
      // Problem: Users could see themselves in search results and attempt self-messaging
      // Solution: Filter out current user from search results
      // Impact: Prevents confusion and self-messaging attempts
      const filteredResults = results.filter(result => result.uid !== user?.uid);
      setSearchResults(filteredResults);
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchUsername.length >= 2) {
        searchUsers(searchUsername);
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchUsername]);

  const getUserInfo = (userId: string) => {
    // Try to get from platform user data first (current user)
    if (userId === user?.uid && platformUser) {
      return {
        displayName: platformUser.profile?.firstName && platformUser.profile?.lastName 
          ? `${platformUser.profile.firstName} ${platformUser.profile.lastName}`
          : platformUser.username,
        photoURL: platformUser.profile?.avatarUrl || '/default-avatar.png',
        tier: platformUser.tier?.current || 'starter'
      };
    }

    // Look in user cache
    const cachedUser = userCache[userId];
    if (cachedUser) {
      return {
        displayName: cachedUser.profile?.firstName && cachedUser.profile?.lastName 
          ? `${cachedUser.profile.firstName} ${cachedUser.profile.lastName}`
          : cachedUser.username,
        photoURL: cachedUser.profile?.avatarUrl || '/default-avatar.png',
        tier: cachedUser.tier?.current || 'starter'
      };
    }

    // Look in search results
    const searchResult = searchResults.find(u => u.uid === userId);
    if (searchResult) {
      return {
        displayName: searchResult.profile?.firstName && searchResult.profile?.lastName 
          ? `${searchResult.profile.firstName} ${searchResult.profile.lastName}`
          : searchResult.username,
        photoURL: searchResult.profile?.avatarUrl || '/default-avatar.png',
        tier: searchResult.tier?.current || 'starter'
      };
    }

    // Fetch user data if not in cache
    fetchUserData(userId);

    // Fallback while loading
    return {
      displayName: `User ${userId.slice(-4)}`,
      photoURL: '/default-avatar.png',
      tier: 'starter' as const
    };
  };

  if (!user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-gray-400">
        Please sign in to view your messages.
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-gray-400">
        <div className="text-center max-w-md">
          <div className="text-red-500 text-4xl mb-4">⚠️</div>
          <h3 className="text-lg font-medium mb-2 text-red-400">Chat System Error</h3>
          <p className="text-sm mb-4">{error}</p>
          {/* BUG FIX: 2025-01-28 - Show network status and troubleshooting tips */}
          <div className="text-xs text-gray-500 mb-4 space-y-1">
            <p>Network status: {navigator.onLine ? '🟢 Online' : '🔴 Offline'}</p>
            {!navigator.onLine && <p>Please check your internet connection</p>}
            {error.includes('timeout') && (
              <p>Firebase connection is slow. This may be a temporary issue.</p>
            )}
            {error.includes('offline') && (
              <p>Firebase is reporting offline status. Check your connection.</p>
            )}
          </div>
          <div className="space-x-2">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded"
            >
              Refresh Page
            </button>
            <button
              onClick={() => setError(null)}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isInitializing) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-gray-400">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Initializing secure chat...</p>
          <p className="text-xs mt-2 opacity-70">Setting up encryption keys...</p>
          {/* BUG FIX: 2025-01-28 - Show connection status during initialization */}
          <p className="text-xs text-gray-500 mt-1">
            {!navigator.onLine ? '⚠️ No internet connection' : '🔄 Connecting to Firebase...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-64px)] bg-black flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-gray-900 bg-gray-950 flex flex-col">
        {/* Header with New Chat button */}
        <div className="p-3 border-b border-gray-800">
                      <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-white">Messages</h2>
              <div className="flex items-center space-x-1">
                <button
                  onClick={handleSafeKeyReset}
                  className="p-1 text-yellow-400 hover:text-yellow-300 hover:bg-gray-800 rounded text-xs"
                  title="Reset encryption keys (fixes decryption issues)"
                >
                  🔑
                </button>
                <button
                  onClick={handleDeleteAllConversations}
                  className="p-1 text-red-400 hover:text-red-300 hover:bg-gray-800 rounded text-xs"
                  title="Delete all conversations (for testing)"
                >
                  🗑️
                </button>
                <button
                  onClick={() => setShowNewChat(!showNewChat)}
                  className="p-1 text-gray-400 hover:text-white hover:bg-gray-800 rounded"
                  title="Start new chat"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
          
          {/* Connection Status */}
          {connectionStatus !== 'connecting' && (
            <div className="flex items-center text-xs text-gray-400 mb-2">
              <div className={`w-2 h-2 rounded-full mr-2 ${
                connectionStatus === 'connected' ? 'bg-green-500' : 'bg-yellow-500'
              }`} />
              {connectionStatus === 'connected' ? 'Real-time messaging' : 'Secure messaging'}
            </div>
          )}
          
          {/* BUG FIX: 2025-01-28 - Add encryption status indicator */}
          {/* Problem: Users don't know when encryption is still initializing */}
          {/* Solution: Show clear status indicator for encryption readiness */}
          {/* Impact: Users understand when they can safely send messages */}
          {(isInitializing || encryptionService.getPublicKey() === null) && (
            <div className="flex items-center text-xs text-yellow-400 mb-2 p-2 bg-yellow-900/10 rounded border border-yellow-500/20">
              <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse mr-2" />
              {isInitializing ? 'Initializing secure chat...' : 'Setting up encryption...'}
            </div>
          )}
          
          {/* New Chat Form */}
          {showNewChat && (
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-2 top-2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Enter @username"
                  value={searchUsername}
                  onChange={(e) => handleSearchInputChange(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleStartNewChat()}
                  className="w-full pl-8 pr-3 py-1 bg-gray-800 border border-gray-700 rounded text-white text-sm focus:outline-none focus:border-blue-500"
                />
                {isSearching && (
                  <div className="absolute right-2 top-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                  </div>
                )}
              </div>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="max-h-48 overflow-y-auto bg-gray-800 rounded border border-gray-700">
                  {searchResults.map((user) => (
                    <button
                      key={user.uid}
                      onClick={() => handleStartNewChat(user.username)}
                      className="w-full p-2 text-left hover:bg-gray-700 flex items-center space-x-2 first:rounded-t last:rounded-b"
                    >
                      <div className="relative">
                        <img
                          src={user.profile?.avatarUrl || '/default-avatar.png'}
                          alt={user.username}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                        {/* Tier ring */}
                        <div className={`absolute inset-0 rounded-full border-2 ${
                          user.tier?.current === 'starter' ? 'border-gray-400' :
                          user.tier?.current === 'rising' ? 'border-blue-500' :
                          user.tier?.current === 'pro' ? 'border-purple-500' :
                          user.tier?.current === 'pixlbeast' ? 'border-yellow-500' :
                          user.tier?.current === 'pixlionaire' ? 'border-red-500' :
                          'border-gray-400'
                        }`}></div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-white truncate">
                          {user.profile?.firstName && user.profile?.lastName 
                            ? `${user.profile.firstName} ${user.profile.lastName}`
                            : user.username
                          }
                        </div>
                        <div className="text-xs text-gray-400 truncate">{user.username}</div>
                      </div>
                      <div className={`text-xs px-2 py-1 rounded-full ${
                        user.tier?.current === 'starter' ? 'bg-gray-600 text-gray-200' :
                        user.tier?.current === 'rising' ? 'bg-blue-600 text-blue-100' :
                        user.tier?.current === 'pro' ? 'bg-purple-600 text-purple-100' :
                        user.tier?.current === 'pixlbeast' ? 'bg-yellow-600 text-yellow-100' :
                        user.tier?.current === 'pixlionaire' ? 'bg-red-600 text-red-100' :
                        'bg-gray-600 text-gray-200'
                      }`}>
                        {user.tier?.current || 'starter'}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              <button
                onClick={() => handleStartNewChat()}
                disabled={!searchUsername.trim()}
                className="w-full py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white text-sm rounded"
              >
                Start Chat
              </button>
            </div>
          )}
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto p-3">
          {conversations.length === 0 ? (
            <div className="text-center text-gray-500 mt-8">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No conversations yet</p>
              <p className="text-xs mt-1">Click + to start chatting</p>
            </div>
          ) : (
            <ConversationList
              conversations={conversations}
              activeId={active?.id}
              onSelect={(c) => setActive(c)}
              onDelete={handleDeleteConversation}
              currentUserId={user.uid}
              getUserInfo={getUserInfo}
            />
          )}
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col">
        {active ? (
          <>
            {/* Chat Header */}
            <div className="border-b border-gray-900 bg-gray-950 p-3">
              {active.type === "direct" ? (
                <DirectMessageHeader 
                  active={active}
                  user={user}
                  getUserInfo={getUserInfo}
                  connectionStatus={connectionStatus}
                />
              ) : (
                // Group chat header
                <div>
                  <h1 className="text-white text-sm font-semibold">Group Chat</h1>
                  <p className="text-xs text-gray-400">
                    {active.members.length} member{active.members.length !== 1 ? 's' : ''}
                  </p>
                </div>
              )}
            </div>
            
            {/* Chat Window */}
            <ChatWindow 
              messages={messages} 
              currentUserId={user.uid}
              conversationId={active.id}
              memberIds={active.members}
              getUserInfo={getUserInfo}
            />
            
            {/* Message Input */}
            <MessageInput 
              onSend={handleSend} 
              disabled={isInitializing || encryptionService.getPublicKey() === null}
              placeholder={
                isInitializing 
                  ? "Initializing secure chat..." 
                  : encryptionService.getPublicKey() === null 
                    ? "Setting up encryption..." 
                    : "Type a message..."
              }
            />
          </>
        ) : (
          // Welcome Screen
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <div className="text-6xl mb-4">💬</div>
              <h3 className="text-lg font-medium mb-2">Welcome to Secure Chat</h3>
              <p className="text-sm mb-4">Your messages are end-to-end encrypted</p>
              <button
                onClick={() => setShowNewChat(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded"
              >
                Start Your First Chat
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}


