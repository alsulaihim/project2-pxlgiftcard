/**
 * Presence handler for Socket.io events
 * Handles typing indicators, online/offline status, and user presence
 */

import { Server } from 'socket.io';
import { AuthenticatedSocket, checkConversationMembership } from '../middleware/auth.middleware';
import { logger } from '../services/logger.service';

export interface TypingData {
  conversationId: string;
  typing: boolean;
}

export interface RecordingData {
  conversationId: string;
  recording: boolean;
}

export class PresenceHandler {
  private typingUsers = new Map<string, Set<string>>(); // conversationId -> Set of userIds
  private recordingUsers = new Map<string, Set<string>>(); // conversationId -> Set of userIds recording
  private onlineUsers = new Set<string>(); // Set of online userIds
  private typingTimeouts = new Map<string, NodeJS.Timeout>(); // userId:conversationId -> timeout
  private recordingTimeouts = new Map<string, NodeJS.Timeout>(); // userId:conversationId -> timeout for recording

  constructor(private io: Server) {}

  /**
   * Handle user coming online
   */
  public handleUserOnline = (socket: AuthenticatedSocket): void => {
    const userId = socket.data.userId;
    
    // Add to online users
    this.onlineUsers.add(userId);
    
    // Join user's personal room for direct messaging
    socket.join(`user:${userId}`);
    
    // Join tier-based room
    socket.join(`tier:${socket.data.tier}`);
    
    // Send auth success with user data to the client
    socket.emit('auth:success', {
      userId: socket.data.userId,
      displayName: socket.data.displayName,
      photoURL: socket.data.photoURL,
      tier: socket.data.tier
    });
    
    // Broadcast online status
    this.io.emit('presence:update', {
      userId,
      online: true,
      tier: socket.data.tier,
      displayName: socket.data.displayName,
      photoURL: socket.data.photoURL
    });

    // Also emit simpler user:online event
    this.io.emit('user:online', {
      userId,
      displayName: socket.data.displayName
    });

    // Send current online users to the newly connected user
    const onlineUsersList = this.getOnlineUsers();
    socket.emit('presence:online-users', {
      users: onlineUsersList
    });

    logger.info(`🟢 User online: ${userId} (${socket.data.tier}) - Socket: ${socket.id}`);
  };

  /**
   * Handle user going offline
   */
  public handleUserOffline = (socket: AuthenticatedSocket): void => {
    const userId = socket.data.userId;
    
    // Remove from online users
    this.onlineUsers.delete(userId);
    
    // Clear any typing indicators
    this.clearAllTypingForUser(userId);
    
    // Clear any recording indicators
    this.clearAllRecordingForUser(userId);
    
    // Broadcast offline status
    this.io.emit('presence:update', {
      userId,
      online: false,
      lastSeen: new Date().toISOString()
    });

    // Also emit simpler user:offline event
    this.io.emit('user:offline', {
      userId
    });

    logger.info(`🔴 User offline: ${userId} - Socket: ${socket.id}`);
  };

  /**
   * Handle typing indicator start/stop
   */
  public handleTyping = async (
    socket: AuthenticatedSocket, 
    data: TypingData
  ): Promise<void> => {
    try {
      let { conversationId, typing } = data;
      const userId = socket.data.userId;
      
      // Normalize conversation ID
      const normalizeId = (id: string) => {
        if (!id.startsWith('direct_')) return id;
        const parts = id.replace('direct_', '').split('_');
        if (parts.length !== 2) return id;
        return `direct_${parts.sort().join('_')}`;
      };
      
      conversationId = normalizeId(conversationId);

      if (!conversationId) {
        return;
      }

      // Verify conversation membership
      const isMember = await checkConversationMembership(socket, conversationId);
      if (!isMember) {
        logger.warn(`⚠️ User ${userId} not a member of ${conversationId}, ignoring typing event`);
        return;
      }
      
      logger.info(`✅ User ${userId} is member of ${conversationId}, processing typing event`);

      const typingKey = `${userId}:${conversationId}`;

      if (typing) {
        // User started typing
        if (!this.typingUsers.has(conversationId)) {
          this.typingUsers.set(conversationId, new Set());
        }
        this.typingUsers.get(conversationId)!.add(userId);

        // Clear existing timeout
        const existingTimeout = this.typingTimeouts.get(typingKey);
        if (existingTimeout) {
          clearTimeout(existingTimeout);
        }

        // Set auto-stop timeout (10 seconds)
        const timeout = setTimeout(() => {
          this.stopTyping(userId, conversationId);
        }, 10000);
        
        this.typingTimeouts.set(typingKey, timeout);

        logger.debug(`⌨️ User ${userId} started typing in ${conversationId}`);
      } else {
        // User stopped typing
        this.stopTyping(userId, conversationId);
        logger.debug(`⌨️ User ${userId} stopped typing in ${conversationId}`);
      }

      // Broadcast typing status to conversation members (except sender)
      socket.to(`conversation:${conversationId}`).emit('typing:update', {
        conversationId,
        userId,
        typing,
        user: {
          displayName: socket.data.displayName,
          photoURL: socket.data.photoURL,
          tier: socket.data.tier
        }
      });

    } catch (error) {
      logger.error('❌ Failed to handle typing indicator:', error);
    }
  };

  /**
   * Handle recording indicator start/stop
   */
  public handleRecording = async (
    socket: AuthenticatedSocket,
    data: RecordingData | string
  ): Promise<void> => {
    try {
      // Handle both object format and string format for backwards compatibility
      let conversationId: string;
      let recording: boolean;
      
      if (typeof data === 'string') {
        conversationId = data;
        recording = true; // Assume start if just a string
      } else {
        conversationId = data.conversationId;
        recording = data.recording;
      }
      
      const userId = socket.data.userId;
      
      // Normalize conversation ID
      const normalizeId = (id: string) => {
        if (!id.startsWith('direct_')) return id;
        const parts = id.replace('direct_', '').split('_');
        if (parts.length !== 2) return id;
        return `direct_${parts.sort().join('_')}`;
      };
      
      conversationId = normalizeId(conversationId);
      
      logger.info(`🎤 Recording event from ${userId} in ${conversationId}: recording=${recording}`);
      
      // Check if user is member of conversation
      const isMember = await checkConversationMembership(socket, conversationId);
      if (!isMember) {
        logger.warn(`⚠️ User ${userId} not a member of ${conversationId}, ignoring recording event`);
        return;
      }
      
      logger.info(`✅ User ${userId} is member of ${conversationId}, processing recording event`);

      const recordingKey = `${userId}:${conversationId}`;

      if (recording) {
        // User started recording
        if (!this.recordingUsers.has(conversationId)) {
          this.recordingUsers.set(conversationId, new Set());
        }
        this.recordingUsers.get(conversationId)!.add(userId);

        // Clear existing timeout
        const existingTimeout = this.recordingTimeouts.get(recordingKey);
        if (existingTimeout) {
          clearTimeout(existingTimeout);
        }

        // Set auto-stop timeout (60 seconds for recording)
        const timeout = setTimeout(() => {
          this.stopRecording(userId, conversationId);
        }, 60000);
        
        this.recordingTimeouts.set(recordingKey, timeout);

        logger.debug(`🎤 User ${userId} started recording in ${conversationId}`);
      } else {
        // User stopped recording
        this.stopRecording(userId, conversationId);
        logger.debug(`🎤 User ${userId} stopped recording in ${conversationId}`);
      }

      // Broadcast recording status to conversation members (except sender)
      socket.to(`conversation:${conversationId}`).emit('recording:update', {
        conversationId,
        userId,
        recording,
        user: {
          displayName: socket.data.displayName,
          photoURL: socket.data.photoURL,
          tier: socket.data.tier
        }
      });

    } catch (error) {
      logger.error('❌ Failed to handle recording indicator:', error);
    }
  };

  /**
   * Handle joining a conversation room
   */
  public handleJoinConversation = async (
    socket: AuthenticatedSocket, 
    conversationId: string
  ): Promise<void> => {
    try {
      if (!conversationId) {
        throw new Error('Conversation ID is required');
      }
      
      // Normalize conversation ID
      const normalizeId = (id: string) => {
        if (!id.startsWith('direct_')) return id;
        const parts = id.replace('direct_', '').split('_');
        if (parts.length !== 2) return id;
        return `direct_${parts.sort().join('_')}`;
      };
      
      const normalizedId = normalizeId(conversationId);
      conversationId = normalizedId;

      // Verify conversation membership
      const isMember = await checkConversationMembership(socket, conversationId);
      if (!isMember) {
        socket.emit('conversation:error', { 
          error: 'Not a member of this conversation',
          conversationId 
        });
        throw new Error('Not a member of this conversation');
      }

      // Join conversation room
      socket.join(`conversation:${conversationId}`);
      
      // Send current typing users in this conversation
      const typingUsers = this.typingUsers.get(conversationId);
      if (typingUsers && typingUsers.size > 0) {
        const typingList = Array.from(typingUsers).filter(uid => uid !== socket.data.userId);
        if (typingList.length > 0) {
          socket.emit('typing:current', {
            conversationId,
            typingUsers: typingList
          });
        }
      }

      logger.debug(`👥 User ${socket.data.userId} joined conversation: ${conversationId}`);

    } catch (error) {
      logger.error('❌ Failed to join conversation:', error);
      socket.emit('conversation:error', { 
        error: 'Failed to join conversation',
        conversationId 
      });
    }
  };

  /**
   * Handle leaving a conversation room
   */
  public handleLeaveConversation = (
    socket: AuthenticatedSocket, 
    conversationId: string
  ): void => {
    if (!conversationId) {
      return;
    }

    // Leave conversation room
    socket.leave(`conversation:${conversationId}`);
    
    // Stop typing in this conversation
    this.stopTyping(socket.data.userId, conversationId);

    logger.debug(`👥 User ${socket.data.userId} left conversation: ${conversationId}`);
  };

  /**
   * Stop typing for a user in a conversation
   */
  private stopTyping(userId: string, conversationId: string): void {
    const typingKey = `${userId}:${conversationId}`;
    
    // Clear timeout
    const timeout = this.typingTimeouts.get(typingKey);
    if (timeout) {
      clearTimeout(timeout);
      this.typingTimeouts.delete(typingKey);
    }

    // Remove from typing users
    const conversationTyping = this.typingUsers.get(conversationId);
    if (conversationTyping) {
      conversationTyping.delete(userId);
      if (conversationTyping.size === 0) {
        this.typingUsers.delete(conversationId);
      }
    }

    // Broadcast stop typing
    this.io.to(`conversation:${conversationId}`).emit('typing:update', {
      conversationId,
      userId,
      typing: false
    });
  }

  /**
   * Stop recording for a user in a conversation
   */
  private stopRecording(userId: string, conversationId: string): void {
    const recordingKey = `${userId}:${conversationId}`;
    
    // Clear timeout
    const timeout = this.recordingTimeouts.get(recordingKey);
    if (timeout) {
      clearTimeout(timeout);
      this.recordingTimeouts.delete(recordingKey);
    }

    // Remove from recording users
    const conversationRecording = this.recordingUsers.get(conversationId);
    if (conversationRecording) {
      conversationRecording.delete(userId);
      if (conversationRecording.size === 0) {
        this.recordingUsers.delete(conversationId);
      }
    }

    // Broadcast stop recording
    this.io.to(`conversation:${conversationId}`).emit('recording:update', {
      conversationId,
      userId,
      recording: false
    });
  }

  /**
   * Clear all typing indicators for a user (when they disconnect)
   */
  private clearAllTypingForUser(userId: string): void {
    for (const [conversationId, typingUsers] of this.typingUsers.entries()) {
      if (typingUsers.has(userId)) {
        this.stopTyping(userId, conversationId);
      }
    }
  }

  /**
   * Clear all recording indicators for a user (when they disconnect)
   */
  private clearAllRecordingForUser(userId: string): void {
    for (const [conversationId, recordingUsers] of this.recordingUsers.entries()) {
      if (recordingUsers.has(userId)) {
        this.stopRecording(userId, conversationId);
      }
    }
  }

  /**
   * Get online users count
   */
  public getOnlineUsersCount(): number {
    return this.onlineUsers.size;
  }

  /**
   * Get all online users
   */
  public getOnlineUsers(): string[] {
    return Array.from(this.onlineUsers.keys());
  }

  /**
   * Check if user is online
   */
  public isUserOnline(userId: string): boolean {
    return this.onlineUsers.has(userId);
  }

  /**
   * Register all presence event handlers
   */
  public registerHandlers(socket: AuthenticatedSocket): void {
    // Connection events
    this.handleUserOnline(socket);
    
    // Typing events
    socket.on('typing:start', (data: TypingData) => {
      logger.info(`⌨️ Received typing:start from ${socket.data.userId}: ${JSON.stringify(data)}`);
      this.handleTyping(socket, { ...data, typing: true });
    });
    socket.on('typing:stop', (data: TypingData) => {
      logger.info(`⌨️ Received typing:stop from ${socket.data.userId}: ${JSON.stringify(data)}`);
      this.handleTyping(socket, { ...data, typing: false });
    });
    
    // Recording events
    socket.on('recording:start', (data: RecordingData | string) => {
      logger.info(`🎤 Received recording:start from ${socket.data.userId}: ${JSON.stringify(data)}`);
      const recordingData = typeof data === 'string' ? { conversationId: data, recording: true } : { ...data, recording: true };
      this.handleRecording(socket, recordingData);
    });
    socket.on('recording:stop', (data: RecordingData | string) => {
      logger.info(`🎤 Received recording:stop from ${socket.data.userId}: ${JSON.stringify(data)}`);
      const recordingData = typeof data === 'string' ? { conversationId: data, recording: false } : { ...data, recording: false };
      this.handleRecording(socket, recordingData);
    });
    
    // Conversation events with acknowledgement
    socket.on('conversation:join', (conversationId: string, callback?: Function) => {
      logger.info(`🚪 Join conversation request: ${conversationId} from socket: ${socket.id}`);
      
      // Handle the async operation
      this.handleJoinConversation(socket, conversationId)
        .then(() => {
          logger.info(`✅ Successfully joined conversation: ${conversationId}`);
          if (callback && typeof callback === 'function') {
            const response = { 
              success: true, 
              conversationId: conversationId,
              message: `Successfully joined conversation ${conversationId}`
            };
            logger.info(`📤 Sending join response: ${JSON.stringify(response)}`);
            callback(null, response);
          } else {
            logger.warn(`⚠️ No callback provided for conversation:join`);
          }
        })
        .catch((error: any) => {
          logger.error(`❌ Failed to join conversation ${conversationId}:`, error);
          logger.error(`Error stack:`, error.stack);
          if (callback && typeof callback === 'function') {
            callback({ error: error.message || 'Failed to join conversation' });
          }
        });
    });
    socket.on('conversation:leave', (conversationId: string) => 
      this.handleLeaveConversation(socket, conversationId)
    );
    
    // Disconnection
    socket.on('disconnect', () => this.handleUserOffline(socket));
    
    logger.debug(`👥 Presence handlers registered for socket: ${socket.id}`);
  }
}

