/**
 * Firebase service for Socket.io server
 * Handles Firestore operations and Realtime Database presence
 * As specified in chat-architecture.mdc
 */

import admin from 'firebase-admin';

export interface Message {
  senderId: string;
  type: 'text' | 'image' | 'file' | 'voice';
  content: string;
  nonce: string;
  delivered: string[];
  read: string[];
  replyTo?: string;
  metadata?: {
    fileName?: string;
    fileSize?: number;
    mimeType?: string;
    duration?: number;
  };
}

export interface Conversation {
  id: string;
  type: 'direct' | 'group';
  members: string[];
  lastMessage?: {
    text: string;
    senderId: string;
    timestamp: admin.firestore.Timestamp;
  };
  createdAt: admin.firestore.Timestamp;
  updatedAt: admin.firestore.Timestamp;
}

export interface PresenceData {
  online: boolean;
  lastSeen: number;
  typing: Record<string, boolean>;
}

export class FirebaseService {
  private firestore = admin.firestore();
  private realtimeDb = admin.database();

  /**
   * Save message to Firestore
   */
  async saveMessage(conversationId: string, message: Message): Promise<string> {
    const messagesRef = this.firestore
      .collection('conversations')
      .doc(conversationId)
      .collection('messages');
    
    const docRef = await messagesRef.add({
      ...message,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // Update conversation's last message
    await this.firestore
      .collection('conversations')
      .doc(conversationId)
      .update({
        lastMessage: {
          text: message.content,
          senderId: message.senderId,
          timestamp: admin.firestore.FieldValue.serverTimestamp()
        },
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    
    return docRef.id;
  }

  /**
   * Get conversation by ID
   */
  async getConversation(conversationId: string): Promise<Conversation | null> {
    const doc = await this.firestore
      .collection('conversations')
      .doc(conversationId)
      .get();
    
    if (!doc.exists) {
      return null;
    }
    
    return { id: doc.id, ...doc.data() } as Conversation;
  }

  /**
   * Get message by ID
   */
  async getMessage(messageId: string): Promise<any | null> {
    // This requires knowing the conversation ID, which we'd need to store
    // For now, we'll implement a simpler version
    // In production, consider adding a messages collection at root level
    return null;
  }

  /**
   * Mark message as delivered
   */
  async markMessageDelivered(messageId: string, userId: string): Promise<void> {
    // Implementation would require conversation ID
    // For now, this is a placeholder
    console.log(`Marking message ${messageId} as delivered to ${userId}`);
  }

  /**
   * Mark message as read
   */
  async markMessageRead(messageId: string, userId: string): Promise<void> {
    // Implementation would require conversation ID
    // For now, this is a placeholder
    console.log(`Marking message ${messageId} as read by ${userId}`);
  }

  /**
   * Set user presence in Realtime Database
   */
  async setUserPresence(userId: string, presence: PresenceData): Promise<void> {
    const presenceRef = this.realtimeDb.ref(`presence/${userId}`);
    await presenceRef.set(presence);
  }

  /**
   * Set typing status for user in conversation
   */
  async setTypingStatus(userId: string, conversationId: string, typing: boolean): Promise<void> {
    const typingRef = this.realtimeDb.ref(`presence/${userId}/typing/${conversationId}`);
    await typingRef.set(typing);
  }

  /**
   * Get user profile data
   */
  async getUserProfile(userId: string): Promise<any | null> {
    const doc = await this.firestore
      .collection('users')
      .doc(userId)
      .get();
    
    if (!doc.exists) {
      return null;
    }
    
    return doc.data();
  }

  /**
   * Verify user is member of conversation
   */
  async verifyConversationMembership(conversationId: string, userId: string): Promise<boolean> {
    const conversation = await this.getConversation(conversationId);
    return conversation ? conversation.members.includes(userId) : false;
  }
}


