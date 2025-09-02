/**
 * Message Search Service - Client-side search using IndexedDB
 * Provides fast, offline-capable message search with encryption support
 */

"use client";

import { ChatMessage } from './firestore-chat.service';

interface SearchIndex {
  messageId: string;
  conversationId: string;
  senderId: string;
  text: string; // Decrypted text for searching
  timestamp: number;
  type?: string;
  metadata?: any;
}

interface SearchResult {
  message: ChatMessage;
  conversationId: string;
  relevance: number; // 0-1 score
  highlights: string[]; // Text snippets with matches
}

class MessageSearchService {
  private static instance: MessageSearchService;
  private db: IDBDatabase | null = null;
  private readonly DB_NAME = 'PXLChatSearch';
  private readonly DB_VERSION = 2; // Increment version to match existing database
  private readonly STORE_NAME = 'messages';
  private readonly INDEX_BATCH_SIZE = 50;

  private constructor() {}

  static getInstance(): MessageSearchService {
    if (!MessageSearchService.instance) {
      MessageSearchService.instance = new MessageSearchService();
    }
    return MessageSearchService.instance;
  }

  /**
   * Initialize IndexedDB for search
   */
  async initialize(): Promise<void> {
    if (this.db) return;

    return new Promise((resolve, reject) => {
      // First, try to open with version 2 (our current version)
      // If the database doesn't exist, this will create it with version 2
      // If it exists with a higher version, this will fail and we'll handle it
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onerror = () => {
        const error = request.error;
        
        // Check if it's a version error
        if (error && error.name === 'VersionError') {
          // The database exists with a higher version, let's open it without specifying version
          // This will open the database with its current version
          const retryRequest = indexedDB.open(this.DB_NAME);
          
          retryRequest.onerror = () => {
            console.warn('Search database failed to open, continuing without search:', retryRequest.error);
            resolve(); // Don't reject, just continue without search
          };
          
          retryRequest.onsuccess = () => {
            this.db = retryRequest.result;
            console.log('Search database initialized with existing version:', this.db.version);
            resolve();
          };
        } else {
          console.warn('Search database failed to open, continuing without search:', error);
          resolve(); // Don't reject, just continue without search
        }
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('Search database initialized with version:', this.db.version);
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create messages store if it doesn't exist
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          const store = db.createObjectStore(this.STORE_NAME, {
            keyPath: 'messageId'
          });

          // Create indexes for efficient searching
          store.createIndex('conversationId', 'conversationId', { unique: false });
          store.createIndex('senderId', 'senderId', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('type', 'type', { unique: false });
          
          // Composite index for conversation + timestamp
          store.createIndex('conversation_timestamp', ['conversationId', 'timestamp'], { 
            unique: false 
          });
        }
      };
    });
  }

  /**
   * Index a message for searching
   */
  async indexMessage(message: ChatMessage, conversationId: string): Promise<void> {
    if (!this.db) await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    // Don't index encrypted messages that couldn't be decrypted
    if (!message.text && !message.decryptedContent) return;

    // Handle both Firestore Timestamp and regular Date objects
    let timestampMillis: number;
    if (message.timestamp && typeof message.timestamp.toMillis === 'function') {
      timestampMillis = message.timestamp.toMillis();
    } else if (message.timestamp instanceof Date) {
      timestampMillis = message.timestamp.getTime();
    } else if (typeof message.timestamp === 'number') {
      timestampMillis = message.timestamp;
    } else {
      timestampMillis = Date.now();
    }

    const searchIndex: SearchIndex = {
      messageId: message.id,
      conversationId,
      senderId: message.senderId,
      text: (message.text || message.decryptedContent || '').toLowerCase(),
      timestamp: timestampMillis,
      type: message.type,
      metadata: message.metadata
    };

    const transaction = this.db.transaction([this.STORE_NAME], 'readwrite');
    const store = transaction.objectStore(this.STORE_NAME);
    
    return new Promise((resolve, reject) => {
      const request = store.put(searchIndex);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Index multiple messages in batch
   */
  async indexMessages(messages: ChatMessage[], conversationId: string): Promise<void> {
    if (!this.db) await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    // Process in batches to avoid blocking
    for (let i = 0; i < messages.length; i += this.INDEX_BATCH_SIZE) {
      const batch = messages.slice(i, i + this.INDEX_BATCH_SIZE);
      
      const transaction = this.db.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      
      await Promise.all(
        batch.map(message => {
          if (!message.text && !message.decryptedContent) return Promise.resolve();
          
          // Handle both Firestore Timestamp and regular Date objects
          let timestampMillis: number;
          if (message.timestamp && typeof message.timestamp.toMillis === 'function') {
            timestampMillis = message.timestamp.toMillis();
          } else if (message.timestamp instanceof Date) {
            timestampMillis = message.timestamp.getTime();
          } else if (typeof message.timestamp === 'number') {
            timestampMillis = message.timestamp;
          } else {
            timestampMillis = Date.now();
          }
          
          const searchIndex: SearchIndex = {
            messageId: message.id,
            conversationId,
            senderId: message.senderId,
            text: (message.text || message.decryptedContent || '').toLowerCase(),
            timestamp: timestampMillis,
            type: message.type,
            metadata: message.metadata
          };
          
          return new Promise((resolve, reject) => {
            const request = store.put(searchIndex);
            request.onsuccess = () => resolve(undefined);
            request.onerror = () => reject(request.error);
          });
        })
      );
      
      // Small delay between batches to avoid blocking UI
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }

  /**
   * Search messages across all conversations
   */
  async searchGlobal(
    query: string,
    options?: {
      conversationIds?: string[];
      senderIds?: string[];
      types?: string[];
      startDate?: Date;
      endDate?: Date;
      limit?: number;
    }
  ): Promise<SearchIndex[]> {
    if (!this.db) await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    const normalizedQuery = query.toLowerCase();
    const results: SearchIndex[] = [];
    
    const transaction = this.db.transaction([this.STORE_NAME], 'readonly');
    const store = transaction.objectStore(this.STORE_NAME);
    
    return new Promise((resolve, reject) => {
      const request = store.openCursor();
      
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        
        if (cursor) {
          const value = cursor.value as SearchIndex;
          
          // Apply filters
          if (options?.conversationIds && !options.conversationIds.includes(value.conversationId)) {
            cursor.continue();
            return;
          }
          
          if (options?.senderIds && !options.senderIds.includes(value.senderId)) {
            cursor.continue();
            return;
          }
          
          if (options?.types && !options.types.includes(value.type || 'text')) {
            cursor.continue();
            return;
          }
          
          if (options?.startDate && value.timestamp < options.startDate.getTime()) {
            cursor.continue();
            return;
          }
          
          if (options?.endDate && value.timestamp > options.endDate.getTime()) {
            cursor.continue();
            return;
          }
          
          // Check if text matches query
          if (value.text.includes(normalizedQuery)) {
            results.push(value);
            
            if (options?.limit && results.length >= options.limit) {
              resolve(results);
              return;
            }
          }
          
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Search messages within a specific conversation
   */
  async searchConversation(
    conversationId: string,
    query: string,
    limit: number = 50
  ): Promise<SearchIndex[]> {
    if (!this.db) await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    const normalizedQuery = query.toLowerCase();
    const results: SearchIndex[] = [];
    
    const transaction = this.db.transaction([this.STORE_NAME], 'readonly');
    const store = transaction.objectStore(this.STORE_NAME);
    const index = store.index('conversationId');
    
    return new Promise((resolve, reject) => {
      const request = index.openCursor(IDBKeyRange.only(conversationId));
      
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        
        if (cursor) {
          const value = cursor.value as SearchIndex;
          
          if (value.text.includes(normalizedQuery)) {
            results.push(value);
            
            if (results.length >= limit) {
              resolve(results);
              return;
            }
          }
          
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get search suggestions based on partial query
   */
  async getSuggestions(partial: string, limit: number = 10): Promise<string[]> {
    if (!this.db) await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    const normalizedPartial = partial.toLowerCase();
    const suggestions = new Set<string>();
    
    const transaction = this.db.transaction([this.STORE_NAME], 'readonly');
    const store = transaction.objectStore(this.STORE_NAME);
    
    return new Promise((resolve, reject) => {
      const request = store.openCursor();
      
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        
        if (cursor && suggestions.size < limit) {
          const value = cursor.value as SearchIndex;
          
          // Extract words that start with the partial query
          const words = value.text.split(/\s+/);
          for (const word of words) {
            if (word.startsWith(normalizedPartial) && word.length > normalizedPartial.length) {
              suggestions.add(word);
              if (suggestions.size >= limit) break;
            }
          }
          
          cursor.continue();
        } else {
          resolve(Array.from(suggestions));
        }
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Delete indexed messages for a conversation
   */
  async deleteConversationIndex(conversationId: string): Promise<void> {
    if (!this.db) await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction([this.STORE_NAME], 'readwrite');
    const store = transaction.objectStore(this.STORE_NAME);
    const index = store.index('conversationId');
    
    return new Promise((resolve, reject) => {
      const request = index.openCursor(IDBKeyRange.only(conversationId));
      
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Clear all search indexes
   */
  async clearIndex(): Promise<void> {
    if (!this.db) await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction([this.STORE_NAME], 'readwrite');
    const store = transaction.objectStore(this.STORE_NAME);
    
    return new Promise((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get index statistics
   */
  async getStats(): Promise<{
    totalMessages: number;
    conversations: number;
    oldestMessage?: Date;
    newestMessage?: Date;
  }> {
    if (!this.db) await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction([this.STORE_NAME], 'readonly');
    const store = transaction.objectStore(this.STORE_NAME);
    
    return new Promise((resolve, reject) => {
      const countRequest = store.count();
      const conversations = new Set<string>();
      let oldest: number | undefined;
      let newest: number | undefined;
      
      countRequest.onsuccess = () => {
        const count = countRequest.result;
        
        if (count === 0) {
          resolve({
            totalMessages: 0,
            conversations: 0
          });
          return;
        }
        
        const cursorRequest = store.openCursor();
        
        cursorRequest.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result;
          
          if (cursor) {
            const value = cursor.value as SearchIndex;
            conversations.add(value.conversationId);
            
            if (!oldest || value.timestamp < oldest) oldest = value.timestamp;
            if (!newest || value.timestamp > newest) newest = value.timestamp;
            
            cursor.continue();
          } else {
            resolve({
              totalMessages: count,
              conversations: conversations.size,
              oldestMessage: oldest ? new Date(oldest) : undefined,
              newestMessage: newest ? new Date(newest) : undefined
            });
          }
        };
        
        cursorRequest.onerror = () => reject(cursorRequest.error);
      };
      
      countRequest.onerror = () => reject(countRequest.error);
    });
  }
}

export const messageSearchService = MessageSearchService.getInstance();