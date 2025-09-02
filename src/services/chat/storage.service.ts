"use client";

import { KeyPair } from './encryption.service';

/**
 * Secure storage service using IndexedDB for private key management
 * As specified in chat-architecture.mdc for client-side key storage
 */
export class StorageService {
  private static instance: StorageService;
  private dbName = 'pxl-chat-keys';
  private dbVersion = 1;
  private storeName = 'keystore';

  private constructor() {}

  static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  /**
   * Initialize IndexedDB database
   */
  private async openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      // Try to open with version 1 first
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        const error = request.error;
        // If version error, open without version to use existing
        if (error && error.name === 'VersionError') {
          const retryRequest = indexedDB.open(this.dbName);
          retryRequest.onerror = () => reject(retryRequest.error);
          retryRequest.onsuccess = () => resolve(retryRequest.result);
        } else {
          reject(error);
        }
      };
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create keystore object store
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'userId' });
          store.createIndex('deviceId', 'deviceId', { unique: false });
        }
      };
    });
  }

  /**
   * Store user's key pair securely in IndexedDB
   */
  async storeKeyPair(userId: string, keyPair: KeyPair, deviceId?: string): Promise<void> {
    const db = await this.openDB();
    
    const transaction = db.transaction([this.storeName], 'readwrite');
    const store = transaction.objectStore(this.storeName);

    const keyData = {
      userId,
      publicKey: keyPair.publicKey,
      privateKey: keyPair.privateKey,
      deviceId: deviceId || this.generateDeviceId(),
      createdAt: new Date().toISOString(),
      lastUsed: new Date().toISOString()
    };

    return new Promise((resolve, reject) => {
      const request = store.put(keyData);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Retrieve user's key pair from IndexedDB
   */
  async getKeyPair(userId: string): Promise<KeyPair | null> {
    const db = await this.openDB();
    
    const transaction = db.transaction([this.storeName], 'readonly');
    const store = transaction.objectStore(this.storeName);

    return new Promise((resolve, reject) => {
      const request = store.get(userId);
      
      request.onsuccess = () => {
        const result = request.result;
        if (result) {
          // Update last used timestamp
          this.updateLastUsed(userId);
          
          resolve({
            publicKey: result.publicKey,
            privateKey: result.privateKey
          });
        } else {
          resolve(null);
        }
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Store prekeys for offline message exchange
   */
  async storePreKeys(userId: string, preKeys: string[]): Promise<void> {
    const db = await this.openDB();
    
    const transaction = db.transaction([this.storeName], 'readwrite');
    const store = transaction.objectStore(this.storeName);

    return new Promise((resolve, reject) => {
      const request = store.get(userId);
      
      request.onsuccess = () => {
        const keyData = request.result;
        if (keyData) {
          keyData.preKeys = preKeys;
          keyData.lastUsed = new Date().toISOString();
          
          const updateRequest = store.put(keyData);
          updateRequest.onsuccess = () => resolve();
          updateRequest.onerror = () => reject(updateRequest.error);
        } else {
          reject(new Error('User key data not found'));
        }
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get prekeys for a user
   */
  async getPreKeys(userId: string): Promise<string[]> {
    const db = await this.openDB();
    
    const transaction = db.transaction([this.storeName], 'readonly');
    const store = transaction.objectStore(this.storeName);

    return new Promise((resolve, reject) => {
      const request = store.get(userId);
      
      request.onsuccess = () => {
        const result = request.result;
        resolve(result?.preKeys || []);
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Delete user's keys (for logout/key rotation)
   */
  async deleteKeys(userId: string): Promise<void> {
    const db = await this.openDB();
    
    const transaction = db.transaction([this.storeName], 'readwrite');
    const store = transaction.objectStore(this.storeName);

    return new Promise((resolve, reject) => {
      const request = store.delete(userId);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Check if keys exist for a user
   */
  async hasKeys(userId: string): Promise<boolean> {
    const keyPair = await this.getKeyPair(userId);
    return keyPair !== null;
  }

  /**
   * Update last used timestamp
   */
  private async updateLastUsed(userId: string): Promise<void> {
    const db = await this.openDB();
    
    const transaction = db.transaction([this.storeName], 'readwrite');
    const store = transaction.objectStore(this.storeName);

    const request = store.get(userId);
    request.onsuccess = () => {
      const keyData = request.result;
      if (keyData) {
        keyData.lastUsed = new Date().toISOString();
        store.put(keyData);
      }
    };
  }

  /**
   * Generate a unique device ID
   */
  private generateDeviceId(): string {
    return `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Export keys for backup (encrypted with user password)
   */
  async exportKeys(userId: string, password: string): Promise<string> {
    const keyPair = await this.getKeyPair(userId);
    if (!keyPair) {
      throw new Error('No keys found for user');
    }

    // Simple encryption with password (in production, use proper key derivation)
    const data = JSON.stringify(keyPair);
    const encrypted = btoa(data + password); // Simplified - use proper encryption in production
    
    return encrypted;
  }

  /**
   * Import keys from backup
   */
  async importKeys(userId: string, encryptedData: string, password: string): Promise<void> {
    try {
      // Simple decryption (in production, use proper key derivation)
      const decrypted = atob(encryptedData);
      const data = decrypted.replace(password, '');
      const keyPair = JSON.parse(data) as KeyPair;
      
      await this.storeKeyPair(userId, keyPair);
    } catch {
      throw new Error('Failed to import keys: Invalid data or password');
    }
  }

  /**
   * Save key pair (convenience method that uses storeKeyPair)
   */
  async saveKeyPair(keyPair: KeyPair, userId?: string): Promise<void> {
    // If no userId provided, try to get from auth context
    if (!userId) {
      // For now, we'll require userId to be passed
      throw new Error('userId is required to save key pair');
    }
    return this.storeKeyPair(userId, keyPair);
  }

  /**
   * Clear all stored data (for debugging/reset)
   */
  async clearAll(): Promise<void> {
    const db = await this.openDB();
    
    const transaction = db.transaction([this.storeName], 'readwrite');
    const store = transaction.objectStore(this.storeName);

    return new Promise((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

// Export singleton instance
export const storageService = StorageService.getInstance();
