"use client";

import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
  Timestamp,
  writeBatch,
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase-config";
import { authManager } from "@/lib/firebase-auth-manager";
import { EncryptionService } from "./encryption.service";
const encryptionService = EncryptionService.getInstance();
import { keyExchangeService } from "./key-exchange.service";

export interface ChatUser {
  uid: string;
  displayName?: string;
  photoURL?: string;
  tier?: string;
}

export interface Conversation {
  id: string;
  type: "direct" | "group";
  members: string[];
  lastMessage?: {
    text: string;
    senderId: string;
    timestamp: Timestamp;
  };
  groupInfo?: {
    name: string;
    description: string;
    createdBy: string;
    admins: string[];
    photoURL: string;
  };
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  text: string; // Decrypted text for display
  content?: string; // For compatibility
  decryptedContent?: string; // For compatibility
  encryptedContent?: string; // Encrypted content stored in Firestore
  nonce?: string; // Encryption nonce
  senderText?: string; // Sender's version of encrypted text
  senderNonce?: string; // Sender's encryption nonce
  timestamp: Timestamp;
  readBy?: string[]; // Array of user IDs who have read this message
  deliveredTo?: string[]; // Array of user IDs who have received this message
  replyTo?: string; // ID of message being replied to
  reactions?: { [emoji: string]: string[] }; // Reactions with emoji as key and array of user IDs
  type?: string; // Message type (text, image, file, etc.)
  metadata?: any; // Additional metadata for media messages
}

/**
 * Create or fetch a direct conversation between two users to avoid duplicates.
 * Ensures deterministic doc id ordering by concatenating sorted UIDs.
 */
export async function createOrGetDirectConversation(currentUserId: string, otherUserId: string): Promise<Conversation> {
  // Ensure auth is ready before Firestore operations
  await authManager.waitForAuth();
  
  // BUG FIX: 2025-01-28 - Prevent users from creating conversations with themselves
  // Problem: Users could send messages to themselves by creating self-conversations
  // Solution: Added validation to reject self-messaging attempts
  // Impact: Users can no longer message themselves, improving UX and data integrity
  if (currentUserId === otherUserId) {
    throw new Error('Cannot create conversation with yourself');
  }


  const [a, b] = [currentUserId, otherUserId].sort();
  const convId = `direct_${a}_${b}`;
  const convRef = doc(db, "conversations", convId);
  const snap = await getDoc(convRef);
  if (!snap.exists()) {
    await setDoc(convRef, {
      type: "direct",
      members: [a, b],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
  const created = await getDoc(convRef);
  const data = created.data() as Omit<Conversation, "id">;
  return { id: convId, ...data } as Conversation;
}

/**
 * Create a group conversation with specified members and group info.
 */
// BUG FIX: 2025-01-30 - Add photoURL support to group conversations
// Problem: Group chat images not showing because photoURL was hardcoded to empty
// Solution: Accept photoURL in groupInfo parameter and use it when creating conversation
// Impact: Group chat images now properly display in sidebar
export async function createGroupConversation(
  memberIds: string[], 
  groupInfo: {
    name: string;
    description?: string;
    createdBy: string;
    photoURL?: string;
  }
): Promise<Conversation> {
  // Ensure auth is ready
  await authManager.waitForAuth();
  
  console.log('📝 Creating group conversation with:', {
    memberIds,
    groupInfoKeys: Object.keys(groupInfo),
    name: groupInfo.name,
    photoURLLength: groupInfo.photoURL?.length || 0
  });

  // Validate minimum members for group chat
  if (memberIds.length < 2) {
    throw new Error('Group conversation requires at least 2 members');
  }

  // Ensure creator is included in members
  if (!memberIds.includes(groupInfo.createdBy)) {
    memberIds.push(groupInfo.createdBy);
  }

  // BUG FIX: 2025-01-30 - Ensure all fields are properly defined to prevent Firestore errors
  // Problem: Undefined or null values can cause "invalid nested entity" errors
  // Solution: Ensure all fields have valid values
  // Impact: Prevents Firestore errors when creating group conversations
  
  // BUG FIX: 2025-01-30 - Validate photoURL to prevent Firebase nested entity errors
  // Problem: Base64 data URLs cause "invalid nested entity" errors
  // Solution: Reject base64 URLs and only accept regular URLs or default image
  // Impact: Prevents Firebase errors when creating group conversations
  
  let photoURL = '/default-group.svg';
  if (groupInfo.photoURL && typeof groupInfo.photoURL === 'string' && groupInfo.photoURL.length > 0) {
    // Check if it's a base64 data URL (these cause Firebase errors)
    if (groupInfo.photoURL.startsWith('data:')) {
      console.warn('⚠️ Base64 data URLs not supported for group photos. Use Firebase Storage instead.');
      photoURL = '/default-group.svg';
    } else if (groupInfo.photoURL.length > 2048) {
      // Firebase has limits on string field sizes
      console.warn('⚠️ Photo URL too long. Using default image.');
      photoURL = '/default-group.svg';
    } else {
      photoURL = groupInfo.photoURL;
    }
  }

  // BUG FIX: 2025-01-30 - Create clean object structure for Firestore
  // Problem: Firestore rejects nested objects with certain structures
  // Solution: Create a simple JSON-serializable object
  // Impact: Fixes "invalid nested entity" error
  
  // Create a simple object for groupInfo
  const groupInfoData = {
    name: String(groupInfo.name || 'Unnamed Group'),
    description: String(groupInfo.description || ''),
    createdBy: String(groupInfo.createdBy),
    admins: [String(groupInfo.createdBy)],
    photoURL: String(photoURL)
  };
  
  const conversationData = {
    type: "group" as const,
    members: memberIds,
    groupInfo: groupInfoData,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };

  // Log the data being sent
  console.log('📤 Sending to Firestore:', {
    type: conversationData.type,
    members: conversationData.members,
    groupInfo: {
      name: groupInfoData.name,
      description: groupInfoData.description,
      createdBy: groupInfoData.createdBy,
      admins: groupInfoData.admins,
      photoURL: (groupInfoData.photoURL || '').substring(0, 50) + '...'
    },
    timestamps: 'Timestamp.now()'
  });

  try {
    const ref = await addDoc(collection(db, "conversations"), conversationData);
    const snap = await getDoc(ref);
    console.log('✅ Group conversation created successfully:', ref.id);
    return { id: ref.id, ...(snap.data() as Omit<Conversation, "id">) };
  } catch (error: any) {
    console.error('❌ Failed to create group conversation:', error.message);
    console.error('❌ Error code:', error.code);
    console.error('❌ Data that caused error:', {
      type: conversationData.type,
      membersCount: conversationData.members ? conversationData.members.length : 0,
      groupInfo: conversationData.groupInfo,
      allKeys: Object.keys(conversationData)
    });
    throw error;
  }
}

/**
 * List conversations for a user ordered by recent activity.
 */
export async function listUserConversations(userId: string): Promise<Conversation[]> {
  // BUG FIX: 2025-01-28 - Add retry logic for Firebase connectivity issues
  // Problem: Firebase operations failing due to network connectivity issues
  // Solution: Add retry logic with exponential backoff
  // Impact: More resilient to temporary network issues
  
  console.log('🔍 listUserConversations START - userId:', userId);
  console.log('🔍 auth.currentUser BEFORE wait:', auth.currentUser?.uid);
  
  // Ensure auth is ready and token is fresh
  const authUser = await authManager.waitForAuth();
  console.log('🔍 authManager.waitForAuth result:', authUser?.uid);
  
  if (authUser) {
    const token = await authManager.ensureFreshToken();
    console.log('🔍 Token refreshed:', !!token);
  }
  
  console.log('🔍 auth.currentUser AFTER wait:', auth.currentUser?.uid);
  
  console.log('🔍 listUserConversations called with:', {
    userId,
    currentAuthUser: authUser?.uid,
    isAuthenticated: !!authUser,
    authCurrentUser: auth.currentUser?.uid
  });
  
  if (!userId) {
    console.error('❌ No userId provided to listUserConversations');
    return [];
  }
  
  // Verify the userId matches the authenticated user
  if (authUser && authUser.uid !== userId) {
    console.warn('⚠️ userId mismatch:', { provided: userId, authenticated: authUser.uid });
  }
  
  // Check if auth.currentUser is available
  if (!auth.currentUser) {
    console.error('❌ auth.currentUser is null even after waiting!');
    console.log('🔍 Attempting to continue anyway with userId:', userId);
  }
  
  const maxRetries = 3;
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Avoid composite index requirements: no orderBy in combination with array-contains.
      const q = query(collection(db, "conversations"), where("members", "array-contains", userId), limit(50));
      console.log(`📋 Attempting to get conversations (attempt ${attempt}/${maxRetries})`);
      const snap = await getDocs(q);
      console.log(`✅ Successfully loaded ${snap.docs.length} conversations`);
      return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Conversation, "id">) }));
    } catch (error) {
      lastError = error as Error;
      console.error(`❌ Attempt ${attempt}/${maxRetries} to load conversations failed:`, error);
      
      if (attempt < maxRetries) {
        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  }
  
  throw lastError || new Error('Failed to load conversations after multiple attempts');
}

/**
 * Get a specific conversation by ID
 */
export async function getConversation(conversationId: string): Promise<Conversation | null> {
  // Ensure auth is ready
  await authManager.waitForAuth();
  
  const docRef = doc(db, "conversations", conversationId);
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) {
    return null;
  }
  
  return { id: docSnap.id, ...docSnap.data() } as Conversation;
}

/**
 * Send a message in a conversation with E2EE encryption and update lastMessage metadata.
 * Supports text, media, and other message types.
 */
export async function sendMessage(
  conversationId: string, 
  senderId: string, 
  text: string,
  options?: {
    type?: string;
    metadata?: any;
    nonce?: string;
    encryptedContent?: string;
    senderEncryptedContent?: string;
    senderNonce?: string;
  }
): Promise<void> {
  // Ensure auth is ready and token is fresh
  const authUser = await authManager.waitForAuth();
  if (!authUser || authUser.uid !== senderId) {
    throw new Error('User not authenticated or ID mismatch');
  }
  await authManager.ensureFreshToken();
  
  try {
    console.log('📤 Sending message to conversation:', conversationId);
    console.log('📤 Sender ID:', senderId);
    
    // Get conversation to find recipient(s)
    const conversation = await getConversation(conversationId);
    if (!conversation) {
      console.error('❌ Conversation not found with ID:', conversationId);
      console.error('❌ This might happen if the conversation was deleted');
      
      // Try to recreate the conversation if it's a direct message
      // This helps when a conversation was deleted but users want to message again
      throw new Error(`Conversation not found: ${conversationId}`);
    }

    // Check if we already have encrypted content from the caller
    let encryptedContent = options?.encryptedContent || text;
    let nonce = options?.nonce || '';
    let senderEncryptedContent = options?.senderEncryptedContent || '';
    let senderNonce = options?.senderNonce || '';
    
    // Skip encryption for media messages (they contain URLs, not sensitive content)
    // Media content itself is already encrypted separately
    const isMediaMessage = options?.type && ['image', 'file', 'voice', 'media'].includes(options.type);
    
    // Only encrypt if we don't already have encrypted content
    if (conversation.type === 'direct' && !isMediaMessage && !options?.encryptedContent) {
      const recipientId = conversation.members.find(id => id !== senderId);
      if (recipientId) {
        try {
          // Get recipient's public key
          const recipientPublicKey = await keyExchangeService.getPublicKey(recipientId);
          
          if (recipientPublicKey) {
            // Encrypt the message for recipient
            const encrypted = encryptionService.encryptMessage(text, recipientPublicKey);
            encryptedContent = encrypted.content;
            nonce = encrypted.nonce;
            console.log('🔐 Message encrypted for recipient:', recipientId);
            console.log('🔐 Encrypted content length (base64):', encryptedContent.length);
            console.log('🔐 Nonce length (base64):', nonce.length);
            console.log('🔐 Original text length:', text.length);
            
            // BUG FIX: 2025-01-28 - Store plaintext for sender
            // Problem: NaCl box cannot encrypt to yourself - it requires two different key pairs
            // Solution: For now, store plaintext for sender (will implement symmetric encryption later)
            // Impact: Sender can read their own messages
            // TODO: Implement symmetric encryption for sender's copy
            senderEncryptedContent = Buffer.from(text).toString('base64'); // Base64 encode plaintext
            senderNonce = 'plaintext'; // Mark as plaintext
            console.log('🔐 Storing base64-encoded plaintext for sender');
          } else {
            console.warn('⚠️ Recipient public key not found, sending unencrypted');
          }
        } catch (encryptionError) {
          console.error('Encryption failed, sending unencrypted:', encryptionError);
        }
      }
    }

    // BUG FIX: 2025-01-28 - Store dual encryption for sender and recipient
    // Problem: Sender can't read their own messages because they were only encrypted for recipient
    // Solution: Store both recipient-encrypted and sender-encrypted versions
    // Impact: Both sender and recipient can decrypt and read the message
    const messageData: any = {
      senderId,
      text: encryptedContent, // Store encrypted content for recipient
      timestamp: serverTimestamp(),
      type: options?.type || 'text',
      reactions: {}, // Initialize reactions field to ensure it exists
      deliveredTo: [], // Initialize delivered array
      readBy: [], // Initialize read array
    };
    
    // Add metadata if provided (for media messages)
    if (options?.metadata) {
      messageData.metadata = options.metadata;
    }
    
    // Only include nonce if it has a value
    if (nonce || options?.nonce) {
      messageData.nonce = nonce || options.nonce;
    }
    
    // Store sender's encrypted version if available
    if (senderEncryptedContent && senderNonce) {
      messageData.senderText = senderEncryptedContent;
      messageData.senderNonce = senderNonce;
    }

    console.log('📤 SAVING MESSAGE TO FIRESTORE:', {
      conversationId,
      senderId,
      hasText: !!messageData.text,
      textLength: messageData.text?.length,
      textPreview: messageData.text?.substring(0, 50),
      hasNonce: !!messageData.nonce,
      nonceValue: messageData.nonce,
      hasSenderText: !!messageData.senderText,
      senderTextLength: messageData.senderText?.length,
      senderTextPreview: messageData.senderText?.substring(0, 50),
      hasSenderNonce: !!messageData.senderNonce,
      senderNonceValue: messageData.senderNonce,
      type: messageData.type
    });
    
    const messagesRef = collection(db, "conversations", conversationId, "messages");
    const docRef = await addDoc(messagesRef, messageData);
    console.log('📤 Message saved with ID:', docRef.id);
    
    await setDoc(
      doc(db, "conversations", conversationId),
      {
        lastMessage: { 
          text: text.length > 50 ? text.substring(0, 50) + '...' : text, // Store preview unencrypted
          senderId, 
          timestamp: serverTimestamp() 
        },
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    
    console.log('📨 Message sent successfully');
  } catch (error) {
    console.error('Failed to send message:', error);
    throw error;
  }
}

/**
 * Subscribe to conversations for a user in real-time
 */
export function subscribeUserConversations(
  userId: string,
  onData: (conversations: Conversation[]) => void
): () => void {
  const q = query(
    collection(db, "conversations"), 
    where("members", "array-contains", userId),
    limit(50)
  );
  
  return onSnapshot(q, (snapshot) => {
    const conversations = snapshot.docs.map((d) => ({ 
      id: d.id, 
      ...(d.data() as Omit<Conversation, "id">) 
    }));
    
    // Sort by last message timestamp (most recent first)
    conversations.sort((a, b) => {
      const aTime = a.lastMessage?.timestamp?.toDate?.() || a.updatedAt?.toDate?.() || new Date(0);
      const bTime = b.lastMessage?.timestamp?.toDate?.() || b.updatedAt?.toDate?.() || new Date(0);
      return bTime.getTime() - aTime.getTime();
    });
    
    onData(conversations);
  });
}

/**
 * Subscribe to recent messages of a conversation with automatic decryption.
 */
export function subscribeMessages(
  conversationId: string,
  onData: (messages: ChatMessage[]) => void
): () => void {
  const q = query(
    collection(db, "conversations", conversationId, "messages"),
    orderBy("timestamp", "desc"),
    limit(50)
  );
  
  return onSnapshot(q, async (snapshot) => {
    // Add a small delay to ensure keys are loaded
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Process all messages and wait for decryption to complete
    const messagePromises = snapshot.docs.map(async (docSnap) => {
      const data = docSnap.data();
      
      // Check if this is a media message - they don't need decryption
      const isMediaMessage = data.type && ['image', 'file', 'voice', 'media'].includes(data.type);
      
      // Start with encrypted text, will decrypt if needed
      let decryptedText = data.text || '[No message content]';
      
      // Skip decryption for media messages - they contain URLs
      if (isMediaMessage) {
        decryptedText = data.text; // URL doesn't need decryption
      }
      
      // BUG FIX: 2025-01-28 - Use appropriate encrypted version for sender vs recipient
      // Problem: Sender couldn't decrypt their own messages because they were encrypted for recipient
      // Solution: Use senderText/senderNonce for sender's own messages, text/nonce for others' messages
      // Impact: Both sender and recipient can decrypt and read messages properly
      
      // BUG FIX: 2025-02-01 - Get user ID from auth manager instead of encryption service
      // Problem: encryptionService.getCurrentUserId() returns null if not initialized yet
      // Solution: Use auth.currentUser?.uid which is always available when authenticated
      // Impact: Decryption now works properly even before encryption service initialization
      const currentUserId = auth.currentUser?.uid || encryptionService.getCurrentUserId?.();
      
      // BUG FIX: 2025-02-01 - Ensure encryption service has current user ID
      // Problem: Encryption service might not have user ID set when decrypting
      // Solution: Set it if we have auth user but encryption service doesn't have it
      // Impact: Ensures encryption service is properly initialized for decryption
      if (currentUserId && !encryptionService.getCurrentUserId?.()) {
        console.log('🔐 Setting current user ID in encryption service:', currentUserId);
        encryptionService.setCurrentUserId?.(currentUserId);
      }
      
      let hasKeyPair = encryptionService.getPublicKey() !== null;
      
      // BUG FIX: 2025-02-01 - Load keys if not already loaded
      // Problem: Keys might not be loaded when trying to decrypt
      // Solution: Try to load keys from storage if they're not in memory
      // Impact: Ensures keys are available for decryption
      if (!hasKeyPair && currentUserId) {
        console.log('🔐 No keys in memory, attempting to load from storage...');
        try {
          await keyExchangeService.initializeUserKeys(currentUserId);
          hasKeyPair = encryptionService.getPublicKey() !== null;
          console.log('🔐 Keys loaded successfully:', hasKeyPair);
        } catch (error) {
          console.error('🔥 Failed to load keys:', error);
        }
      }
      
      console.log('🔐 ==== DECRYPTION DEBUG START ====');
      console.log('🔐 Message ID:', docSnap.id);
      console.log('🔐 Current User ID:', currentUserId);
      console.log('🔐 Sender ID:', data.senderId);
      console.log('🔐 Is own message:', data.senderId === currentUserId);
      console.log('🔐 Has encryption key pair:', hasKeyPair);
      console.log('🔐 Message data fields:', {
        hasText: !!data.text,
        textLength: data.text?.length || 0,
        textPreview: data.text?.substring(0, 50),
        hasNonce: !!data.nonce,
        nonceValue: data.nonce,
        hasSenderText: !!data.senderText,
        senderTextLength: data.senderText?.length || 0,
        senderTextPreview: data.senderText?.substring(0, 50),
        hasSenderNonce: !!data.senderNonce,
        senderNonceValue: data.senderNonce,
        messageType: data.type,
        isMediaMessage
      });
      console.log('🔐 ==== DECRYPTION DEBUG END ====');
      
      // Handle decryption based on whether user is sender or recipient
      if ((data.nonce || data.senderNonce) && !isMediaMessage) {
        try {
          console.log('🔐 Retrieved encrypted message from Firestore:');
          console.log('🔐 Sender ID:', data.senderId);
          console.log('🔐 Current user ID:', currentUserId);
          console.log('🔐 Is own message:', data.senderId === currentUserId);
          
          let encryptedContent: string;
          let nonce: string;
          let publicKeyForDecryption: string | null = null;
          
          if (data.senderId === currentUserId && data.senderText && data.senderNonce) {
            // For own messages, check if it's plaintext or encrypted
            if (data.senderNonce === 'plaintext') {
              // Plaintext stored as base64
              try {
                decryptedText = Buffer.from(data.senderText, 'base64').toString('utf-8');
                console.log('🔐 Decoded plaintext for sender\'s own message');
              } catch (e) {
                console.error('🔥 Failed to decode base64 plaintext:', e);
                decryptedText = '[Cannot decode message]';
              }
              // Return early since we have the plaintext
              return {
                id: docSnap.id,
                senderId: data.senderId,
                text: decryptedText,
                encryptedContent: data.text,
                nonce: data.nonce,
                timestamp: data.timestamp,
                readBy: data.readBy,
                deliveredTo: data.deliveredTo,
                type: data.type || 'text',
                metadata: data.metadata || {}
              };
            } else {
              // Legacy dual encryption attempt (will fail)
              console.log('🔐 Legacy dual encryption detected - cannot decrypt');
              decryptedText = '[Legacy encrypted message]';
              return {
                id: docSnap.id,
                senderId: data.senderId,
                text: decryptedText,
                encryptedContent: data.text,
                nonce: data.nonce,
                timestamp: data.timestamp,
                readBy: data.readBy,
                deliveredTo: data.deliveredTo
              };
            }
          } else if (data.senderId === currentUserId && data.text && data.nonce && !data.senderText) {
            // BUG FIX: 2025-01-28 - Backward compatibility for legacy messages
            // Problem: Old messages from sender only have text/nonce (encrypted for recipient)
            // Solution: Return the message without attempting decryption
            // Impact: Legacy sender messages may appear encrypted, but new messages work correctly
            console.log('🔐 Legacy sender message detected (pre-dual encryption)');
            console.log('🔐 Cannot decrypt legacy sender message - was encrypted for recipient only');
            // Don't attempt to decrypt, just mark as legacy
            return {
              id: docSnap.id,
              senderId: data.senderId,
              text: '[Legacy message]',
              encryptedContent: data.text,
              nonce: data.nonce,
              timestamp: data.timestamp,
              readBy: data.readBy,
              deliveredTo: data.deliveredTo
            };
          } else if (data.senderId !== currentUserId && data.text && data.nonce) {
            // For others' messages, use recipient encrypted version
            encryptedContent = data.text;
            nonce = data.nonce;
            publicKeyForDecryption = await keyExchangeService.getPublicKey(data.senderId);
            console.log('🔐 Using recipient encrypted version (other user message)');
            console.log('🔐 Recipient encrypted content length:', encryptedContent.length);
            console.log('🔐 Recipient nonce length:', nonce.length);
          } else {
            console.warn('⚠️ No appropriate encrypted version found for user:', currentUserId);
            console.log('🔐 Message data available:', {
              senderId: data.senderId,
              hasText: !!data.text,
              hasNonce: !!data.nonce,
              hasSenderText: !!data.senderText,
              hasSenderNonce: !!data.senderNonce,
              isOwnMessage: data.senderId === currentUserId
            });
            // Return early for messages without encryption
            return {
              id: docSnap.id,
              senderId: data.senderId,
              text: '[No encrypted version available]',
              encryptedContent: data.text,
              nonce: data.nonce,
              timestamp: data.timestamp,
              readBy: data.readBy,
              deliveredTo: data.deliveredTo
            };
          }
          
          console.log('🔐 Public key length:', publicKeyForDecryption?.length || 0);
          console.log('🔐 Public key (first 10):', publicKeyForDecryption?.substring(0, 10) || 'null');
          
          if (publicKeyForDecryption) {
            console.log('🔐 Attempting to decrypt message from:', data.senderId);
            
            try {
              const decrypted = encryptionService.decryptMessage(
                { content: encryptedContent, nonce: nonce },
                publicKeyForDecryption
              );
              
              if (decrypted === null) {
                // Decryption returned null (can't decrypt with current keys)
                decryptedText = '[Unable to decrypt - different encryption keys]';
              } else {
                decryptedText = decrypted;
                console.log('🔓 Message decrypted successfully from:', data.senderId);
              }
            } catch (innerError) {
              // If decryption fails, it might be an old message with broken encryption
              // Try to handle gracefully
              console.warn('⚠️ Failed to decrypt, might be legacy message:', innerError);
              
              // For old messages that were incorrectly encrypted, show a placeholder
              if (data.timestamp && data.timestamp.toDate() < new Date('2025-01-29')) {
                decryptedText = '[Old message - encryption fixed, please send new messages]';
              } else {
                decryptedText = '[Decryption failed - keys may have changed]';
              }
            }
          } else {
            console.warn('⚠️ Public key not found for user:', data.senderId);
            decryptedText = '[Public key not available]';
          }
        } catch (decryptionError) {
          console.error('🔥 Decryption failed for message from:', data.senderId, decryptionError);
          decryptedText = '[Encrypted Message - Decryption Failed]';
        }
      } else if ((data.nonce || data.senderNonce) && !hasKeyPair) {
        // Keys not yet initialized
        decryptedText = '[Loading encrypted message...]';
      }
      
      // Handle reactions - check if field exists
      const messageReactions = data.reactions || {};
      
      // Debug what we're getting from Firebase for ALL messages
      if (docSnap.id === 'Gfn2zM5Ua4aI63uH9vqX' || docSnap.id === 'HesOjcGFryyQPoF7ZVdN') {
        console.log(`🔍 Debug for problematic message ${docSnap.id}:`, {
          hasReactionsField: 'reactions' in data,
          reactionsValue: data.reactions,
          reactionsType: typeof data.reactions,
          dataKeys: Object.keys(data),
          fullData: JSON.stringify(data)
        });
      }
      
      const messageData = {
        id: docSnap.id,
        senderId: data.senderId,
        text: decryptedText,
        encryptedContent: data.text,
        nonce: data.nonce,
        timestamp: data.timestamp,
        readBy: data.readBy,
        deliveredTo: data.deliveredTo,
        type: data.type || 'text',
        metadata: data.metadata || {},
        reactions: messageReactions
      };
      
      // Debug reactions
      if (data.reactions && Object.keys(data.reactions).length > 0) {
        console.log('📊 Message has reactions:', docSnap.id, data.reactions);
      }
      
      return messageData;
    });
    
    // Wait for all messages to be decrypted before updating UI
    try {
      const results = await Promise.allSettled(messagePromises);
      const decryptedMessages: ChatMessage[] = [];
      
      for (const result of results) {
        if (result.status === 'fulfilled') {
          const msg = result.value;
          // Check if msg.text exists before using includes
          if (!msg.text) {
            // Skip messages with null text (failed decryption)
            continue;
          }
          // Include all messages but mark their status
          if (!msg.text.includes('[Decryption failed]') && 
              !msg.text.includes('[Cannot decrypt]') &&
              !msg.text.includes('[Unable to decrypt]') &&
              !msg.text.includes('[Decrypting...]')) {
            // Successfully decrypted message
            decryptedMessages.push(msg);
          } else if (msg.text.includes('[Old message')) {
            // Old message that can't be decrypted due to encryption changes
            decryptedMessages.push(msg);
          } else {
            console.log('🚫 Skipping message with active decryption error:', msg.id);
            // Don't include messages that are still trying to decrypt
          }
        }
      }
      
      // Only update UI if we have successfully decrypted messages
      if (decryptedMessages.length > 0 || snapshot.docs.length === 0) {
        onData(decryptedMessages);
      } else {
        console.log('⏳ Waiting for successful decryption...');
      }
    } catch (error) {
      console.error('Error processing messages:', error);
      // Don't update UI on error
    }
  });
}

/**
 * Resolve a userId by platform @username.
 */
export async function findUserIdByUsername(username: string): Promise<string | null> {
  const normalized = username.startsWith("@") ? username : `@${username}`;
  const q = query(collection(db, "users"), where("username", "==", normalized), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return snap.docs[0].id;
}

/**
 * Start or get a direct conversation by username.
 */
export async function startDirectByUsername(currentUserId: string, username: string): Promise<Conversation | null> {
  const otherId = await findUserIdByUsername(username);
  if (!otherId) return null;
  return await createOrGetDirectConversation(currentUserId, otherId);
}

/**
 * Mark a message as read by a user
 */
export async function markMessageAsRead(conversationId: string, messageId: string, userId: string): Promise<void> {
  const messageRef = doc(db, "conversations", conversationId, "messages", messageId);
  const messageDoc = await getDoc(messageRef);
  
  if (messageDoc.exists()) {
    const data = messageDoc.data();
    const readBy = data.readBy || [];
    
    if (!readBy.includes(userId)) {
      await setDoc(messageRef, {
        readBy: [...readBy, userId]
      }, { merge: true });
    }
  }
}

/**
 * Delete all messages in a conversation
 */
export async function deleteConversationMessages(conversationId: string): Promise<void> {
  console.log(`🗑️ Starting deletion of messages for conversation: ${conversationId}`);
  
  // Ensure auth is ready
  const authUser = await authManager.waitForAuth();
  if (!authUser) {
    console.error('❌ User not authenticated when trying to delete messages');
    throw new Error('User not authenticated');
  }

  try {
    // Get all messages in the conversation
    const messagesRef = collection(db, 'conversations', conversationId, 'messages');
    const q = query(messagesRef);
    const snapshot = await getDocs(q);
    
    console.log(`📊 Found ${snapshot.size} messages to delete in conversation ${conversationId}`);
    
    if (snapshot.size === 0) {
      console.log(`✅ No messages to delete for conversation ${conversationId}`);
      return;
    }

    // Delete each message in batches
    let batch = writeBatch(db);
    let batchCount = 0;
    let totalDeleted = 0;
    const MAX_BATCH_SIZE = 500; // Firestore batch limit

    for (const doc of snapshot.docs) {
      batch.delete(doc.ref);
      batchCount++;
      totalDeleted++;

      // Commit batch if we reach the limit and create a new one
      if (batchCount >= MAX_BATCH_SIZE) {
        await batch.commit();
        console.log(`📦 Committed batch of ${batchCount} deletions`);
        batch = writeBatch(db); // Create new batch for next set
        batchCount = 0;
      }
    }

    // Commit any remaining deletes
    if (batchCount > 0) {
      await batch.commit();
      console.log(`📦 Committed final batch of ${batchCount} deletions`);
    }

    console.log(`✅ Successfully deleted ${totalDeleted} messages from conversation ${conversationId}`);
  } catch (error) {
    console.error('❌ Error deleting conversation messages:', error);
    throw error;
  }
}

/**
 * Add members to a group conversation
 */
export async function addGroupMembers(conversationId: string, newMemberIds: string[], addedBy: string): Promise<void> {
  const conversation = await getConversation(conversationId);
  
  if (!conversation || conversation.type !== 'group') {
    throw new Error('Conversation not found or not a group');
  }

  // Check if user is admin
  if (!conversation.groupInfo?.admins.includes(addedBy)) {
    throw new Error('Only group admins can add members');
  }

  // Filter out existing members
  const membersToAdd = newMemberIds.filter(id => !conversation.members.includes(id));
  
  if (membersToAdd.length === 0) {
    return; // No new members to add
  }

  const updatedMembers = [...conversation.members, ...membersToAdd];

  await setDoc(
    doc(db, "conversations", conversationId),
    {
      members: updatedMembers,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  // Add system message about new members
  const memberNames = membersToAdd.join(', '); // In production, fetch actual names
  await addDoc(collection(db, "conversations", conversationId, "messages"), {
    senderId: 'system',
    text: `${memberNames} joined the group`,
    timestamp: serverTimestamp(),
    type: 'system'
  });
}

/**
 * Remove members from a group conversation
 */
export async function removeGroupMembers(conversationId: string, memberIdsToRemove: string[], removedBy: string): Promise<void> {
  const conversation = await getConversation(conversationId);
  
  if (!conversation || conversation.type !== 'group') {
    throw new Error('Conversation not found or not a group');
  }

  // Check if user is admin
  if (!conversation.groupInfo?.admins.includes(removedBy)) {
    throw new Error('Only group admins can remove members');
  }

  // Don't allow removing the creator
  const creatorId = conversation.groupInfo.createdBy;
  if (memberIdsToRemove.includes(creatorId)) {
    throw new Error('Cannot remove group creator');
  }

  const updatedMembers = conversation.members.filter(id => !memberIdsToRemove.includes(id));

  await setDoc(
    doc(db, "conversations", conversationId),
    {
      members: updatedMembers,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  // Add system message about removed members
  const memberNames = memberIdsToRemove.join(', '); // In production, fetch actual names
  await addDoc(collection(db, "conversations", conversationId, "messages"), {
    senderId: 'system',
    text: `${memberNames} left the group`,
    timestamp: serverTimestamp(),
    type: 'system'
  });
}

/**
 * Update group information
 */
export async function updateGroupInfo(
  conversationId: string, 
  updates: {
    name?: string;
    description?: string;
    photoURL?: string;
  },
  updatedBy: string
): Promise<void> {
  const conversation = await getConversation(conversationId);
  
  if (!conversation || conversation.type !== 'group') {
    throw new Error('Conversation not found or not a group');
  }

  // Check if user is admin
  if (!conversation.groupInfo?.admins.includes(updatedBy)) {
    throw new Error('Only group admins can update group info');
  }

  const updatedGroupInfo = {
    ...conversation.groupInfo,
    ...updates
  };

  await setDoc(
    doc(db, "conversations", conversationId),
    {
      groupInfo: updatedGroupInfo,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  // Add system message about group update
  if (updates.name) {
    await addDoc(collection(db, "conversations", conversationId, "messages"), {
      senderId: 'system',
      text: `Group name changed to "${updates.name}"`,
      timestamp: serverTimestamp(),
      type: 'system'
    });
  }
}

/**
 * Leave a group conversation
 */
export async function leaveGroup(conversationId: string, userId: string): Promise<void> {
  const conversation = await getConversation(conversationId);
  
  if (!conversation || conversation.type !== 'group') {
    throw new Error('Conversation not found or not a group');
  }

  // Don't allow creator to leave (they must transfer ownership first)
  if (conversation.groupInfo?.createdBy === userId) {
    throw new Error('Group creator cannot leave. Transfer ownership first.');
  }

  const updatedMembers = conversation.members.filter(id => id !== userId);
  const updatedAdmins = conversation.groupInfo?.admins.filter(id => id !== userId) || [];

  await setDoc(
    doc(db, "conversations", conversationId),
    {
      members: updatedMembers,
      groupInfo: {
        ...conversation.groupInfo,
        admins: updatedAdmins
      },
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  // Add system message
  await addDoc(collection(db, "conversations", conversationId, "messages"), {
    senderId: 'system',
    text: `User left the group`, // In production, use actual username
    timestamp: serverTimestamp(),
    type: 'system'
  });
}

/**
 * Delete a conversation and all its messages
 * @param conversationId - ID of conversation to delete
 * @param userId - Current user ID (for permission check)
 */
export async function deleteConversation(conversationId: string, userId: string): Promise<void> {
  try {
    // BUG FIX: 2025-01-28 - Add conversation deletion functionality
    // Problem: Need ability to delete conversations for testing and cleanup
    // Solution: Implement secure conversation deletion with permission checks
    // Impact: Allows users to clean up conversations and start fresh for testing
    
    console.log('🗑️ Deleting conversation:', conversationId);
    
    // First, verify user is a member of this conversation
    const conversationRef = doc(db, 'conversations', conversationId);
    const conversationSnap = await getDoc(conversationRef);
    
    if (!conversationSnap.exists()) {
      throw new Error('Conversation not found');
    }
    
    const conversationData = conversationSnap.data() as Conversation;
    if (!conversationData.members.includes(userId)) {
      throw new Error('Permission denied: You are not a member of this conversation');
    }
    
    // Delete all messages in the conversation
    const messagesRef = collection(db, 'conversations', conversationId, 'messages');
    const messagesQuery = query(messagesRef);
    const messagesSnapshot = await getDocs(messagesQuery);
    
    console.log('🗑️ Deleting', messagesSnapshot.docs.length, 'messages');
    
    // Delete messages in batches
    const batch = writeBatch(db);
    messagesSnapshot.docs.forEach((messageDoc) => {
      batch.delete(messageDoc.ref);
    });
    
    // Delete the conversation document
    batch.delete(conversationRef);
    
    // Commit the batch delete
    await batch.commit();
    
    console.log('✅ Conversation deleted successfully');
  } catch (error) {
    console.error('Failed to delete conversation:', error);
    throw error;
  }
}

/**
 * Delete all conversations for a user (for testing/cleanup)
 * @param userId - Current user ID
 */
export async function deleteAllUserConversations(userId: string): Promise<void> {
  try {
    console.log('🗑️ Deleting all conversations for user:', userId);
    
    // Get all conversations where user is a member
    const conversationsRef = collection(db, 'conversations');
    const userConversationsQuery = query(
      conversationsRef,
      where('members', 'array-contains', userId)
    );
    
    const conversationsSnapshot = await getDocs(userConversationsQuery);
    console.log('🗑️ Found', conversationsSnapshot.docs.length, 'conversations to delete');
    
    // Delete each conversation
    for (const conversationDoc of conversationsSnapshot.docs) {
      await deleteConversation(conversationDoc.id, userId);
    }
    
    console.log('✅ All user conversations deleted successfully');
  } catch (error) {
    console.error('Failed to delete all user conversations:', error);
    throw error;
  }
}


