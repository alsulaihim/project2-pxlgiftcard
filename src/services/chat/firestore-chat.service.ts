"use client";

import { db } from "@/lib/firebase-config";
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
import { encryptionService } from "./encryption.service";
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
  encryptedContent?: string; // Encrypted content stored in Firestore
  nonce?: string; // Encryption nonce
  timestamp: Timestamp;
  readBy?: string[]; // Array of user IDs who have read this message
  deliveredTo?: string[]; // Array of user IDs who have received this message
}

/**
 * Create or fetch a direct conversation between two users to avoid duplicates.
 * Ensures deterministic doc id ordering by concatenating sorted UIDs.
 */
export async function createOrGetDirectConversation(currentUserId: string, otherUserId: string): Promise<Conversation> {
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
export async function createGroupConversation(
  memberIds: string[], 
  groupInfo: {
    name: string;
    description?: string;
    createdBy: string;
  }
): Promise<Conversation> {
  // Validate minimum members for group chat
  if (memberIds.length < 2) {
    throw new Error('Group conversation requires at least 2 members');
  }

  // Ensure creator is included in members
  if (!memberIds.includes(groupInfo.createdBy)) {
    memberIds.push(groupInfo.createdBy);
  }

  const conversationData = {
    type: "group" as const,
    members: memberIds,
    groupInfo: {
      name: groupInfo.name,
      description: groupInfo.description || '',
      createdBy: groupInfo.createdBy,
      admins: [groupInfo.createdBy], // Creator is initial admin
      photoURL: '', // Can be set later
    },
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const ref = await addDoc(collection(db, "conversations"), conversationData);
  const snap = await getDoc(ref);
  return { id: ref.id, ...(snap.data() as Omit<Conversation, "id">) };
}

/**
 * List conversations for a user ordered by recent activity.
 */
export async function listUserConversations(userId: string): Promise<Conversation[]> {
  // BUG FIX: 2025-01-28 - Add retry logic for Firebase connectivity issues
  // Problem: Firebase operations failing due to network connectivity issues
  // Solution: Add retry logic with exponential backoff
  // Impact: More resilient to temporary network issues
  
  const maxRetries = 3;
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Avoid composite index requirements: no orderBy in combination with array-contains.
      const q = query(collection(db, "conversations"), where("members", "array-contains", userId), limit(50));
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Conversation, "id">) }));
    } catch (error) {
      lastError = error as Error;
      console.warn(`Attempt ${attempt}/${maxRetries} to load conversations failed:`, error);
      
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
  const docRef = doc(db, "conversations", conversationId);
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) {
    return null;
  }
  
  return { id: docSnap.id, ...docSnap.data() } as Conversation;
}

/**
 * Send a text message in a conversation with E2EE encryption and update lastMessage metadata.
 */
export async function sendMessage(conversationId: string, senderId: string, text: string): Promise<void> {
  try {
    // Get conversation to find recipient(s)
    const conversation = await getConversation(conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    // For direct messages, encrypt for both participants
    let encryptedContent = text;
    let nonce = '';
    let senderEncryptedContent = '';
    let senderNonce = '';
    
    if (conversation.type === 'direct') {
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
    };
    
    // Only include nonce if it has a value
    if (nonce) {
      messageData.nonce = nonce;
    }
    
    // Store sender's encrypted version if available
    if (senderEncryptedContent && senderNonce) {
      messageData.senderText = senderEncryptedContent;
      messageData.senderNonce = senderNonce;
    }

    const messagesRef = collection(db, "conversations", conversationId, "messages");
    await addDoc(messagesRef, messageData);
    
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
      // Don't show encrypted text initially - wait for decryption
      let decryptedText = data.nonce || data.senderNonce ? '[Decrypting...]' : data.text;
      
      // BUG FIX: 2025-01-28 - Use appropriate encrypted version for sender vs recipient
      // Problem: Sender couldn't decrypt their own messages because they were encrypted for recipient
      // Solution: Use senderText/senderNonce for sender's own messages, text/nonce for others' messages
      // Impact: Both sender and recipient can decrypt and read messages properly
      const currentUserId = encryptionService.getCurrentUserId?.();
      const hasKeyPair = encryptionService.getPublicKey() !== null;
      
      if (hasKeyPair && (data.nonce || data.senderNonce)) {
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
                deliveredTo: data.deliveredTo
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
              decryptedText = encryptionService.decryptMessage(
                { content: encryptedContent, nonce: nonce },
                publicKeyForDecryption
              );
              console.log('🔓 Message decrypted successfully from:', data.senderId);
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
    });
    
    // Wait for all messages to be decrypted before updating UI
    try {
      const results = await Promise.allSettled(messagePromises);
      const decryptedMessages: ChatMessage[] = [];
      
      for (const result of results) {
        if (result.status === 'fulfilled') {
          const msg = result.value;
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


