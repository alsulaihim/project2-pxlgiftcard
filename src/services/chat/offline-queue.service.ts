/**
 * Offline Queue Service - Store and forward messages when offline
 * Implements reliable message delivery with retry logic
 */

"use client";

import { Message } from '@/stores/chatStore';

const OFFLINE_QUEUE_KEY = 'pxl_chat_offline_queue';
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 5000;

export interface QueuedMessage extends Message {
  retryCount: number;
  queuedAt: Date;
  lastRetryAt?: Date;
}

export class OfflineQueueService {
  private static instance: OfflineQueueService;
  private queue: QueuedMessage[] = [];
  private isProcessing = false;
  private retryTimeouts = new Map<string, NodeJS.Timeout>();

  private constructor() {
    this.loadQueue();
    this.setupConnectionListener();
  }

  static getInstance(): OfflineQueueService {
    if (!OfflineQueueService.instance) {
      OfflineQueueService.instance = new OfflineQueueService();
    }
    return OfflineQueueService.instance;
  }

  /**
   * Load queue from localStorage
   */
  private loadQueue() {
    if (typeof window === 'undefined') return;
    
    try {
      const stored = localStorage.getItem(OFFLINE_QUEUE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.queue = parsed.map((msg: any) => ({
          ...msg,
          queuedAt: new Date(msg.queuedAt),
          lastRetryAt: msg.lastRetryAt ? new Date(msg.lastRetryAt) : undefined
        }));
      }
    } catch (error) {
      console.error('Failed to load offline queue:', error);
      this.queue = [];
    }
  }

  /**
   * Save queue to localStorage
   */
  private saveQueue() {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(this.queue));
    } catch (error) {
      console.error('Failed to save offline queue:', error);
    }
  }

  /**
   * Setup online/offline event listeners
   */
  private setupConnectionListener() {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', () => {
      console.log('🌐 Connection restored, processing offline queue...');
      this.processQueue();
    });

    window.addEventListener('offline', () => {
      console.log('📴 Connection lost, messages will be queued');
    });

    // Also listen for visibility change to process queue when app becomes active
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && navigator.onLine) {
        this.processQueue();
      }
    });
  }

  /**
   * Add message to offline queue
   */
  addToQueue(message: Message): void {
    const queuedMessage: QueuedMessage = {
      ...message,
      retryCount: 0,
      queuedAt: new Date(),
      status: 'sending'
    };

    this.queue.push(queuedMessage);
    this.saveQueue();

    // Try to process immediately if online
    if (navigator.onLine) {
      this.processQueue();
    }
  }

  /**
   * Process all messages in the queue
   */
  async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) return;
    
    this.isProcessing = true;

    try {
      const messagesToProcess = [...this.queue];
      
      for (const message of messagesToProcess) {
        if (message.retryCount >= MAX_RETRY_ATTEMPTS) {
          this.markAsFailed(message);
          continue;
        }

        const success = await this.sendMessage(message);
        
        if (success) {
          this.removeFromQueue(message.id);
        } else {
          this.scheduleRetry(message);
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Send a single message
   */
  private async sendMessage(message: QueuedMessage): Promise<boolean> {
    try {
      // Import chat store dynamically to avoid circular dependencies
      const { useChatStore } = await import('@/stores/chatStore');
      const store = useChatStore.getState();
      
      if (!store.socket || !store.isConnected) {
        return false;
      }

      // Send via socket
      return new Promise((resolve) => {
        const timeout = setTimeout(() => resolve(false), 10000); // 10 second timeout
        
        store.socket!.emit('message:send', {
          conversationId: message.conversationId,
          type: message.type,
          content: message.content,
          nonce: message.nonce,
          replyTo: message.replyTo,
          metadata: message.metadata
        }, (response: any) => {
          clearTimeout(timeout);
          resolve(response?.success || false);
        });
      });
    } catch (error) {
      console.error('Failed to send queued message:', error);
      return false;
    }
  }

  /**
   * Schedule retry for failed message
   */
  private scheduleRetry(message: QueuedMessage): void {
    // Clear existing timeout if any
    const existingTimeout = this.retryTimeouts.get(message.id);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Update retry count and timestamp
    message.retryCount++;
    message.lastRetryAt = new Date();
    this.saveQueue();

    // Schedule retry with exponential backoff
    const delay = RETRY_DELAY_MS * Math.pow(2, message.retryCount - 1);
    const timeout = setTimeout(() => {
      this.retryTimeouts.delete(message.id);
      if (navigator.onLine) {
        this.processQueue();
      }
    }, delay);

    this.retryTimeouts.set(message.id, timeout);
  }

  /**
   * Mark message as permanently failed
   */
  private markAsFailed(message: QueuedMessage): void {
    message.status = 'failed';
    this.saveQueue();
    
    // Notify user of failure
    this.notifyFailure(message);
    
    // Remove from queue after a delay
    setTimeout(() => {
      this.removeFromQueue(message.id);
    }, 60000); // Keep failed messages for 1 minute
  }

  /**
   * Remove message from queue
   */
  private removeFromQueue(messageId: string): void {
    this.queue = this.queue.filter(msg => msg.id !== messageId);
    this.saveQueue();
    
    // Clear any pending retry timeout
    const timeout = this.retryTimeouts.get(messageId);
    if (timeout) {
      clearTimeout(timeout);
      this.retryTimeouts.delete(messageId);
    }
  }

  /**
   * Notify user of message failure
   */
  private notifyFailure(message: QueuedMessage): void {
    // Show notification or update UI
    console.error(`Message failed after ${MAX_RETRY_ATTEMPTS} attempts:`, message);
    
    // You can dispatch an event or update the store here
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('message-failed', { 
        detail: { messageId: message.id } 
      }));
    }
  }

  /**
   * Get current queue size
   */
  getQueueSize(): number {
    return this.queue.length;
  }

  /**
   * Get all queued messages
   */
  getQueuedMessages(): QueuedMessage[] {
    return [...this.queue];
  }

  /**
   * Clear all queued messages
   */
  clearQueue(): void {
    // Clear all retry timeouts
    this.retryTimeouts.forEach(timeout => clearTimeout(timeout));
    this.retryTimeouts.clear();
    
    this.queue = [];
    this.saveQueue();
  }

  /**
   * Check if a message is in the queue
   */
  isInQueue(messageId: string): boolean {
    return this.queue.some(msg => msg.id === messageId);
  }

  /**
   * Get queue status
   */
  getStatus(): {
    queueSize: number;
    isProcessing: boolean;
    isOnline: boolean;
    oldestMessage?: Date;
  } {
    return {
      queueSize: this.queue.length,
      isProcessing: this.isProcessing,
      isOnline: navigator.onLine,
      oldestMessage: this.queue.length > 0 ? this.queue[0].queuedAt : undefined
    };
  }
}

// Auto-initialize and export singleton
export const offlineQueue = OfflineQueueService.getInstance();