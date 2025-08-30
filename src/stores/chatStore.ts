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
            
            console.log('📚 Loaded conversations from Firestore:', conversations.length);
            conversations.forEach(c => {
              if (c.type === 'group' && c.groupInfo) {
                console.log(`📸 Group ${c.id}: photoURL = ${c.groupInfo.photoURL?.substring(0, 50)}...`);
              }
            });
            
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
                createdBy: members[0], // First member as creator
                photoURL: groupInfo.photoURL // Pass the photoURL
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
          let senderEncryptedContent = content;
          let senderNonce = '';
          
          console.log('🔐 Encryption state:', {
            hasEncryption: !!state.encryption,
            hasKeyPair: !!(state.encryption && state.encryption.keyPair)
          });
          
          if (state.encryption && state.encryption.keyPair) {
            const conversation = state.conversations.get(conversationId);
            
            // Find recipient's public key (other user in direct conversation)
            const recipientId = conversation?.members.find(id => id !== state.userId);
            const recipientKeys = Array.from(conversation?.memberDetails?.values() || [])
              .map(m => m.publicKey)
              .filter(Boolean);
            
            // Encrypt for recipient if we have their public key
            if (recipientKeys.length > 0) {
              const encrypted = await state.encryption.encryptMessage(content, recipientKeys[0]);
              encryptedContent = encrypted.content;
              nonce = encrypted.nonce;
            }
            
            // Also encrypt for sender (so they can decrypt their own messages)
            // Use sender's own public key for this
            const senderEncrypted = await state.encryption.encryptMessage(content, state.encryption.keyPair.publicKey);
            senderEncryptedContent = senderEncrypted.content;
            senderNonce = senderEncrypted.nonce;
          }

          // Get reply ID before clearing
          const replyToId = state.replyingTo?.id;
          
          // Clear reply state immediately
          set((state) => {
            state.replyingTo = null;
          });

          // Create a temporary message to show immediately in UI
          const tempMessage: Message = {
            id: `temp-${Date.now()}`, // Temporary ID
            conversationId,
            senderId: state.userId!,
            type: type || 'text',
            content: senderEncryptedContent,  // Use sender's encrypted version for display
            decryptedContent: content,
            nonce: senderNonce,
            timestamp: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0, toDate: () => new Date(), toMillis: () => Date.now(), isEqual: () => false } as any,
            delivered: [],
            read: [],
            reactions: {},
            status: 'sending' as const,
            metadata: metadata || {}
          };
          
          // Add temporary message to local state immediately
          set((state) => {
            const messages = state.messages.get(conversationId) || [];
            const updatedMessages = [...messages, tempMessage];
            state.messages.set(conversationId, updatedMessages);
            
            // Save to localStorage
            try {
              const storageKey = `chat_messages_${conversationId}`;
              localStorage.setItem(storageKey, JSON.stringify(updatedMessages));
            } catch (error) {
              console.warn('Failed to save temp message to localStorage:', error);
            }
          });
          
          // Send via socket if available, otherwise use Firestore
          if (state.socket && state.isConnected) {
            // Socket.io v4 callback format: (err, response)
            const messageData: any = {
              conversationId,
              type: type || 'text',
              text: encryptedContent || content,  // Recipient's encrypted version (fallback to plain text)
              nonce: nonce || '',
              senderText: senderEncryptedContent || content,  // Sender's encrypted version (fallback to plain text)
              senderNonce: senderNonce || '',
              metadata: metadata || {},
              tempId: tempMessage.id // Include temp ID for correlation
            };
            
            // Only add replyTo if it exists
            if (replyToId) {
              messageData.replyTo = replyToId;
            }
            
            state.socket.emit('message:send', messageData, (err: any, response: any) => {
              if (err) {
                console.error('❌ Failed to send message:', err);
                // Update message status to failed
                set((state) => {
                  const messages = state.messages.get(conversationId) || [];
                  const index = messages.findIndex((m: any) => m.id === tempMessage.id);
                  if (index >= 0) {
                    messages[index].status = 'failed';
                    const updatedMessages = [...messages];
                    state.messages.set(conversationId, updatedMessages);
                    
                    // Update localStorage
                    try {
                      const storageKey = `chat_messages_${conversationId}`;
                      localStorage.setItem(storageKey, JSON.stringify(updatedMessages));
                    } catch (error) {
                      console.warn('Failed to update localStorage:', error);
                    }
                  }
                });
              } else if (response && response.messageId) {
                console.log('✅ Message sent successfully:', response);
                // Replace temp message with real message
                set((state) => {
                  const messages = state.messages.get(conversationId) || [];
                  const index = messages.findIndex((m: any) => m.id === tempMessage.id);
                  if (index >= 0) {
                    messages[index].id = response.messageId;
                    messages[index].status = 'sent';
                    const updatedMessages = [...messages];
                    state.messages.set(conversationId, updatedMessages);
                    
                    // Update localStorage
                    try {
                      const storageKey = `chat_messages_${conversationId}`;
                      localStorage.setItem(storageKey, JSON.stringify(updatedMessages));
                    } catch (error) {
                      console.warn('Failed to update localStorage:', error);
                    }
                  }
                });
              }
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

          // First, try to load from localStorage
          try {
            const storageKey = `chat_messages_${conversationId}`;
            const storedMessages = localStorage.getItem(storageKey);
            if (storedMessages) {
              const parsedMessages = JSON.parse(storedMessages);
              console.log(`💾 Loaded ${parsedMessages.length} messages from localStorage`);
              set((state) => {
                state.messages.set(conversationId, parsedMessages);
              });
            }
          } catch (error) {
            console.warn('Failed to load messages from localStorage:', error);
          }

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
                // Get existing messages (from WebSocket)
                const existingMessages = state.messages.get(conversationId) || [];
                
                // If Firestore returns empty messages but we have WebSocket messages, keep them
                if (messages.length === 0 && existingMessages.length > 0) {
                  console.log('⚠️ Firestore returned empty, keeping existing WebSocket messages');
                  state.loadingMore.set(conversationId, false);
                  return;
                }
                
                // Merge messages: keep WebSocket messages that aren't in Firestore yet
                const firestoreMessageIds = new Set(messages.map(m => m.id));
                const webSocketOnlyMessages = existingMessages.filter(m => 
                  !firestoreMessageIds.has(m.id) && !m.id.startsWith('temp-')
                );
                
                // Combine Firestore messages with WebSocket-only messages
                const combinedMessages = [...messages, ...webSocketOnlyMessages].sort((a, b) => 
                  new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
                );
                
                state.messages.set(conversationId, combinedMessages);
                state.hasMore.set(conversationId, messages.length === (pagination?.limit || 50));
                state.loadingMore.set(conversationId, false);
                
                // Update unread count for this conversation
                const conversation = state.conversations.get(conversationId);
                if (conversation) {
                  const userId = state.userId || (state.socket as any)?.data?.userId || 'current-user';
                  const unreadCount = combinedMessages.filter(
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
            console.warn('⚠️ Failed to load messages from Firestore:', error.message);
            // Don't set error state if it's just a permission issue
            // Keep existing WebSocket messages
            set((state) => {
              if (!error.message?.includes('PERMISSION_DENIED')) {
                state.error = error.message;
              }
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
          for (const [conversationId, messages] of state.messages) {
            const filtered = messages.filter((m: any) => m.id !== messageId);
            if (filtered.length !== messages.length) {
              state.messages.set(conversationId, filtered);
              break;
            }
          }
        }),

        editMessage: (messageId, newContent) => set((state) => {
          for (const [, messages] of state.messages) {
            const messageIndex = messages.findIndex((m: any) => m.id === messageId);
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
            for (const [, messages] of state.messages) {
              const message = messages.find((m: any) => m.id === messageId);
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
          
          // Update Firebase - Simplified approach (skip if message doesn't exist)
          if (activeConvId) {
            try {
              const messageRef = doc(db, 'conversations', activeConvId, 'messages', messageId);
              
              // Get current message document
              const messageDoc = await getDoc(messageRef);
              if (!messageDoc.exists()) {
                console.warn('Message not in Firebase - using local state only');
                // Message only exists in WebSocket/local state, skip Firebase update
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
            for (const [, messages] of state.messages) {
              const message = messages.find((m: any) => m.id === messageId);
              if (message && message.reactions) {
                const users = message.reactions[emoji] || [];
                const filtered = users.filter((u: any) => u !== userId);
                if (filtered.length > 0) {
                  message.reactions[emoji] = filtered;
                } else {
                  delete message.reactions[emoji];
                }
                break;
              }
            }
          });
          
          // Update Firebase (skip if message doesn't exist)
          if (activeConvId) {
            try {
              const messageRef = doc(db, 'conversations', activeConvId, 'messages', messageId);
              
              // Get current reactions
              const messageDoc = await getDoc(messageRef);
              if (!messageDoc.exists()) {
                console.warn('Message not in Firebase - using local state only');
                // Message only exists in WebSocket/local state, skip Firebase update
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
          
          // Find the message to get its conversation ID
          let conversationId: string | null = null;
          let shouldEmit = false;
          
          // Update local state
          set((state) => {
            for (const [convId, messages] of state.messages) {
              const message = messages.find((m: any) => m.id === messageId);
              if (message && !message.delivered.includes(userId)) {
                message.delivered.push(userId);
                message.status = 'delivered';
                conversationId = convId;
                shouldEmit = true;
                console.log(`✅ Local state updated - message delivered to ${userId}`);
                break;
              }
            }
          });
          
          // Send delivery confirmation via socket if needed
          if (shouldEmit && conversationId && state.socket) {
            console.log(`📤 Sending delivery confirmation for message ${messageId}`);
            state.socket.emit('message:delivered', {
              conversationId,
              messageId
            });
          }
          
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
            for (const [, messages] of state.messages) {
              messages.forEach((message: any) => {
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
        initializeSocket: (socket) => {
          // Store socket reference
          set((state) => {
            state.socket = socket;
          });
          
          // Listen for auth success to get user data
          socket.on('auth:success', (userData: any) => {
            console.log('🔑 Auth success received:', userData);
            set((state) => {
              state.userId = userData.userId;
              state.isConnected = true;
              console.log('✅ Set userId from auth:', userData.userId);
            });
          });
          
          // Set up socket event handlers
          socket.on('message:new', async (message: any) => {
            console.log('📨 New message received in store:', message);
            
            // Decrypt the message content
            const userId = get().userId;
            let decryptedContent = '';
            
            try {
              // Determine which encrypted text to use based on who we are
              const encryptedText = message.senderId === userId 
                ? message.senderText  // Use sender's version if we sent it
                : message.text;       // Use recipient's version if we received it
              
              const nonce = message.senderId === userId 
                ? message.senderNonce || message.nonce
                : message.nonce;
              
              if (encryptedText && nonce) {
                const { encryptionService } = await import('@/services/chat/encryption.service');
                // Get sender's public key from the message
                const senderPublicKey = message.sender?.publicKey || '';
                if (senderPublicKey && encryptedText && nonce) {
                  decryptedContent = encryptionService.decryptMessage(
                    { encryptedContent: encryptedText, nonce },
                    senderPublicKey
                  );
                  console.log('🔓 Decrypted message content:', decryptedContent);
                } else {
                  // If no public key, just use the text as-is (test mode)
                  decryptedContent = message.text || message.senderText || '';
                  console.log('📝 Using plain text (no public key):', decryptedContent);
                }
              } else {
                // Fallback to plain text if no encryption
                decryptedContent = message.text || message.senderText || '';
                console.log('📝 Using plain text (no encryption):', decryptedContent);
              }
            } catch (error) {
              console.error('Failed to decrypt message:', error);
              // Fallback to plain text
              decryptedContent = message.text || message.senderText || '[Unable to decrypt]';
            }
            
            // Check if this is not our own message before updating state
            const currentUserId = get().userId;
            const shouldSendDelivery = message.senderId !== currentUserId;
            
            // Add the message to the appropriate conversation
            set((state) => {
              const conversationId = message.conversationId;
              let messages = state.messages.get(conversationId) || [];
              
              // Check if message already exists (avoid duplicates)
              if (!messages.find((m: any) => m.id === message.id)) {
                // Remove any temporary message from the same sender with similar content
                // This handles the case where we sent a message and now receive it back via WebSocket
                if (message.senderId === state.userId) {
                  messages = messages.filter((m: any) => {
                    // Remove temp messages that match this content
                    if (m.id.startsWith('temp-') && m.decryptedContent === decryptedContent) {
                      console.log('🔄 Removing temporary message:', m.id);
                      return false;
                    }
                    return true;
                  });
                }
                
                const newMessage: Message = {
                  id: message.id,
                  conversationId: message.conversationId,
                  senderId: message.senderId,
                  type: message.type || 'text',
                  content: message.text || message.senderText || message.content,
                  decryptedContent: decryptedContent,
                  nonce: message.nonce || '',
                  timestamp: message.timestamp || new Date(),
                  delivered: message.delivered || message.deliveredTo || [],
                  read: message.read || message.readBy || [],
                  reactions: message.reactions || {},
                  status: 'sent' as const,
                  metadata: message.metadata || {},
                  sender: message.sender || {
                    displayName: message.senderId === 'test-user-1' ? 'Test User 1' : 'Test User 2',
                    photoURL: '/default-avatar.png',
                    tier: message.senderId === 'test-user-1' ? 'pro' : 'rising'
                  }
                };
                
                // Add message to the list (newer messages at the end)
                const updatedMessages = [...messages, newMessage];
                state.messages.set(conversationId, updatedMessages);
                
                // Save to localStorage for persistence across refreshes
                try {
                  const storageKey = `chat_messages_${conversationId}`;
                  localStorage.setItem(storageKey, JSON.stringify(updatedMessages));
                  console.log(`💾 Saved ${updatedMessages.length} messages to localStorage`);
                } catch (error) {
                  console.warn('Failed to save messages to localStorage:', error);
                }
                
                // Update conversation's last message
                const conversation = state.conversations.get(conversationId);
                if (conversation) {
                  conversation.lastMessage = newMessage;
                  (conversation as any).lastMessageAt = newMessage.timestamp;
                  
                  // Increment unread count if message is from another user
                  if (message.senderId !== state.userId) {
                    conversation.unreadCount = (conversation.unreadCount || 0) + 1;
                  }
                }
              }
            });
            
            // Send delivery confirmation AFTER state update if this is not our own message
            if (shouldSendDelivery) {
              console.log('📮 Sending delivery confirmation for message:', message.id);
              socket.emit('message:delivered', {
                conversationId: message.conversationId,
                messageId: message.id
              });
            }
          });
          
          socket.on('message:sent', (data: any) => {
            console.log('✅ Message sent confirmation:', data);
            
            // Update the message status if needed
            set((state) => {
              for (const [, messages] of state.messages) {
                const message = messages.find((m: any) => m.id === data.messageId);
                if (message) {
                  message.status = 'sent';
                  if (data.deliveredTo) {
                    message.delivered = data.deliveredTo;
                  }
                  break;
                }
              }
            });
          });
          
          socket.on('message:delivered', (data: any) => {
            console.log('📮 Message delivered:', data);
            
            set((state) => {
              for (const [, messages] of state.messages) {
                const message = messages.find((m: any) => m.id === data.messageId);
                if (message && data.userId && !message.delivered.includes(data.userId)) {
                  message.delivered.push(data.userId);
                  message.status = 'delivered';
                  break;
                }
              }
            });
          });
          
          socket.on('message:read', (data: any) => {
            console.log('👀 Message read:', data);
            
            set((state) => {
              for (const [, messages] of state.messages) {
                const message = messages.find((m: any) => m.id === data.messageId);
                if (message && data.userId && !message.read.includes(data.userId)) {
                  message.read.push(data.userId);
                  message.status = 'read';
                  break;
                }
              }
            });
          });
          
          // Listen for presence updates
          socket.on('user:online', (data: { userId: string; displayName?: string }) => {
            console.log('🟢 User online:', data.userId);
            set((state) => {
              // Don't mark self as online in presence map
              if (data.userId !== state.userId) {
                state.presence.set(data.userId, true);
              }
            });
          });
          
          socket.on('user:offline', (data: { userId: string }) => {
            console.log('🔴 User offline:', data.userId);
            set((state) => {
              // Don't mark self as offline in presence map
              if (data.userId !== state.userId) {
                state.presence.set(data.userId, false);
              }
            });
          });
          
          socket.on('presence:update', (data: { userId: string; online: boolean }) => {
            console.log('👥 Presence update:', data);
            set((state) => {
              // Don't mark self in presence map
              if (data.userId !== state.userId) {
                state.presence.set(data.userId, data.online);
              }
            });
          });
          
          socket.on('presence:online-users', (data: { users: string[] }) => {
            console.log('👥 Online users list received:', data.users);
            set((state) => {
              // Clear presence and set all online users (excluding self)
              state.presence.clear();
              data.users.forEach(userId => {
                // Don't mark self as online in presence map
                if (userId !== state.userId) {
                  state.presence.set(userId, true);
                  console.log(`✅ Marked ${userId} as online`);
                }
              });
              console.log(`📊 Presence map now has ${state.presence.size} online users`);
            });
          });
          
          // Listen for typing events
          socket.on('typing:update', (data: { conversationId: string; userId: string; typing: boolean; user?: any }) => {
            console.log('⌨️ Typing update:', data);
            const state = get();
            
            // Don't show own typing indicator
            if (data.userId !== state.userId) {
              state.setTypingUser(data.conversationId, data.userId, data.typing);
            }
          });
          
          socket.on('typing:current', (data: { conversationId: string; typingUsers: string[] }) => {
            console.log('⌨️ Current typing users:', data);
            set((state) => {
              // Set all currently typing users for this conversation
              const filtered = data.typingUsers.filter(userId => userId !== state.userId);
              state.typing.set(data.conversationId, filtered);
            });
          });
          
          // Update the socket reference and connection status
          set((state) => {
            state.socket = socket as any;
            state.isConnected = true;
            state.connectionError = null;
          });
        },

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
            const matches = messages.filter((m: any) => 
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
  const conversations = Array.from(state.conversations.values());
  for (const conversation of conversations) {
    total += conversation.unreadCount || 0;
  }
  return total;
};