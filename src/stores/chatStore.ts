/**
 * Zustand Chat Store - Central state management for chat system
 * As specified in chat-architecture.mdc
 */

import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { enableMapSet } from 'immer';
import { Socket } from 'socket.io-client';
import { EncryptionService } from '@/services/chat/encryption.service';
import { Timestamp, doc, updateDoc, arrayUnion, arrayRemove, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase-config';

// Enable MapSet support for Immer to work with Maps and Sets
enableMapSet();

// Types
export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  type: 'text' | 'image' | 'file' | 'voice';
  content: string; // Always encrypted
  decryptedContent?: string; // Decrypted on client
  nonce: string;
  timestamp: Timestamp;
  delivered: string[];
  read: string[];
  replyTo?: string;
  reactions?: { [emoji: string]: string[] }; // emoji -> userIds
  metadata?: {
    fileName?: string;
    fileSize?: number;
    mimeType?: string;
    duration?: number; // For voice notes
    edited?: boolean;
    editedAt?: Timestamp;
  };
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
}

export interface Conversation {
  id: string;
  type: 'direct' | 'group';
  members: string[];
  memberDetails: Map<string, {
    uid: string;
    displayName: string;
    photoURL: string;
    tier: 'Starter' | 'Rising' | 'Pro' | 'Pixlbeast' | 'Pixlionaire';
    publicKey: string;
    lastSeen?: Timestamp;
    isOnline?: boolean;
  }>;
  lastMessage?: {
    text: string; // Encrypted preview
    senderId: string;
    timestamp: Timestamp;
  };
  groupInfo?: {
    name: string;
    description: string;
    photoURL: string;
    admins: string[];
  };
  unreadCount?: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface TypingUser {
  userId: string;
  conversationId: string;
  startedAt: number;
}

export interface ChatState {
  // Core data
  conversations: Map<string, Conversation>;
  messages: Map<string, Message[]>; // conversationId -> messages
  activeConversationId: string | null;
  userId?: string; // Current user ID
  
  // Real-time states
  typing: Map<string, string[]>; // conversationId -> userIds typing
  presence: Map<string, boolean>; // userId -> online status
  lastSeen: Map<string, Date>; // userId -> last seen time
  
  // Offline queue
  offlineQueue: Message[];
  
  // Connection states
  socket: Socket | null;
  isConnected: boolean;
  connectionError: string | null;
  
  // Services
  encryption: EncryptionService | null;
  
  // UI states
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  selectedMessageIds: Set<string>;
  replyingTo: Message | null;
  
  // Pagination
  hasMore: Map<string, boolean>; // conversationId -> hasMore
  loadingMore: Map<string, boolean>; // conversationId -> loading
  
  // Actions - Conversations
  setActiveConversation: (id: string | null) => void;
  loadConversations: () => Promise<void>;
  createConversation: (members: string[], type: 'direct' | 'group', groupInfo?: any) => Promise<string>;
  deleteConversation: (id: string) => void;
  markConversationAsRead: (conversationId: string) => void;
  
  // Actions - Messages
  sendMessage: (content: string, type: Message['type'], metadata?: any) => Promise<void>;
  loadMessages: (conversationId: string, pagination?: { limit: number; before?: string }) => Promise<void>;
  loadMoreMessages: (conversationId: string) => Promise<void>;
  deleteMessage: (messageId: string) => void;
  editMessage: (messageId: string, newContent: string) => void;
  addReaction: (messageId: string, emoji: string) => Promise<void>;
  removeReaction: (messageId: string, emoji: string) => Promise<void>;
  setReplyingTo: (message: Message | null) => void;
  
  // Actions - Real-time
  updateTyping: (conversationId: string, isTyping: boolean) => void;
  setTypingUser: (conversationId: string, userId: string, isTyping: boolean) => void;
  updatePresence: (userId: string, isOnline: boolean, lastSeen?: Date) => void;
  markAsDelivered: (messageId: string, userId: string) => void;
  markAsRead: (messageIds: string[], userId: string) => void;
  
  // Actions - Socket
  initializeSocket: (socket: Socket) => void;
  setConnectionStatus: (isConnected: boolean, error?: string) => void;
  
  // Actions - Encryption
  initializeEncryption: (userId: string) => Promise<void>;
  
  // Actions - Offline
  addToOfflineQueue: (message: Message) => void;
  processOfflineQueue: () => Promise<void>;
  
  // Actions - Search
  searchMessages: (query: string) => Promise<Message[]>;
  setSearchQuery: (query: string) => void;
  
  // Actions - UI
  selectMessage: (messageId: string) => void;
  unselectMessage: (messageId: string) => void;
  clearSelection: () => void;
  setError: (error: string | null) => void;
  setLoading: (isLoading: boolean) => void;
  
  // Actions - Cleanup
  reset: () => void;
}

// Create store with middleware
export const useChatStore = create<ChatState>()(
  devtools(
    subscribeWithSelector(
      immer((set, get) => ({
        // Initial state
        conversations: new Map(),
        messages: new Map(),
        activeConversationId: null,
        userId: undefined,
        typing: new Map(),
        presence: new Map(),
        lastSeen: new Map(),
        offlineQueue: [],
        socket: null,
        isConnected: false,
        connectionError: null,
        encryption: null,
        isLoading: false,
        error: null,
        searchQuery: '',
        selectedMessageIds: new Set(),
        replyingTo: null,
        hasMore: new Map(),
        loadingMore: new Map(),

        // Conversation actions
        setActiveConversation: (id) => set((state) => {
          // Leave previous conversation room if exists
          const previousId = state.activeConversationId;
          const socketService = (window as any).socketService;
          
          if (socketService && previousId && previousId !== id) {
            socketService.leaveConversation(previousId);
          }
          
          state.activeConversationId = id;
          
          if (id) {
            state.markConversationAsRead(id);
            
            // Join new conversation room to receive typing events
            if (socketService) {
              console.log(`🚪 Joining conversation room: ${id}`);
              socketService.joinConversation(id);
            } else {
              console.warn('⚠️ SocketService not available to join conversation');
            }
          }
        }),

        loadConversations: async () => {
          set((state) => {
            state.isLoading = true;
            state.error = null;
          });
          
          try {
            // Import service functions directly
            const { listUserConversations } = await import('@/services/chat/firestore-chat.service');
            // Get current user ID from auth context or store
            const userId = get().userId || get().socket?.data?.userId || 'current-user'; // This should be from auth
            const conversations = await listUserConversations(userId);
            
            set((state) => {
              state.conversations = new Map(conversations.map(c => [c.id, c as any]));
              state.isLoading = false;
            });
          } catch (error: any) {
            set((state) => {
              state.error = error.message;
              state.isLoading = false;
            });
          }
        },

        createConversation: async (members, type, groupInfo) => {
          const { createGroupConversation, createOrGetDirectConversation } = await import('@/services/chat/firestore-chat.service');
          
          let conversationId: string;
          
          if (type === 'group' && groupInfo) {
            const conversation = await createGroupConversation(
              members,
              {
                name: groupInfo.name,
                description: groupInfo.description || '',
                createdBy: members[0] // First member as creator
              }
            );
            conversationId = conversation.id;
          } else {
            // Direct conversation between two users
            const conversation = await createOrGetDirectConversation(
              members[0],
              members[1]
            );
            conversationId = conversation.id;
          }
          
          await get().loadConversations();
          
          return conversationId;
        },

        deleteConversation: (id) => set((state) => {
          state.conversations.delete(id);
          state.messages.delete(id);
          if (state.activeConversationId === id) {
            state.activeConversationId = null;
          }
        }),

        markConversationAsRead: (conversationId) => set((state) => {
          const conversation = state.conversations.get(conversationId);
          if (conversation) {
            conversation.unreadCount = 0;
          }
        }),

        // Message actions
        sendMessage: async (content, type, metadata) => {
          const state = get();
          const conversationId = state.activeConversationId;
          
          console.log('💬 sendMessage called');
          console.log('💬 Active conversation ID:', conversationId);
          console.log('💬 User ID:', state.userId);
          
          if (!conversationId) {
            console.error('❌ No active conversation ID in store');
            throw new Error('No active conversation selected');
          }

          // Encrypt message if encryption is available
          let encryptedContent = content;
          let nonce = '';
          
          if (state.encryption) {
            const conversation = state.conversations.get(conversationId);
            const recipientKeys = Array.from(conversation?.memberDetails?.values() || [])
              .map(m => m.publicKey)
              .filter(Boolean);
            
            if (recipientKeys.length > 0) {
              const encrypted = await state.encryption.encryptMessage(content, recipientKeys[0]);
              encryptedContent = encrypted.content;
              nonce = encrypted.nonce;
            }
          }

          // Get reply ID before clearing
          const replyToId = state.replyingTo?.id;
          
          // Clear reply state immediately
          set((state) => {
            state.replyingTo = null;
          });

          // Send via socket if available, otherwise use Firestore
          if (state.socket && state.isConnected) {
            state.socket.emit('message:send', {
              conversationId,
              type,
              content: encryptedContent,
              nonce,
              replyTo: replyToId,
              metadata
            });
          } else {
            // Use Firestore as fallback
            const { sendMessage: sendFirestoreMessage } = await import('@/services/chat/firestore-chat.service');
            const userId = state.userId;
            
            if (!userId) {
              throw new Error('User ID not set in store');
            }
            
            // Pass the full message data including type and metadata
            await sendFirestoreMessage(conversationId, userId, content, {
              type: type || 'text',
              metadata: metadata || {},
              nonce: nonce
            });
          }
        },

        loadMessages: async (conversationId, pagination) => {
          set((state) => {
            state.loadingMore.set(conversationId, true);
          });

          try {
            const { subscribeMessages } = await import('@/services/chat/firestore-chat.service');
            
            // Subscribe to messages and update state when they arrive
            const unsubscribe = subscribeMessages(conversationId, (firestoreMessages) => {
              console.log('Received messages from Firestore:', firestoreMessages);
              
              // Convert Firestore messages to our Message type
              const messages: Message[] = firestoreMessages.map(msg => {
                console.log(`📦 Processing message ${msg.id}:`, {
                  reactions: (msg as any).reactions,
                  deliveredTo: (msg as any).deliveredTo,
                  readBy: (msg as any).readBy
                });
                return {
                  id: msg.id,
                  conversationId,
                  senderId: msg.senderId,
                  type: (msg as any).type || 'text' as const,
                  content: msg.encryptedContent || msg.text,
                  decryptedContent: msg.text, // Already decrypted by subscribeMessages
                  nonce: msg.nonce || '',
                  timestamp: msg.timestamp,
                  delivered: (msg as any).deliveredTo || [],
                  read: (msg as any).readBy || [],
                  reactions: (msg as any).reactions || {},
                  status: 'sent' as const,
                  metadata: (msg as any).metadata || {}
                };
              });
              
              set((state) => {
                // Simply replace all messages - no temp message handling needed
                // since Firestore subscription gives us all messages
                state.messages.set(conversationId, messages);
                state.hasMore.set(conversationId, messages.length === (pagination?.limit || 50));
                state.loadingMore.set(conversationId, false);
                
                // Update unread count for this conversation
                const conversation = state.conversations.get(conversationId);
                if (conversation) {
                  const userId = state.userId || state.socket?.data?.userId || 'current-user';
                  const unreadCount = messages.filter(
                    m => m.senderId !== userId && !m.read.includes(userId)
                  ).length;
                  
                  conversation.unreadCount = unreadCount;
                }
              });
            });
            
            // Store unsubscribe function for cleanup
            set((state) => {
              // Create a map to store unsubscribe functions if it doesn't exist
              if (!(state as any).messageUnsubscribers) {
                (state as any).messageUnsubscribers = new Map();
              }
              
              // Clean up previous subscription if exists
              const existingUnsubscribe = (state as any).messageUnsubscribers.get(conversationId);
              if (existingUnsubscribe) {
                existingUnsubscribe();
              }
              
              // Store new unsubscribe function
              (state as any).messageUnsubscribers.set(conversationId, unsubscribe);
            });
          } catch (error: any) {
            set((state) => {
              state.error = error.message;
              state.loadingMore.set(conversationId, false);
            });
          }
        },

        loadMoreMessages: async (conversationId) => {
          const state = get();
          const messages = state.messages.get(conversationId) || [];
          if (messages.length === 0) return;
          
          const oldestMessage = messages[0];
          await state.loadMessages(conversationId, {
            limit: 50,
            before: oldestMessage.id
          });
        },

        deleteMessage: (messageId) => set((state) => {
          for (const [convId, messages] of state.messages) {
            const filtered = messages.filter(m => m.id !== messageId);
            if (filtered.length !== messages.length) {
              state.messages.set(convId, filtered);
              break;
            }
          }
        }),

        editMessage: (messageId, newContent) => set((state) => {
          for (const [convId, messages] of state.messages) {
            const messageIndex = messages.findIndex(m => m.id === messageId);
            if (messageIndex !== -1) {
              messages[messageIndex].decryptedContent = newContent;
              messages[messageIndex].metadata = {
                ...messages[messageIndex].metadata,
                edited: true,
                editedAt: Timestamp.now()
              };
              break;
            }
          }
        }),

        addReaction: async (messageId, emoji) => {
          const state = get();
          const userId = state.userId;
          const activeConvId = state.activeConversationId;
          
          if (!userId) {
            console.error('No userId set - cannot add reaction');
            return;
          }
          
          console.log('Adding reaction:', { messageId, emoji, userId, activeConvId });
          
          // Update local state optimistically
          set((state) => {
            for (const [convId, messages] of state.messages) {
              const message = messages.find(m => m.id === messageId);
              if (message) {
                console.log('🔍 Found message for reaction update:', message.id);
                console.log('🔍 Current reactions before update:', JSON.stringify(message.reactions));
                
                if (!message.reactions) {
                  message.reactions = {};
                }
                
                // Remove user from all other reactions first (only one reaction per user)
                Object.keys(message.reactions).forEach(existingEmoji => {
                  if (existingEmoji !== emoji) {
                    const users = message.reactions![existingEmoji] || [];
                    const index = users.indexOf(userId);
                    if (index > -1) {
                      users.splice(index, 1);
                      if (users.length === 0) {
                        delete message.reactions![existingEmoji];
                      } else {
                        message.reactions![existingEmoji] = users;
                      }
                    }
                  }
                });
                
                // Add user to the new reaction
                const users = message.reactions[emoji] || [];
                if (!users.includes(userId)) {
                  users.push(userId);
                  message.reactions[emoji] = users;
                }
                
                console.log('🔍 Reactions after update:', JSON.stringify(message.reactions));
                break;
              }
            }
          });
          
          // Update Firebase - Simplified approach
          if (activeConvId) {
            try {
              const messageRef = doc(db, 'conversations', activeConvId, 'messages', messageId);
              
              // Get current message document
              const messageDoc = await getDoc(messageRef);
              if (!messageDoc.exists()) {
                console.error('Message not found in Firebase');
                return;
              }
              
              const data = messageDoc.data();
              let reactions = data.reactions || {};
              
              console.log('📥 Current reactions from Firebase:', JSON.stringify(reactions));
              
              // Remove user from ALL reactions first (one reaction per user)
              Object.keys(reactions).forEach(emojiKey => {
                if (Array.isArray(reactions[emojiKey])) {
                  reactions[emojiKey] = reactions[emojiKey].filter((u: string) => u !== userId);
                  // Clean up empty arrays
                  if (reactions[emojiKey].length === 0) {
                    delete reactions[emojiKey];
                  }
                }
              });
              
              // Add user to the new reaction
              if (!reactions[emoji]) {
                reactions[emoji] = [];
              }
              reactions[emoji].push(userId);
              
              console.log('📤 Updating Firebase with reactions:', JSON.stringify(reactions));
              
              // Update the entire reactions field
              try {
                // First ensure the document exists and has the reactions field
                const currentDoc = await getDoc(messageRef);
                if (!currentDoc.exists()) {
                  console.error('Message document does not exist');
                  return;
                }
                
                // Use updateDoc to specifically update the reactions field
                await updateDoc(messageRef, {
                  'reactions': reactions
                });
                
                console.log('✅ Reaction added to Firebase successfully');
                
                // Optional: Verify the update worked by reading back
                if (process.env.NODE_ENV === 'development') {
                  const verifyDoc = await getDoc(messageRef);
                  const verifyData = verifyDoc.data();
                  console.log('🔍 Verification - reactions after update:', verifyData?.reactions);
                }
              } catch (updateError) {
                console.error('❌ Failed to update reactions:', updateError);
                throw updateError;
              }
            } catch (error: any) {
              console.error('❌ Failed to add reaction to Firebase:', error);
              console.error('Error details:', {
                code: error.code,
                message: error.message,
                messageId,
                emoji,
                userId
              });
            }
          }
        },

        removeReaction: async (messageId, emoji) => {
          const state = get();
          const userId = state.userId;
          const activeConvId = state.activeConversationId;
          
          if (!userId) {
            console.error('No userId set - cannot remove reaction');
            return;
          }
          
          console.log('Removing reaction:', { messageId, emoji, userId, activeConvId });
          
          // Update local state optimistically
          set((state) => {
            for (const [convId, messages] of state.messages) {
              const message = messages.find(m => m.id === messageId);
              if (message && message.reactions) {
                const users = message.reactions[emoji] || [];
                const filtered = users.filter(u => u !== userId);
                if (filtered.length > 0) {
                  message.reactions[emoji] = filtered;
                } else {
                  delete message.reactions[emoji];
                }
                break;
              }
            }
          });
          
          // Update Firebase
          if (activeConvId) {
            try {
              const messageRef = doc(db, 'conversations', activeConvId, 'messages', messageId);
              
              // Get current reactions
              const messageDoc = await getDoc(messageRef);
              if (!messageDoc.exists()) {
                console.error('Message not found in Firebase');
                return;
              }
              
              const data = messageDoc.data();
              let reactions = data.reactions || {};
              
              // Remove user from the specified emoji
              if (reactions[emoji] && Array.isArray(reactions[emoji])) {
                reactions[emoji] = reactions[emoji].filter((u: string) => u !== userId);
                // Remove emoji entirely if no users left
                if (reactions[emoji].length === 0) {
                  delete reactions[emoji];
                }
              }
              
              // Ensure reactions is at least an empty object
              if (Object.keys(reactions).length === 0) {
                reactions = {};
              }
              
              // Update with the complete reactions object using merge
              await setDoc(messageRef, {
                reactions: reactions
              }, { merge: true });
              console.log('Reaction removed from Firebase successfully');
            } catch (error) {
              console.error('Failed to remove reaction from Firebase:', error);
            }
          }
        },

        setReplyingTo: (message) => set((state) => {
          state.replyingTo = message;
        }),

        // Real-time actions
        updateTyping: (conversationId, isTyping) => {
          // Use the SocketService to send typing indicators
          // This ensures proper formatting and normalization
          const socketService = (window as any).socketService;
          if (socketService) {
            socketService.sendTyping(conversationId, isTyping);
          }
        },
        
        setTypingUser: (conversationId, userId, isTyping) => set((state) => {
          const typingUsers = state.typing.get(conversationId) || [];
          
          if (isTyping) {
            // Add user to typing list if not already there
            if (!typingUsers.includes(userId)) {
              state.typing.set(conversationId, [...typingUsers, userId]);
            }
          } else {
            // Remove user from typing list
            state.typing.set(conversationId, typingUsers.filter(id => id !== userId));
          }
        }),

        updatePresence: (userId, isOnline, lastSeen) => set((state) => {
          state.presence.set(userId, isOnline);
          if (lastSeen) {
            state.lastSeen.set(userId, lastSeen);
          }
        }),

        markAsDelivered: async (messageId, userId) => {
          const state = get();
          console.log(`📮 Marking message ${messageId} as delivered to ${userId}`);
          
          // Update local state
          set((state) => {
            for (const [convId, messages] of state.messages) {
              const message = messages.find(m => m.id === messageId);
              if (message && !message.delivered.includes(userId)) {
                message.delivered.push(userId);
                message.status = 'delivered';
                console.log(`✅ Local state updated - message delivered to ${userId}`);
                break;
              }
            }
          });
          
          // Update Firebase
          const activeConvId = state.activeConversationId;
          if (activeConvId) {
            try {
              const messageRef = doc(db, 'conversations', activeConvId, 'messages', messageId);
              const messageDoc = await getDoc(messageRef);
              
              if (messageDoc.exists()) {
                const data = messageDoc.data();
                const deliveredTo = data.deliveredTo || [];
                
                if (!deliveredTo.includes(userId)) {
                  deliveredTo.push(userId);
                  await updateDoc(messageRef, {
                    deliveredTo: deliveredTo
                  });
                }
              }
            } catch (error) {
              console.error('Failed to update delivered status in Firebase:', error);
            }
          }
        },

        markAsRead: async (messageIds, userId) => {
          const state = get();
          
          // Update local state
          set((state) => {
            for (const [convId, messages] of state.messages) {
              messages.forEach(message => {
                if (messageIds.includes(message.id) && !message.read.includes(userId)) {
                  message.read.push(userId);
                  message.status = 'read';
                }
              });
            }
          });
          
          // Update Firebase for each message
          const activeConvId = state.activeConversationId;
          if (activeConvId) {
            for (const messageId of messageIds) {
              try {
                const messageRef = doc(db, 'conversations', activeConvId, 'messages', messageId);
                const messageDoc = await getDoc(messageRef);
                
                if (messageDoc.exists()) {
                  const data = messageDoc.data();
                  const readBy = data.readBy || [];
                  const deliveredTo = data.deliveredTo || [];
                  
                  // Update both readBy and deliveredTo
                  if (!readBy.includes(userId)) {
                    readBy.push(userId);
                  }
                  if (!deliveredTo.includes(userId)) {
                    deliveredTo.push(userId);
                  }
                  
                  await updateDoc(messageRef, {
                    readBy: readBy,
                    deliveredTo: deliveredTo
                  });
                  
                  console.log(`✅ Marked message ${messageId} as read by ${userId}`);
                }
              } catch (error) {
                console.error(`Failed to update read status for message ${messageId}:`, error);
              }
            }
          }
        },

        // Socket actions
        initializeSocket: (socket) => set((state) => {
          state.socket = socket;
          state.isConnected = true;
          state.connectionError = null;
        }),

        setConnectionStatus: (isConnected, error) => set((state) => {
          state.isConnected = isConnected;
          state.connectionError = error || null;
          
          // Process offline queue when reconnected
          if (isConnected && state.offlineQueue.length > 0) {
            state.processOfflineQueue();
          }
        }),

        // Encryption actions
        initializeEncryption: async (userId?: string) => {
          if (!userId) {
            console.error('No userId provided for encryption initialization');
            return;
          }
          
          const { EncryptionService } = await import('@/services/chat/encryption.service');
          const encryption = EncryptionService.getInstance();
          
          // Generate or load key pair
          const { storageService } = await import('@/services/chat/storage.service');
          let keyPair = await storageService.getKeyPair(userId);
          
          if (!keyPair) {
            keyPair = encryption.generateKeyPair();
            await storageService.saveKeyPair(keyPair, userId);
          } else {
            encryption.setKeyPair(keyPair);
          }
          
          set((state) => {
            state.encryption = encryption;
          });
        },

        // Offline queue actions
        addToOfflineQueue: (message) => set((state) => {
          state.offlineQueue.push(message);
        }),

        processOfflineQueue: async () => {
          const state = get();
          const queue = [...state.offlineQueue];
          
          set((state) => {
            state.offlineQueue = [];
          });

          for (const message of queue) {
            await state.sendMessage(
              message.decryptedContent || message.content,
              message.type,
              message.metadata
            );
          }
        },

        // Search actions
        searchMessages: async (query) => {
          const state = get();
          const allMessages: Message[] = [];
          
          // Search through all decrypted messages
          for (const messages of state.messages.values()) {
            const matches = messages.filter(m => 
              m.decryptedContent?.toLowerCase().includes(query.toLowerCase())
            );
            allMessages.push(...matches);
          }
          
          return allMessages;
        },

        setSearchQuery: (query) => set((state) => {
          state.searchQuery = query;
        }),

        // UI actions
        selectMessage: (messageId) => set((state) => {
          state.selectedMessageIds.add(messageId);
        }),

        unselectMessage: (messageId) => set((state) => {
          state.selectedMessageIds.delete(messageId);
        }),

        clearSelection: () => set((state) => {
          state.selectedMessageIds.clear();
        }),

        setError: (error) => set((state) => {
          state.error = error;
        }),

        setLoading: (isLoading) => set((state) => {
          state.isLoading = isLoading;
        }),

        // Cleanup
        reset: () => set((state) => {
          // Clean up message subscriptions
          if ((state as any).messageUnsubscribers instanceof Map) {
            for (const unsubscribe of (state as any).messageUnsubscribers.values()) {
              unsubscribe();
            }
            (state as any).messageUnsubscribers.clear();
          }
          
          // Clear Maps properly
          if (state.conversations instanceof Map) {
            state.conversations.clear();
          }
          if (state.messages instanceof Map) {
            state.messages.clear();
          }
          if (state.typing instanceof Map) {
            state.typing.clear();
          }
          if (state.presence instanceof Map) {
            state.presence.clear();
          }
          if (state.lastSeen instanceof Map) {
            state.lastSeen.clear();
          }
          if (state.selectedMessageIds instanceof Set) {
            state.selectedMessageIds.clear();
          }
          
          state.activeConversationId = null;
          state.offlineQueue = [];
          state.socket?.disconnect();
          state.socket = null;
          state.isConnected = false;
          state.connectionError = null;
          state.error = null;
          state.searchQuery = '';
          state.replyingTo = null;
        })
      }))
    ),
    {
      name: 'chat-store'
    }
  )
);

// Selectors for common use cases
export const selectActiveConversation = (state: ChatState) => 
  state.activeConversationId ? state.conversations.get(state.activeConversationId) : null;

export const selectActiveMessages = (state: ChatState) =>
  state.activeConversationId ? state.messages.get(state.activeConversationId) || [] : [];

export const selectTypingUsers = (state: ChatState) =>
  state.activeConversationId ? state.typing.get(state.activeConversationId) || [] : [];

export const selectUnreadCount = (state: ChatState) => {
  let total = 0;
  for (const conversation of state.conversations.values()) {
    total += conversation.unreadCount || 0;
  }
  return total;
};