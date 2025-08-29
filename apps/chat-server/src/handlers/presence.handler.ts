/**
 * Presence handling for Socket.io server
 * Manages user online/offline status and typing indicators
 * As specified in chat-architecture.mdc
 */

import { Socket } from 'socket.io';
import { FirebaseService } from '../services/firebase.service';

export class PresenceHandler {
  private userSockets: Map<string, Set<string>> = new Map(); // userId -> Set of socketIds
  
  constructor(private firebaseService: FirebaseService) {}

  /**
   * Set user as online
   */
  async setUserOnline(socket: Socket, userId: string) {
    try {
      // Track socket for this user
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(socket.id);
      
      // Update presence in Firebase Realtime Database
      await this.firebaseService.setUserPresence(userId, {
        online: true,
        lastSeen: Date.now(),
        typing: {}
      });
      
      // Broadcast online status
      socket.broadcast.emit('presence:update', {
        userId,
        online: true,
        lastSeen: new Date().toISOString()
      });
      
      console.log(`🟢 User online: ${userId}`);
      
    } catch (error) {
      console.error('Failed to set user online:', error);
    }
  }

  /**
   * Set user as offline
   */
  async setUserOffline(socket: Socket, userId: string) {
    try {
      // Remove socket from tracking
      const userSocketSet = this.userSockets.get(userId);
      if (userSocketSet) {
        userSocketSet.delete(socket.id);
        
        // If no more sockets for this user, mark as offline
        if (userSocketSet.size === 0) {
          this.userSockets.delete(userId);
          
          // Update presence in Firebase Realtime Database
          await this.firebaseService.setUserPresence(userId, {
            online: false,
            lastSeen: Date.now(),
            typing: {}
          });
          
          // Broadcast offline status
          socket.broadcast.emit('presence:update', {
            userId,
            online: false,
            lastSeen: new Date().toISOString()
          });
          
          console.log(`🔴 User offline: ${userId}`);
        }
      }
      
    } catch (error) {
      console.error('Failed to set user offline:', error);
    }
  }

  /**
   * Handle typing indicators
   */
  async handleTyping(socket: Socket, data: { 
    conversationId: string; 
    typing: boolean 
  }) {
    const userId = socket.data.userId;
    
    try {
      // Update typing status in Firebase
      await this.firebaseService.setTypingStatus(userId, data.conversationId, data.typing);
      
      // Broadcast typing status to conversation members
      socket.to(`conversation:${data.conversationId}`).emit('typing:update', {
        conversationId: data.conversationId,
        userId,
        typing: data.typing
      });
      
    } catch (error) {
      console.error('Failed to handle typing status:', error);
    }
  }

  /**
   * Get online users count
   */
  getOnlineUsersCount(): number {
    return this.userSockets.size;
  }

  /**
   * Get online users in a specific tier
   */
  getOnlineUsersByTier(tier: string): string[] {
    // This would require tracking tier information per socket
    // Implementation depends on specific requirements
    return [];
  }
}


