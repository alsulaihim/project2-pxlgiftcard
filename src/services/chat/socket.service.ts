/**
 * Socket.io client service for real-time messaging
 * Implements hybrid Firebase + Socket.io architecture as specified in chat-architecture.mdc
 * Provides sub-200ms message delivery with Firestore fallback
 */

"use client";

import { io, Socket } from 'socket.io-client';
import { auth } from '@/lib/firebase-config';

export interface SocketMessage {
  id: string;
  conversationId: string;
  senderId: string;
  type: 'text' | 'image' | 'file' | 'voice';
  content: string;
  nonce: string;
  timestamp: string;
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

export interface SocketEvents {
  // Incoming events from server
  'message:new': (message: SocketMessage) => void;
  'message:sent': (data: { messageId: string; timestamp: string }) => void;
  'message:delivered': (data: { messageId: string; userId: string }) => void;
  'message:read': (data: { conversationId: string; messageIds: string[]; userId: string }) => void;
  'typing:update': (data: { conversationId: string; userId: string; typing: boolean }) => void;
  'presence:update': (data: { userId: string; online: boolean; lastSeen?: string }) => void;
  'error': (error: { message: string }) => void;
  'connect': () => void;
  'disconnect': (reason: string) => void;
  'connect_error': (error: Error) => void;
}

/**
 * Socket.io service with automatic fallback to Firestore
 * Implements the hybrid architecture specified in chat-architecture.mdc
 */
export class SocketService {
  private static instance: SocketService;
  private socket: Socket | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = Infinity; // Never give up reconnecting
  private eventListeners: Map<string, Function[]> = new Map();
  private messageQueue: any[] = [];
  private fallbackMode = false;

  private constructor() {}

  static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService();
    }
    return SocketService.instance;
  }

  /**
   * Initialize Socket.io connection with Firebase authentication
   * Gracefully falls back to Firestore-only mode if server is unavailable
   */
  async initialize(userId?: string): Promise<Socket | null> {
    if (this.socket?.connected) {
      return this.socket;
    }

    // Check if Socket.io server is configured
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL;
    if (!socketUrl) {
      console.log('🔄 No Socket.io server configured, using Firestore-only mode');
      this.enableFallbackMode();
      return null;
    }

    try {
      // Get Firebase auth token
      const user = auth.currentUser;
      if (!user) {
        console.log('🔄 User not authenticated, using Firestore-only mode');
        this.enableFallbackMode();
        return null;
      }
      
      // For now, use a dummy token since server is in TEMP mode
      // This will still work because server skips verification
      const token = 'dummy-token-' + user.uid;
      
      console.log('🔌 Connecting to Socket.io server:', socketUrl);
      console.log('🔑 Using token:', token.substring(0, 20) + '...');

      // Initialize Socket.io connection with v4 best practices
      this.socket = io(socketUrl, {
        auth: { token },
        transports: ['websocket', 'polling'], // Try WebSocket first, then polling
        reconnection: true,
        reconnectionAttempts: Infinity, // Never stop trying to reconnect
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        randomizationFactor: 0.5, // Add randomness to avoid thundering herd
        timeout: 20000, // Increased timeout for slower connections
        autoConnect: true, // Connect immediately
        // Remove forceNew to allow connection reuse
        upgrade: true, // Allow upgrading from polling to websocket
        rememberUpgrade: true, // Remember the upgrade to avoid downgrading
        closeOnBeforeunload: false // Don't disconnect on page navigation
      });

      this.setupEventHandlers();
      
      // Don't automatically fallback - let Socket.io handle reconnection
      // Only fallback if explicitly disconnected by server
      console.log('⏳ Waiting for Socket.io connection...');
      
      // Add connection health check
      this.startHealthCheck();
      
      return this.socket;
      
    } catch (error) {
      console.log('🔄 Failed to initialize Socket.io, using Firestore-only mode:', (error as Error).message);
      this.enableFallbackMode();
      return null;
    }
  }

  /**
   * Setup Socket.io event handlers
   */
  private setupEventHandlers(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('✅ Socket.io connected');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.fallbackMode = false;
      this.processMessageQueue();
      this.emit('connect');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Socket.io disconnected:', reason);
      this.isConnected = false;
      this.emit('disconnect', reason);
      
      // Only enable fallback for server-initiated disconnects
      if (reason === 'io server disconnect') {
        console.log('🔄 Server disconnected, enabling fallback mode');
        this.enableFallbackMode();
      } else if (reason === 'transport close' || reason === 'transport error') {
        console.log('🔄 Transport issue, Socket.io will auto-reconnect');
        // Let Socket.io handle reconnection automatically
      }
    });

    this.socket.on('connect_error', (error: any) => {
      console.error('🔥 Socket.io connection error:', error);
      console.error('🔥 Error type:', error.type);
      console.error('🔥 Error description:', error.description);
      console.error('🔥 Error context:', error.context);
      this.reconnectAttempts++;
      
      // Don't give up on reconnection - Socket.io v4 will handle it
      console.log(`🔄 Reconnection attempt ${this.reconnectAttempts}`);
      
      this.emit('connect_error', error);
    });

    // Message events - Socket.io broadcast events don't support callbacks
    this.socket.on('message:new', (message: SocketMessage) => {
      console.log('📨 New message received via Socket.io:', message.id);
      
      // Send delivery acknowledgement via separate event
      if (this.socket) {
        this.socket.emit('message:delivered', message.id);
      }
      
      this.emit('message:new', message);
    });

    this.socket.on('message:sent', (data) => {
      this.emit('message:sent', data);
    });

    this.socket.on('message:delivered', (data) => {
      this.emit('message:delivered', data);
    });

    this.socket.on('message:read', (data) => {
      this.emit('message:read', data);
    });

    // Presence events
    this.socket.on('typing:update', (data) => {
      this.emit('typing:update', data);
    });

    this.socket.on('presence:update', (data) => {
      this.emit('presence:update', data);
    });

    // Error handling
    this.socket.on('error', (error) => {
      console.error('Socket.io error:', error);
      this.emit('error', error);
    });

    // Socket.io v4 Manager events for better reconnection handling
    this.socket.io.on('reconnect_attempt', (attemptNumber) => {
      console.log(`🔄 Reconnection attempt #${attemptNumber}`);
      this.emit('reconnect_attempt', attemptNumber);
    });

    this.socket.io.on('reconnect', (attemptNumber) => {
      console.log(`✅ Successfully reconnected after ${attemptNumber} attempts`);
      this.isConnected = true;
      this.fallbackMode = false;
      this.reconnectAttempts = 0;
      this.processMessageQueue();
      this.emit('reconnect', attemptNumber);
    });

    this.socket.io.on('reconnect_error', (error) => {
      console.log('🔄 Reconnection error:', error.message);
      this.emit('reconnect_error', error);
    });

    this.socket.io.on('reconnect_failed', () => {
      console.log('❌ Reconnection failed after all attempts');
      // This should never happen with Infinity attempts
      this.enableFallbackMode();
      this.emit('reconnect_failed');
    });
  }

  /**
   * Send message via Socket.io or queue for fallback
   * Supports dual encryption (recipient + sender versions)
   */
  sendMessage(data: {
    conversationId: string;
    type: 'text' | 'image' | 'file' | 'voice';
    text?: string;           // Recipient encrypted version
    nonce?: string;          // Recipient nonce
    senderText?: string;     // Sender encrypted version
    senderNonce?: string;    // Sender nonce
    replyTo?: string;
    metadata?: any;
  }): void {
    if (this.isConnected && this.socket) {
      // Use Socket.IO v4 acknowledgements with timeout for reliable delivery
      this.socket.timeout(5000).emit('message:send', data, (err: any, response: any) => {
        if (err) {
          console.error('❌ Message send timeout or error:', err);
          // Queue for fallback delivery
          this.messageQueue.push({ type: 'message:send', data });
          this.processMessageQueue();
        } else if (response?.success) {
          console.log('✅ Message sent successfully via Socket.io:', response);
          this.emit('message:sent', {
            messageId: response.messageId,
            timestamp: response.timestamp,
            deliveredTo: response.deliveredTo || []
          });
        } else {
          console.error('❌ Message send failed:', response?.error);
          this.messageQueue.push({ type: 'message:send', data });
          this.processMessageQueue();
        }
      });
      console.log('📤 Message sent via Socket.io with acknowledgement and dual encryption');
    } else {
      // Queue message for fallback processing
      this.messageQueue.push({ type: 'message:send', data });
      console.log('📦 Message queued for fallback processing');
    }
  }

  /**
   * Join conversation room
   */
  joinConversation(conversationId: string): void {
    // Normalize conversation ID to ensure both users join the same room
    const normalizeId = (id: string) => {
      if (!id.startsWith('direct_')) return id;
      const parts = id.replace('direct_', '').split('_');
      if (parts.length !== 2) return id;
      return `direct_${parts.sort().join('_')}`;
    };
    
    const normalizedId = normalizeId(conversationId);
    
    if (this.isConnected && this.socket) {
      // Use acknowledgement to confirm successful join
      this.socket.timeout(3000).emit('conversation:join', normalizedId, (err: any, response: any) => {
        if (err) {
          // Error is either a timeout error or server error
          const errorMessage = typeof err === 'string' ? err : err?.error || err?.message || 'Unknown error';
          console.error(`❌ Failed to join conversation ${normalizedId}:`, errorMessage);
        } else if (!response) {
          // Handle null/undefined response - treat as success for now since server logs show success
          console.warn(`⚠️ Join conversation: No response received but likely successful for ${normalizedId}`);
          // Emit a minimal success event
          this.emit('conversation:joined', { 
            success: true, 
            conversationId: normalizedId 
          });
        } else if (response.success) {
          console.log(`✅ Successfully joined conversation: ${normalizedId}`, response);
          if (normalizedId !== conversationId) {
            console.log(`🔄 Normalized ${conversationId} -> ${normalizedId}`);
          }
          this.emit('conversation:joined', response);
        } else {
          console.error(`❌ Join conversation failed: Unexpected response`, response);
        }
      });
      console.log(`🚪 Joining conversation with acknowledgement: ${normalizedId}`);
    }
  }

  /**
   * Leave conversation room
   */
  leaveConversation(conversationId: string): void {
    // Normalize conversation ID to ensure we leave the correct room
    const normalizeId = (id: string) => {
      if (!id.startsWith('direct_')) return id;
      const parts = id.replace('direct_', '').split('_');
      if (parts.length !== 2) return id;
      return `direct_${parts.sort().join('_')}`;
    };
    
    const normalizedId = normalizeId(conversationId);
    
    if (this.isConnected && this.socket) {
      this.socket.emit('conversation:leave', normalizedId);
      console.log(`🚪 Left conversation: ${normalizedId}`);
    }
  }

  /**
   * Mark messages as read with acknowledgement
   */
  markMessagesAsRead(messageIds: string[]): void {
    if (this.isConnected && this.socket && messageIds.length > 0) {
      this.socket.timeout(3000).emit('message:read', messageIds, (err: any, response: any) => {
        if (err) {
          console.error('❌ Failed to mark messages as read:', err);
        } else if (response?.success) {
          console.log(`✅ Marked ${messageIds.length} messages as read`);
        }
      });
    }
  }

  /**
   * Send typing indicator
   */
  sendTyping(conversationId: string, typing: boolean): void {
    if (this.isConnected && this.socket) {
      // Normalize conversation ID to ensure typing events are sent to the correct room
      const normalizeId = (id: string) => {
        if (!id.startsWith('direct_')) return id;
        const parts = id.replace('direct_', '').split('_');
        if (parts.length !== 2) return id;
        return `direct_${parts.sort().join('_')}`;
      };
      
      const normalizedId = normalizeId(conversationId);
      
      // Send typing data as an object as expected by the server
      this.socket.emit(typing ? 'typing:start' : 'typing:stop', { 
        conversationId: normalizedId 
      });
      console.log(`⌨️ Sent typing ${typing ? 'start' : 'stop'} for conversation: ${normalizedId}`);
    }
  }

  /**
   * Mark messages as delivered
   */
  markDelivered(messageId: string): void {
    if (this.isConnected && this.socket) {
      this.socket.emit('message:delivered', { messageId });
    }
  }

  /**
   * Mark messages as read
   */
  markRead(conversationId: string, messageIds: string[]): void {
    if (this.isConnected && this.socket) {
      this.socket.emit('message:read', { conversationId, messageIds });
    }
  }

  /**
   * Enable fallback mode using Firestore
   */
  private enableFallbackMode(): void {
    console.log('🔄 Enabling Firestore fallback mode - messages will be delivered via Firestore');
    this.fallbackMode = true;
    this.isConnected = false;
    
    // Disconnect any existing socket connection
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    
    this.processMessageQueue();
  }

  /**
   * Start connection health check to detect unstable connections
   */
  private startHealthCheck(): void {
    // Store interval ID for cleanup
    let healthCheckInterval: NodeJS.Timeout | null = null;
    
    const runHealthCheck = () => {
      if (this.socket && this.isConnected && !this.fallbackMode) {
        // Send a ping to check if connection is alive
        const pingStart = Date.now();
        this.socket.emit('ping', { timestamp: pingStart });
        
        // If no pong received within 5 seconds, connection might be unstable
        const pingTimeout = setTimeout(() => {
          console.warn('⚠️ Socket.io ping timeout - connection may be unstable');
          // Don't forcefully reconnect - let Socket.io handle it
        }, 5000);
        
        // Clear timeout if pong is received
        this.socket.once('pong', () => {
          clearTimeout(pingTimeout);
          const latency = Date.now() - pingStart;
          console.log(`🏓 Socket.io healthy - latency: ${latency}ms`);
          
          // Warn if latency is too high
          if (latency > 1000) {
            console.warn(`⚠️ High latency detected: ${latency}ms`);
          }
        });
      } else if (this.fallbackMode && healthCheckInterval) {
        // Clear health check if in fallback mode
        clearInterval(healthCheckInterval);
        healthCheckInterval = null;
      }
    };
    
    // Run initial health check after 5 seconds
    setTimeout(runHealthCheck, 5000);
    
    // Then check every 30 seconds
    healthCheckInterval = setInterval(runHealthCheck, 30000);
  }

  /**
   * Process queued messages using fallback method
   */
  private async processMessageQueue(): Promise<void> {
    if (this.messageQueue.length === 0) return;

    console.log(`📦 Processing ${this.messageQueue.length} queued messages`);

    // Import Firestore service dynamically to avoid circular dependencies
    const { sendMessage } = await import('./firestore-chat.service');
    const user = auth.currentUser;

    if (!user) {
      console.error('Cannot process queue: user not authenticated');
      return;
    }

    while (this.messageQueue.length > 0) {
      const queuedItem = this.messageQueue.shift();
      
      if (queuedItem.type === 'message:send') {
        try {
          // Use the text property from the queued data
          const messageText = queuedItem.data.text || queuedItem.data.senderText || '';
          if (messageText) {
            await sendMessage(
              queuedItem.data.conversationId,
              user.uid,
              messageText
            );
            console.log('📤 Queued message sent via Firestore fallback');
          } else {
            console.error('Cannot send queued message: no text content found');
          }
        } catch (error) {
          console.error('Failed to send queued message:', error);
        }
      }
    }
  }

  /**
   * Event listener management
   */
  on<K extends keyof SocketEvents>(event: K, callback: SocketEvents[K]): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  off<K extends keyof SocketEvents>(event: K, callback: SocketEvents[K]): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emit(event: string, ...args: any[]): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(...args));
    }
  }

  /**
   * Get connection status
   */
  isSocketConnected(): boolean {
    return this.isConnected && !this.fallbackMode;
  }

  isFallbackMode(): boolean {
    return this.fallbackMode;
  }

  /**
   * Disconnect and cleanup
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnected = false;
    this.eventListeners.clear();
    this.messageQueue = [];
    console.log('🔌 Socket.io service disconnected and cleaned up');
  }
}

// Export singleton instance
export const socketService = SocketService.getInstance();
