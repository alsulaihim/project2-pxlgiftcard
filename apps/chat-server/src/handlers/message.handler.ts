/**
 * Message handling for Socket.io server
 * Implements real-time message broadcasting with Firestore persistence
 * As specified in chat-architecture.mdc
 */

import { Socket } from 'socket.io';
import { FirebaseService } from '../services/firebase.service';

export interface MessageData {
  conversationId: string;
  type: 'text' | 'image' | 'file' | 'voice';
  content: string; // Encrypted content
  nonce: string;   // Encryption nonce
  replyTo?: string;
  metadata?: {
    fileName?: string;
    fileSize?: number;
    mimeType?: string;
    duration?: number;
  };
}

export class MessageHandler {
  constructor(private firebaseService: FirebaseService) {}

  /**
   * Handle new message sending with real-time broadcasting
   */
  async handleSendMessage(socket: Socket, data: MessageData) {
    const userId = socket.data.userId;
    
    try {
      // Validate conversation membership
      const conversation = await this.firebaseService.getConversation(data.conversationId);
      if (!conversation || !conversation.members.includes(userId)) {
        socket.emit('error', { message: 'Not a member of this conversation' });
        return;
      }
      
      // Save message to Firestore
      const messageId = await this.firebaseService.saveMessage(data.conversationId, {
        senderId: userId,
        type: data.type,
        content: data.content,
        nonce: data.nonce,
        replyTo: data.replyTo,
        metadata: data.metadata,
        delivered: [userId],
        read: []
      });
      
      // Create complete message object for broadcasting
      const message = {
        id: messageId,
        conversationId: data.conversationId,
        senderId: userId,
        type: data.type,
        content: data.content,
        nonce: data.nonce,
        timestamp: new Date().toISOString(),
        delivered: [userId],
        read: [],
        replyTo: data.replyTo,
        metadata: data.metadata
      };
      
      // Broadcast to all conversation members
      conversation.members.forEach(memberId => {
        socket.to(`user:${memberId}`).emit('message:new', message);
      });
      
      // Confirm to sender
      socket.emit('message:sent', { messageId, timestamp: message.timestamp });
      
      console.log(`📨 Message sent: ${messageId} in conversation ${data.conversationId}`);
      
    } catch (error) {
      console.error('Failed to send message:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  }

  /**
   * Handle message delivery confirmation
   */
  async handleMessageDelivered(socket: Socket, data: { messageId: string }) {
    const userId = socket.data.userId;
    
    try {
      await this.firebaseService.markMessageDelivered(data.messageId, userId);
      
      // Notify sender of delivery
      const message = await this.firebaseService.getMessage(data.messageId);
      if (message) {
        socket.to(`user:${message.senderId}`).emit('message:delivered', {
          messageId: data.messageId,
          userId
        });
      }
      
    } catch (error) {
      console.error('Failed to mark message as delivered:', error);
    }
  }

  /**
   * Handle message read confirmation
   */
  async handleMessageRead(socket: Socket, data: { 
    conversationId: string; 
    messageIds: string[] 
  }) {
    const userId = socket.data.userId;
    
    try {
      // Mark messages as read
      await Promise.all(
        data.messageIds.map(messageId => 
          this.firebaseService.markMessageRead(messageId, userId)
        )
      );
      
      // Notify conversation members of read status
      socket.to(`conversation:${data.conversationId}`).emit('message:read', {
        conversationId: data.conversationId,
        messageIds: data.messageIds,
        userId
      });
      
      console.log(`👁️ Messages read by ${userId}: ${data.messageIds.length} messages`);
      
    } catch (error) {
      console.error('Failed to mark messages as read:', error);
    }
  }
}


