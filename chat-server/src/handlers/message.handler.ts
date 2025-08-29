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
      const messageData = {
        senderId: socket.data.userId,
        type,
        text,
        nonce,
        senderText,
        senderNonce,
        replyTo,
        metadata
      };

      // Save message to Firestore
      const messageId = await firebaseService.saveMessage(conversationId, messageData);

      // Get conversation members for broadcasting
      const conversation = await firebaseService.getConversation(conversationId);
      const members = conversation.members || [];

      // Prepare broadcast message
      const broadcastMessage = {
        id: messageId,
        conversationId,
        senderId: socket.data.userId,
        type,
        text,
        nonce,
        senderText,
        senderNonce,
        timestamp: new Date(),
        delivered: [socket.data.userId],
        read: [],
        replyTo,
        metadata,
        sender: {
          displayName: socket.data.displayName,
          photoURL: socket.data.photoURL,
          tier: socket.data.tier
        }
      };

      // Broadcast to all conversation members
      members.forEach((memberId: string) => {
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
      const { messageId, conversationId } = data;

      if (!messageId || !conversationId) {
        return;
      }

      // Update delivery status in Firestore
      await firebaseService.updateMessageDelivery(conversationId, messageId, socket.data.userId);

      // Get conversation members
      const conversation = await firebaseService.getConversation(conversationId);
      const members = conversation.members || [];

      // Broadcast delivery status to conversation members
      members.forEach((memberId: string) => {
        this.io.to(`user:${memberId}`).emit('message:delivered', {
          messageId,
          userId: socket.data.userId,
          conversationId
        });
      });

      logger.debug(`✅ Message ${messageId} delivered to ${socket.data.userId}`);

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
      await firebaseService.updateMessageRead(conversationId, messageIds, socket.data.userId);

      // Get conversation members
      const conversation = await firebaseService.getConversation(conversationId);
      const members = conversation.members || [];

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

