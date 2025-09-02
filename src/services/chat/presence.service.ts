"use client";

import { ref, set, onValue, onDisconnect, serverTimestamp, off } from "firebase/database";
import { database } from "@/lib/firebase-config";

export interface PresenceData {
  online: boolean;
  lastSeen: number;
  typing: Record<string, boolean>; // conversationId -> isTyping
}

export interface UserPresence extends PresenceData {
  userId: string;
}

/**
 * Presence service using Firebase Realtime Database for real-time online status
 * As specified in chat-architecture.mdc for ephemeral presence data
 */
export class PresenceService {
  private static instance: PresenceService;
  private currentUserId: string | null = null;
  private presenceListeners: Map<string, (presence: UserPresence) => void> = new Map();

  private constructor() {}

  static getInstance(): PresenceService {
    if (!PresenceService.instance) {
      PresenceService.instance = new PresenceService();
    }
    return PresenceService.instance;
  }

  /**
   * Initialize presence for a user
   */
  async initializePresence(userId: string): Promise<void> {
    try {
      this.currentUserId = userId;
      
      const userPresenceRef = ref(database, `presence/${userId}`);
      
      // Set user as online
      await set(userPresenceRef, {
        online: true,
        lastSeen: serverTimestamp(),
        typing: {}
      });

      // Set up automatic offline detection
      const disconnectRef = onDisconnect(userPresenceRef);
      await disconnectRef.set({
        online: false,
        lastSeen: serverTimestamp(),
        typing: {}
      });

      // Update last seen periodically while online
      this.startHeartbeat(userId);
      
      console.log('✅ Presence initialized for user:', userId);
    } catch (error) {
      console.error('🔥 Failed to initialize presence:', error);
      // Don't throw - presence is not critical for chat functionality
      console.log('⚠️ Continuing without presence (chat will still work)');
    }
  }

  /**
   * Set user offline manually
   */
  async setOffline(userId: string): Promise<void> {
    const userPresenceRef = ref(database, `presence/${userId}`);
    
    await set(userPresenceRef, {
      online: false,
      lastSeen: serverTimestamp(),
      typing: {}
    });

    this.stopHeartbeat();
  }

  /**
   * Subscribe to a user's presence status
   */
  subscribeToUserPresence(userId: string, callback: (presence: UserPresence) => void): () => void {
    const userPresenceRef = ref(database, `presence/${userId}`);
    
    const unsubscribe = onValue(userPresenceRef, (snapshot) => {
      const data = snapshot.val() as PresenceData;
      console.log(`🔍 Presence data for ${userId}:`, data);
      
      // Always call callback, even if data is null (user offline/never been online)
      callback({
        userId,
        online: data?.online || false,
        lastSeen: data?.lastSeen || undefined, // undefined if never been online
        typing: data?.typing || {}
      });
    });

    // Store callback for cleanup
    this.presenceListeners.set(userId, callback);

    return () => {
      off(userPresenceRef, 'value', unsubscribe);
      this.presenceListeners.delete(userId);
    };
  }

  /**
   * Subscribe to multiple users' presence (for conversation members)
   */
  subscribeToMultiplePresence(
    userIds: string[], 
    callback: (presenceMap: Map<string, UserPresence>) => void
  ): () => void {
    const presenceMap = new Map<string, UserPresence>();
    const unsubscribeFunctions: (() => void)[] = [];

    userIds.forEach(userId => {
      const unsubscribe = this.subscribeToUserPresence(userId, (presence) => {
        presenceMap.set(userId, presence);
        callback(new Map(presenceMap)); // Create new Map to trigger React updates
      });
      
      unsubscribeFunctions.push(unsubscribe);
    });

    return () => {
      unsubscribeFunctions.forEach(unsub => unsub());
    };
  }

  /**
   * Set typing status for a conversation
   */
  async setTyping(userId: string, conversationId: string, isTyping: boolean): Promise<void> {
    const typingRef = ref(database, `presence/${userId}/typing/${conversationId}`);
    
    if (isTyping) {
      await set(typingRef, true);
      
      // Auto-clear typing after 3 seconds of inactivity
      setTimeout(async () => {
        await set(typingRef, false);
      }, 3000);
    } else {
      await set(typingRef, false);
    }
  }

  /**
   * Subscribe to typing indicators for a conversation
   */
  subscribeToTyping(
    conversationId: string, 
    memberIds: string[], 
    callback: (typingUsers: string[]) => void
  ): () => void {
    const unsubscribeFunctions: (() => void)[] = [];
    const typingUsers = new Set<string>();

    memberIds.forEach(userId => {
      const typingRef = ref(database, `presence/${userId}/typing/${conversationId}`);
      
      const unsubscribe = onValue(typingRef, (snapshot) => {
        const isTyping = snapshot.val() as boolean;
        
        if (isTyping && userId !== this.currentUserId) {
          typingUsers.add(userId);
        } else {
          typingUsers.delete(userId);
        }
        
        callback(Array.from(typingUsers));
      });

      unsubscribeFunctions.push(() => off(typingRef, 'value', unsubscribe));
    });

    return () => {
      unsubscribeFunctions.forEach(unsub => unsub());
    };
  }

  /**
   * Get current online users count
   */
  async getOnlineUsersCount(): Promise<number> {
    return new Promise((resolve) => {
      const presenceRef = ref(database, 'presence');
      
      onValue(presenceRef, (snapshot) => {
        const presenceData = snapshot.val();
        let onlineCount = 0;
        
        if (presenceData) {
          Object.values(presenceData).forEach((presence: any) => {
            if (presence.online) {
              onlineCount++;
            }
          });
        }
        
        resolve(onlineCount);
      }, { onlyOnce: true });
    });
  }

  /**
   * Get list of online users
   */
  async getOnlineUsers(): Promise<string[]> {
    return new Promise((resolve) => {
      const presenceRef = ref(database, 'presence');
      
      onValue(presenceRef, (snapshot) => {
        const presenceData = snapshot.val();
        const onlineUsers: string[] = [];
        
        if (presenceData) {
          Object.entries(presenceData).forEach(([userId, presence]: [string, any]) => {
            if (presence.online) {
              onlineUsers.push(userId);
            }
          });
        }
        
        resolve(onlineUsers);
      }, { onlyOnce: true });
    });
  }

  /**
   * Check if a specific user is online
   */
  async isUserOnline(userId: string): Promise<boolean> {
    return new Promise((resolve) => {
      const userPresenceRef = ref(database, `presence/${userId}`);
      
      onValue(userPresenceRef, (snapshot) => {
        const presence = snapshot.val() as PresenceData;
        resolve(presence?.online || false);
      }, { onlyOnce: true });
    });
  }

  /**
   * Start heartbeat to update last seen timestamp
   */
  private heartbeatInterval: NodeJS.Timeout | null = null;

  private startHeartbeat(userId: string): void {
    this.stopHeartbeat(); // Clear any existing heartbeat
    
    this.heartbeatInterval = setInterval(async () => {
      // Update both online status and lastSeen to ensure we're still active
      const userPresenceRef = ref(database, `presence/${userId}`);
      await set(userPresenceRef, {
        online: true,
        lastSeen: serverTimestamp(),
        typing: {} // Preserve typing state
      });
      
      // Re-establish disconnect handler in case it was lost
      const disconnectRef = onDisconnect(userPresenceRef);
      await disconnectRef.set({
        online: false,
        lastSeen: serverTimestamp(),
        typing: {}
      });
    }, 30000); // Update every 30 seconds
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Cleanup all presence listeners
   */
  cleanup(): void {
    this.stopHeartbeat();
    this.presenceListeners.clear();
    
    if (this.currentUserId) {
      this.setOffline(this.currentUserId);
    }
  }

  /**
   * Set custom presence status
   */
  async setCustomStatus(userId: string, status: string): Promise<void> {
    const statusRef = ref(database, `presence/${userId}/customStatus`);
    await set(statusRef, status);
  }

  /**
   * Subscribe to custom status updates
   */
  subscribeToCustomStatus(userId: string, callback: (status: string) => void): () => void {
    const statusRef = ref(database, `presence/${userId}/customStatus`);
    
    const unsubscribe = onValue(statusRef, (snapshot) => {
      const status = snapshot.val() as string;
      callback(status || '');
    });

    return () => off(statusRef, 'value', unsubscribe);
  }
}

// Export singleton instance
export const presenceService = PresenceService.getInstance();
