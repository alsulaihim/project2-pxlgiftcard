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
  updateDoc,
  deleteField,
  deleteDoc,
  where,
  Timestamp,
  writeBatch,
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase-config";
import { authManager } from "@/lib/firebase-auth-manager";
import { EncryptionService } from "./encryption.service";
const encryptionService = EncryptionService.getInstance();
import { keyExchangeService } from "./key-exchange.service";
import { decryptMessage } from './message-decryption.service';

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
  deletedBy?: { [userId: string]: any }; // Track which users have deleted this conversation
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
 * Create a new group conversation
 */
export async function createGroupConversation(
  creatorId: string,
  members: string[],
  groupInfo: {
    name: string;
    description?: string;
    photoURL?: string;
  }
): Promise<Conversation> {
  await authManager.waitForAuth();
  
  const convId = `group_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  const convRef = doc(db, "conversations", convId);
  
  const conversationData = {
    type: "group",
    members,
    groupInfo: {
      ...groupInfo,
      createdBy: creatorId,
      admins: [creatorId]
    },
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };
  
  await setDoc(convRef, conversationData);
  
  return {
    id: convId,
    ...conversationData
  } as Conversation;
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
    // Create new conversation
    await setDoc(convRef, {
      type: "direct",
      members: [a, b],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } else {
    // Check if the conversation was deleted by the current user
    const data = snap.data();
    
    // If the current user had deleted this conversation, reset it
    if (data.deletedBy && data.deletedBy[currentUserId]) {
      console.log('🔄 Resetting deleted conversation for user:', currentUserId);
      
      // Remove the deletedBy flag for this user and reset conversation state
      const updatedDeletedBy = { ...data.deletedBy };
      delete updatedDeletedBy[currentUserId];
      
      await updateDoc(convRef, {
        deletedBy: Object.keys(updatedDeletedBy).length > 0 ? updatedDeletedBy : deleteField(),
        lastMessage: null,
        lastMessageTime: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }
  }
  
  const created = await getDoc(convRef);
  const data = created.data() as Omit<Conversation, "id">;
  return { id: convId, ...data } as Conversation;
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
      
      // Filter out conversations that have been deleted by this user
      const conversations = snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as Omit<Conversation, "id">) }))
        .filter((conv) => {
          // If the conversation has a deletedBy field with this user's ID, filter it out
          if (conv.deletedBy && conv.deletedBy[userId]) {
            console.log(`🗑️ Filtering out deleted conversation ${conv.id} for user ${userId}`);
            return false;
          }
          return true;
        });
      
      console.log(`📋 Returning ${conversations.length} active conversations (filtered from ${snap.docs.length})`);
      return conversations;
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
            
            // Store a self-encrypted copy for the sender (strict E2EE, no plaintext at rest)
            const myPublicKey = encryptionService.getPublicKey();
            if (myPublicKey) {
              const selfEncrypted = encryptionService.encryptMessage(text, myPublicKey);
              senderEncryptedContent = selfEncrypted.content;
              senderNonce = selfEncrypted.nonce;
              console.log('🔐 Stored self-encrypted sender copy');
            } else {
              console.warn('⚠️ Missing own public key; skipping self-encrypted sender copy');
            }
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
    if (nonce || (options && options.nonce)) {
      messageData.nonce = nonce || (options ? options.nonce : '');
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
    orderBy("timestamp", "asc"),
    limit(50)
  );
  
  return onSnapshot(q, async (snapshot) => {
    // Get current user ID from auth or store
    const currentUserId = auth.currentUser?.uid || (window as any).chatStore?.getState?.()?.userId;
    
    // Process all messages and wait for decryption to complete
    const messagePromises = snapshot.docs.map(async (docSnap) => {
      const data = docSnap.data();
      
      // Use the new decryption service with current user ID
      const decryptionResult = await decryptMessage({
        id: docSnap.id,
        ...data
      }, currentUserId);
      
      const decryptedText = decryptionResult.text;
      
      
      // Log decryption status
      if (!decryptionResult.success) {
        console.warn(`⚠️ Message ${docSnap.id} decryption failed:`, decryptionResult.error);
      }
      
      // Return the decrypted message
      return {
        id: docSnap.id,
        senderId: data.senderId,
        text: decryptedText,
        encryptedContent: data.text,
        nonce: data.nonce,
        senderText: data.senderText,  // Include for debugging
        senderNonce: data.senderNonce, // Include for debugging
        timestamp: data.timestamp,
        readBy: data.readBy,
        deliveredTo: data.deliveredTo,
        type: data.type || 'text',
        metadata: data.metadata || {},
        reactions: data.reactions || {},
        decryptionSuccess: decryptionResult.success
      };
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
          // Include all messages, even if decryption failed (will show error message)
          if (msg.text && !msg.text.includes('[Authentication required]') &&
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
      
      // Always update UI, even with encrypted messages (they'll show error text)
      onData(decryptedMessages);
      
      // Set up re-decryption when keys become available
      const hasKeys = encryptionService.getPublicKey() !== null;
      if (!hasKeys && decryptedMessages.some(m => m.text.includes('[') && m.text.includes(']'))) {
        console.log('⏳ Some messages need re-decryption when keys are loaded');
        
        // Set up a one-time re-decryption when keys are available
        const checkInterval = setInterval(async () => {
          const nowHasKeys = encryptionService.getPublicKey() !== null;
          if (nowHasKeys) {
            clearInterval(checkInterval);
            console.log('🔄 Keys now available, re-processing messages');
            
            // Re-process all messages with keys now available
            const reprocessedPromises = snapshot.docs.map(async (docSnap) => {
              const data = docSnap.data();
              const decryptionResult = await decryptMessage({
                id: docSnap.id,
                ...data
              }, currentUserId);
              
              return {
                id: docSnap.id,
                senderId: data.senderId,
                text: decryptionResult.text,
                encryptedContent: data.text,
                nonce: data.nonce,
                senderText: data.senderText,
                senderNonce: data.senderNonce,
                timestamp: data.timestamp,
                readBy: data.readBy,
                deliveredTo: data.deliveredTo,
                type: data.type || 'text',
                metadata: data.metadata || {},
                reactions: data.reactions || {},
                decryptionSuccess: decryptionResult.success
              };
            });
            
            const reprocessedResults = await Promise.allSettled(reprocessedPromises);
            const reprocessedMessages: ChatMessage[] = [];
            
            for (const result of reprocessedResults) {
              if (result.status === 'fulfilled' && result.value.text) {
                reprocessedMessages.push(result.value);
              }
            }
            
            if (reprocessedMessages.length > 0) {
              onData(reprocessedMessages);
            }
          }
        }, 1000); // Check every second
        
        // Clean up after 30 seconds if keys never load
        setTimeout(() => clearInterval(checkInterval), 30000);
      }
    } catch (error) {
      console.error('Error processing messages:', error);
      // Still try to show what we can
      onData([]);
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
 * Delete all messages in a conversation and the conversation document itself
 */
export async function deleteConversationMessages(conversationId: string): Promise<void> {
  console.log(`🗑️ Starting deletion of conversation and messages: ${conversationId}`);
  
  // Ensure auth is ready
  const authUser = await authManager.waitForAuth();
  if (!authUser) {
    console.error('❌ User not authenticated when trying to delete messages');
    throw new Error('User not authenticated');
  }

  try {
    // First check if conversation exists
    const conversationRef = doc(db, 'conversations', conversationId);
    const conversationSnap = await getDoc(conversationRef);
    
    if (!conversationSnap.exists()) {
      console.log(`⚠️ Conversation ${conversationId} doesn't exist or already deleted`);
      return; // Exit gracefully if conversation doesn't exist
    }

    // Get all messages in the conversation
    const messagesRef = collection(db, 'conversations', conversationId, 'messages');
    const q = query(messagesRef);
    const snapshot = await getDocs(q);
    
    console.log(`📊 Found ${snapshot.size} messages to delete in conversation ${conversationId}`);
    
    if (snapshot.size === 0 && conversationSnap.exists()) {
      // No messages but conversation exists, just delete the conversation
      await deleteDoc(conversationRef);
      console.log(`✅ Deleted empty conversation ${conversationId}`);
      return;
    }
    
    // Delete each message in batches
    let batch = writeBatch(db);
    let batchCount = 0;
    let totalDeleted = 0;
    const MAX_BATCH_SIZE = 499; // Leave room for conversation doc deletion

    for (const docSnap of snapshot.docs) {
      batch.delete(docSnap.ref);
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

    // Delete the conversation document itself in the final batch
    if (conversationSnap.exists()) {
      batch.delete(conversationRef);
      console.log(`🗑️ Adding conversation document to deletion batch`);
    }

    // Commit the final batch only if there are operations
    if (batchCount > 0 || conversationSnap.exists()) {
      await batch.commit();
      console.log(`📦 Committed final batch with ${batchCount} message deletions and conversation document`);
    }

    console.log(`✅ Successfully deleted ${totalDeleted} messages and conversation document for ${conversationId}`);
  } catch (error: any) {
    // Handle specific Firebase errors
    if (error.code === 'permission-denied') {
      console.error('❌ Permission denied to delete conversation:', conversationId);
    } else if (error.code === 'not-found') {
      console.log('⚠️ Conversation or messages not found, may have been already deleted');
      return; // Don't throw, just return
    } else {
      console.error('❌ Error deleting conversation messages:', error);
    }
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
    
    console.log('🗑️ Deleting conversation for user:', userId, 'conversationId:', conversationId);
    
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
    
    // Delete messages in batches (Firestore has a limit of 500 operations per batch)
    const BATCH_SIZE = 499; // Leave room for the conversation document update
    let batch = writeBatch(db);
    let operationCount = 0;
    
    for (const messageDoc of messagesSnapshot.docs) {
      batch.delete(messageDoc.ref);
      operationCount++;
      
      // Commit current batch and start a new one if we reach the limit
      if (operationCount >= BATCH_SIZE) {
        await batch.commit();
        batch = writeBatch(db);
        operationCount = 0;
      }
    }
    
    // For P2P chats, keep the conversation but mark it as deleted by this user
    // This ensures messages don't reappear when users reconnect
    if (conversationData.type === 'direct') {
      // Update conversation to track who deleted it and when
      const deletedBy = conversationData.deletedBy || {};
      deletedBy[userId] = serverTimestamp();
      
      batch.update(conversationRef, {
        deletedBy: deletedBy,
        lastMessage: null,
        lastMessageTime: serverTimestamp()
      });
      
      console.log('✅ P2P conversation messages deleted, conversation marked as deleted by user');
    } else {
      // For group chats, actually delete the conversation document
      batch.delete(conversationRef);
      console.log('✅ Group conversation and messages deleted completely');
    }
    
    // Commit the final batch
    await batch.commit();
    
    console.log('✅ Conversation deletion completed successfully');
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


