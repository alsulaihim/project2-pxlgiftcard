/**
 * Firebase Admin SDK service for server-side operations
 * Handles authentication, Firestore operations, and user management
 */

import admin from 'firebase-admin';
import * as path from 'path';
import { logger } from './logger.service';

export class FirebaseService {
  private static instance: FirebaseService;
  private db: admin.firestore.Firestore | null = null;
  private auth: admin.auth.Auth | null = null;

  private constructor() {
    this.initializeFirebase();
  }

  public static getInstance(): FirebaseService {
    if (!FirebaseService.instance) {
      FirebaseService.instance = new FirebaseService();
    }
    return FirebaseService.instance;
  }

  private initializeFirebase(): void {
    try {
      // Check if Firebase is already initialized
      if (admin.apps.length === 0) {
        const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
        
        if (serviceAccountPath) {
          // Initialize with service account
          const serviceAccount = require(path.resolve(serviceAccountPath));
          admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            projectId: process.env.FIREBASE_PROJECT_ID || 'pxl-perfect-1'
          });
          logger.info('✅ Firebase Admin SDK initialized with service account');
        } else {
          // Try application default credentials
          admin.initializeApp({
            projectId: process.env.FIREBASE_PROJECT_ID || 'pxl-perfect-1'
          });
          logger.info('✅ Firebase Admin SDK initialized with default credentials');
        }
      }
      
      this.db = admin.firestore();
      this.auth = admin.auth();
      logger.info('✅ Firebase services ready');
    } catch (error) {
      logger.error('❌ Failed to initialize Firebase Admin SDK:', error);
      logger.info('🔧 TEMP: Continuing without Firebase for debugging');
    }
  }

  /**
   * Verify Firebase ID token and return user data
   */
  public async verifyIdToken(token: string): Promise<admin.auth.DecodedIdToken> {
    try {
      const decodedToken = await this.auth.verifyIdToken(token);
      logger.debug(`🔐 Token verified for user: ${decodedToken.uid}`);
      return decodedToken;
    } catch (error) {
      logger.error('❌ Token verification failed:', error);
      throw new Error('Invalid authentication token');
    }
  }

  /**
   * Get user data from Firestore
   */
  public async getUserData(uid: string): Promise<any> {
    // TEMP: Return mock data if Firebase is not initialized
    if (!this.db) {
      logger.debug(`🔧 TEMP: Returning mock user data for ${uid}`);
      return {
        uid,
        displayName: 'Test User',
        email: 'test@example.com',
        tier: 'pro'
      };
    }
    
    try {
      const userDoc = await this.db.collection('users').doc(uid).get();
      
      if (!userDoc.exists) {
        throw new Error('User not found');
      }
      
      const userData = userDoc.data();
      logger.debug(`👤 Retrieved user data for: ${uid}`);
      
      return {
        uid,
        ...userData,
        tier: userData?.tier || 'starter'
      };
    } catch (error) {
      logger.error(`❌ Failed to get user data for ${uid}:`, error);
      throw error;
    }
  }

  /**
   * Save message to Firestore
   */
  public async saveMessage(conversationId: string, messageData: any): Promise<string> {
    // TEMP: Return mock message ID if Firebase is not initialized
    if (!this.db) {
      const mockId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      logger.debug(`🔧 TEMP: Mock message saved: ${mockId} in conversation: ${conversationId}`);
      return mockId;
    }
    
    try {
      const messageRef = await this.db
        .collection('conversations')
        .doc(conversationId)
        .collection('messages')
        .add({
          ...messageData,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          delivered: [messageData.senderId],
          read: []
        });

      // Extract members from conversation ID for direct messages
      let members: string[] = [];
      if (conversationId.startsWith('direct_')) {
        const parts = conversationId.replace('direct_', '').split('_');
        if (parts.length === 2) {
          members = parts;
        }
      }

      // Update conversation's last message (use set with merge to create if doesn't exist)
      const conversationUpdate: any = {
        lastMessage: {
          text: messageData.text || messageData.senderText,
          senderId: messageData.senderId,
          timestamp: admin.firestore.FieldValue.serverTimestamp()
        },
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      // Add members and type if this is a new conversation
      if (members.length > 0) {
        conversationUpdate.members = members;
        conversationUpdate.type = 'direct';
        conversationUpdate.createdAt = admin.firestore.FieldValue.serverTimestamp();
      }

      await this.db
        .collection('conversations')
        .doc(conversationId)
        .set(conversationUpdate, { merge: true });

      logger.debug(`💬 Message saved: ${messageRef.id} in conversation: ${conversationId}`);
      return messageRef.id;
    } catch (error) {
      logger.error(`❌ Failed to save message to ${conversationId}:`, error);
      throw error;
    }
  }

  /**
   * Get conversation data
   */
  public async getConversation(conversationId: string): Promise<any> {
    // TEMP: Return mock conversation if Firebase is not initialized
    if (!this.db) {
      logger.debug(`🔧 TEMP: Returning mock conversation for ${conversationId}`);
      return {
        id: conversationId,
        members: ['test-user-123', 'other-user'],
        participants: ['test-user-123', 'other-user'],
        type: 'direct',
        createdAt: new Date(),
        updatedAt: new Date()
      };
    }
    
    try {
      const conversationDoc = await this.db
        .collection('conversations')
        .doc(conversationId)
        .get();

      if (!conversationDoc.exists) {
        throw new Error('Conversation not found');
      }

      return {
        id: conversationId,
        ...conversationDoc.data()
      };
    } catch (error) {
      logger.error(`❌ Failed to get conversation ${conversationId}:`, error);
      throw error;
    }
  }

  /**
   * Update message delivery status
   */
  public async updateMessageDelivery(
    conversationId: string, 
    messageId: string, 
    userId: string
  ): Promise<void> {
    // TEMP: Skip if Firebase is not initialized
    if (!this.db) {
      logger.debug(`🔧 TEMP: Mock delivery update for message ${messageId} to ${userId}`);
      return;
    }
    
    try {
      await this.db
        .collection('conversations')
        .doc(conversationId)
        .collection('messages')
        .doc(messageId)
        .update({
          delivered: admin.firestore.FieldValue.arrayUnion(userId)
        });

      logger.debug(`✅ Message ${messageId} marked as delivered to ${userId}`);
    } catch (error) {
      logger.error(`❌ Failed to update delivery status:`, error);
      throw error;
    }
  }

  /**
   * Update message read status
   */
  public async updateMessageRead(
    conversationId: string, 
    messageIds: string[], 
    userId: string
  ): Promise<void> {
    // TEMP: Skip if Firebase is not initialized
    if (!this.db) {
      logger.debug(`🔧 TEMP: Mock read update for ${messageIds.length} messages by ${userId}`);
      return;
    }
    
    try {
      const batch = this.db.batch();
      
      messageIds.forEach(messageId => {
        const messageRef = this.db
          .collection('conversations')
          .doc(conversationId)
          .collection('messages')
          .doc(messageId);
        
        batch.update(messageRef, {
          read: admin.firestore.FieldValue.arrayUnion(userId)
        });
      });

      await batch.commit();
      logger.debug(`📖 ${messageIds.length} messages marked as read by ${userId}`);
    } catch (error) {
      logger.error(`❌ Failed to update read status:`, error);
      throw error;
    }
  }

  /**
   * Get Firestore instance
   */
  public getFirestore(): admin.firestore.Firestore | null {
    return this.db;
  }

  /**
   * Get Auth instance
   */
  public getAuth(): admin.auth.Auth | null {
    return this.auth;
  }
}

export const firebaseService = FirebaseService.getInstance();
