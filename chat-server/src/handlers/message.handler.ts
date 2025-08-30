/**
 * Message handler for Socket.io events
 * Handles real-time message sending, delivery, and read receipts
 */

import { Server } from 'socket.io';
import { AuthenticatedSocket, checkConversationMembership, rateLimitMessages } from '../middleware/auth.middleware';
import { firebaseService } from '../services/firebase.service';
import { logger } from '../services/logger.service';

export interface MessageData {
  conversationId: string;
  type: 'text' | 'image' | 'file' | 'voice';
  text?: string;
  nonce?: string;
  senderText?: string;
  senderNonce?: string;
  replyTo?: string;
  metadata?: {
    fileName?: string;
    fileSize?: number;
    mimeType?: string;
    duration?: number;
  };
}

export interface DeliveryData {
  messageId: string;
  conversationId: string;
}

export interface ReadData {
  conversationId: string;
  messageIds: string[];
}

export class MessageHandler {
  constructor(private io: Server) {}

  /**
   * Handle message sending
   */
  public handleMessageSend = async (
    socket: AuthenticatedSocket, 
    data: MessageData
  ): Promise<string> => {
    try {
      const { conversationId, type, text, nonce, senderText, senderNonce, replyTo, metadata } = data;
      
      // Validate required fields
      if (!conversationId || !type) {
        socket.emit('message:error', { error: 'Missing required fields' });
        throw new Error('Missing required fields');
      }

      // Check rate limiting
      if (!rateLimitMessages(socket)) {
        socket.emit('message:error', { error: 'Rate limit exceeded' });
        throw new Error('Rate limit exceeded');
      }

      // Verify conversation membership
      const isMember = await checkConversationMembership(socket, conversationId);
      if (!isMember) {
        socket.emit('message:error', { error: 'Not a member of this conversation' });
        throw new Error('Not a member of this conversation');
      }

      // Prepare message data
      const messageData: any = {
        senderId: socket.data.userId,
        type: type || 'text',
        text: text || '',
        nonce: nonce || '',
        senderText: senderText || '',
        senderNonce: senderNonce || '',
        metadata: metadata || {}
      };
      
      // Only add replyTo if it exists
      if (replyTo) {
        messageData.replyTo = replyTo;
      }

      // Save message to Firestore
      let messageId: string;
      let members: string[] = [];
      
      try {
        messageId = await firebaseService.saveMessage(conversationId, messageData);
        const conversation = await firebaseService.getConversation(conversationId);
        members = conversation.members || [];
      } catch (error: any) {
        // If Firestore is unavailable, generate a temporary message ID and continue
        if (error.code === 7 || error.message?.includes('PERMISSION_DENIED')) {
          logger.warn(`⚠️ Firestore unavailable, using fallback for message handling`);
          messageId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          
          // Extract members from conversation ID for direct messages
          if (conversationId.startsWith('direct_')) {
            const parts = conversationId.replace('direct_', '').split('_');
            if (parts.length === 2) {
              members = parts;
            } else {
              // Fallback to sender and try to find recipient
              members = [socket.data.userId];
            }
          } else {
            // For group chats, we need at least the sender
            members = [socket.data.userId];
          }
          
          logger.info(`📝 Using fallback members: ${members.join(', ')}`);
        } else {
          logger.error('Failed to save message to Firestore:', error);
          throw error;
        }
      }

      // Prepare broadcast message
      const broadcastMessage: any = {
        id: messageId,
        conversationId,
        senderId: socket.data.userId,
        type: type || 'text',
        text: text || '',
        nonce: nonce || '',
        senderText: senderText || '',
        senderNonce: senderNonce || '',
        timestamp: new Date(),
        delivered: [socket.data.userId],
        read: [],
        metadata: metadata || {},
        sender: {
          displayName: socket.data.displayName,
          photoURL: socket.data.photoURL,
          tier: socket.data.tier
        }
      };
      
      // Only add replyTo if it exists
      if (replyTo) {
        broadcastMessage.replyTo = replyTo;
      }

      // Normalize conversation ID for room broadcasting
      const normalizeId = (id: string) => {
        if (!id.startsWith('direct_')) return id;
        const parts = id.replace('direct_', '').split('_');
        if (parts.length !== 2) return id;
        return `direct_${parts.sort().join('_')}`;
      };
      
      const normalizedConversationId = normalizeId(conversationId);
      
      // Broadcast to conversation room AND individual user rooms
      logger.info(`📢 Broadcasting message to conversation room: ${normalizedConversationId}`);
      this.io.to(`conversation:${normalizedConversationId}`).emit('message:new', broadcastMessage);
      
      // Also broadcast to individual user rooms for users not in the conversation room
      logger.info(`📢 Broadcasting message to members: ${members.join(', ')}`);
      members.forEach((memberId: string) => {
        logger.debug(`📤 Emitting message:new to user:${memberId}`);
        this.io.to(`user:${memberId}`).emit('message:new', broadcastMessage);
      });

      // Send confirmation to sender
      socket.emit('message:sent', { 
        messageId, 
        conversationId,
        timestamp: new Date()
      });

      logger.info(`💬 Message sent: ${messageId} from ${socket.data.userId} to conversation: ${conversationId}`);
      
      return messageId;

    } catch (error) {
      logger.error('❌ Failed to handle message send:', error);
      socket.emit('message:error', { 
        error: 'Failed to send message',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  };

  /**
   * Handle message delivery acknowledgment
   */
  public handleMessageDelivered = async (
    socket: AuthenticatedSocket, 
    data: DeliveryData
  ): Promise<void> => {
    try {
      logger.info(`📬 Received delivery confirmation from ${socket.data.userId}`, data);
      const { messageId, conversationId } = data;

      if (!messageId || !conversationId) {
        logger.warn('Missing messageId or conversationId in delivery data');
        return;
      }

      // Update delivery status in Firestore
      let members: string[] = [];
      try {
        await firebaseService.updateMessageDelivery(conversationId, messageId, socket.data.userId);
        // Get conversation members
        const conversation = await firebaseService.getConversation(conversationId);
        members = conversation.members || [];
      } catch (error: any) {
        if (error.code === 7 || error.message?.includes('PERMISSION_DENIED')) {
          logger.warn(`⚠️ Firestore unavailable for delivery update, using fallback`);
          // For direct messages, extract members from conversationId
          if (conversationId.startsWith('direct_')) {
            const parts = conversationId.replace('direct_', '').split('_');
            if (parts.length === 2) {
              members = parts;
            } else {
              members = [socket.data.userId];
            }
          } else {
            // For group chats, we need at least the sender
            members = [socket.data.userId];
          }
        } else {
          throw error;
        }
      }

      // Broadcast delivery status to conversation members
      logger.info(`📢 Broadcasting delivery status to members: ${members.join(', ')}`);
      members.forEach((memberId: string) => {
        logger.debug(`📤 Emitting message:delivered to user:${memberId}`);
        this.io.to(`user:${memberId}`).emit('message:delivered', {
          messageId,
          userId: socket.data.userId,
          conversationId
        });
      });

      logger.info(`✅ Message ${messageId} marked as delivered by ${socket.data.userId}`);

    } catch (error) {
      logger.error('❌ Failed to handle message delivery:', error);
    }
  };

  /**
   * Handle message read acknowledgment
   */
  public handleMessageRead = async (
    socket: AuthenticatedSocket, 
    data: ReadData
  ): Promise<void> => {
    try {
      const { conversationId, messageIds } = data;

      if (!conversationId || !messageIds?.length) {
        return;
      }

      // Verify conversation membership
      const isMember = await checkConversationMembership(socket, conversationId);
      if (!isMember) {
        return;
      }

      // Update read status in Firestore
      let members: string[] = [];
      try {
        await firebaseService.updateMessageRead(conversationId, messageIds, socket.data.userId);
        // Get conversation members
        const conversation = await firebaseService.getConversation(conversationId);
        members = conversation.members || [];
      } catch (error: any) {
        if (error.code === 7 || error.message?.includes('PERMISSION_DENIED')) {
          logger.warn(`⚠️ Firestore unavailable for read update, using fallback`);
          // For direct messages, extract members from conversationId
          if (conversationId.startsWith('direct_')) {
            const parts = conversationId.replace('direct_', '').split('_');
            if (parts.length === 2) {
              members = parts;
            } else {
              members = [socket.data.userId];
            }
          } else {
            // For group chats, we need at least the sender
            members = [socket.data.userId];
          }
        } else {
          throw error;
        }
      }

      // Broadcast read status to conversation members
      members.forEach((memberId: string) => {
        this.io.to(`user:${memberId}`).emit('message:read', {
          conversationId,
          messageIds,
          userId: socket.data.userId
        });
      });

      logger.debug(`📖 ${messageIds.length} messages marked as read by ${socket.data.userId}`);

    } catch (error) {
      logger.error('❌ Failed to handle message read:', error);
    }
  };

  /**
   * Register all message event handlers
   */
  public registerHandlers(socket: AuthenticatedSocket): void {
    socket.on('message:send', async (data: MessageData, callback?: Function) => {
      try {
        const result = await this.handleMessageSend(socket, data);
        if (callback) {
          callback(null, { 
            success: true, 
            messageId: result,
            timestamp: new Date().toISOString()
          });
        }
      } catch (error: any) {
        if (callback) {
          callback(error.message || 'Failed to send message');
        }
      }
    });
    socket.on('message:delivered', (data: DeliveryData) => this.handleMessageDelivered(socket, data));
    socket.on('message:read', (data: ReadData, callback?: Function) => {
      this.handleMessageRead(socket, data);
      if (callback) {
        callback(null, { success: true });
      }
    });
    
    logger.debug(`📝 Message handlers registered for socket: ${socket.id}`);
  }
}

