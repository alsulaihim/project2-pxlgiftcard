"use client";

import { db } from "@/lib/firebase-config";
import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { encryptionService, KeyPair } from './encryption.service';
import { storageService } from './storage.service';

export interface UserKeys {
  userId: string;
  publicKey: string;
  preKeys: string[];
  devices: Map<string, {
    deviceId: string;
    publicKey: string;
    lastUpdated: Timestamp;
  }>;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface DeviceInfo {
  deviceId: string;
  publicKey: string;
  lastUpdated: Timestamp;
}

/**
 * Key exchange service for managing public keys and enabling E2EE
 * As specified in chat-architecture.mdc
 */
export class KeyExchangeService {
  private static instance: KeyExchangeService;

  private constructor() {}

  static getInstance(): KeyExchangeService {
    if (!KeyExchangeService.instance) {
      KeyExchangeService.instance = new KeyExchangeService();
    }
    return KeyExchangeService.instance;
  }

  /**
   * Initialize keys for a user (generate if not exists, load if exists)
   */
  async initializeUserKeys(userId: string): Promise<KeyPair> {
    // BUG FIX: 2025-01-28 - Enhanced key initialization debugging
    // Problem: Key initialization was failing silently, causing "No key pair available" errors
    // Solution: Added comprehensive logging and error handling for key initialization
    // Impact: Better visibility into key initialization process and failures
    
    console.log('🔑 Starting key initialization for user:', userId);
    
    try {
      // Check if keys exist locally
      console.log('🔑 Checking for existing keys in IndexedDB...');
      let keyPair = await storageService.getKeyPair(userId);
      
      if (!keyPair) {
        console.log('🔑 No existing keys found, generating new key pair...');
        
        // Generate new key pair
        keyPair = encryptionService.generateKeyPair();
        console.log('🔑 New key pair generated, public key length:', keyPair.publicKey.length);
        
        // BUG FIX: 2025-01-28 - Missing setKeyPair for new users
        // Problem: New users had keys generated but encryption service wasn't initialized with them
        // Solution: Set the key pair in encryption service for both new and existing users
        // Impact: Encryption/decryption now works for new users
        encryptionService.setKeyPair(keyPair);
        console.log('🔑 Key pair set in encryption service');
        
        // Store locally
        console.log('🔑 Storing key pair in IndexedDB...');
        await storageService.storeKeyPair(userId, keyPair);
        console.log('🔑 Key pair stored successfully');
        
        // Generate prekeys
        console.log('🔑 Generating prekeys...');
        const preKeys = encryptionService.generatePreKeys(10);
        await storageService.storePreKeys(userId, preKeys);
        console.log('🔑 Prekeys generated and stored:', preKeys.length);
        
        // Register public key and prekeys in Firestore
        console.log('🔑 Registering public key in Firestore...');
        await this.registerPublicKey(userId, keyPair.publicKey, preKeys);
        console.log('🔑 Public key registered in Firestore');
      } else {
        console.log('🔑 Existing keys found, loading into encryption service...');
        console.log('🔑 Loaded key pair, public key length:', keyPair.publicKey.length);
        
        // Load existing keys into encryption service
        encryptionService.setKeyPair(keyPair);
        console.log('🔑 Existing key pair loaded into encryption service');
      }

      // Set current user ID for encryption service
      encryptionService.setCurrentUserId(userId);
      console.log('🔑 Current user ID set in encryption service:', userId);
      
      // Verify the encryption service has the keys
      const hasKeys = encryptionService.getPublicKey() !== null;
      const currentUserId = encryptionService.getCurrentUserId();
      console.log('🔑 Key initialization complete - Has keys:', hasKeys, 'Current user:', currentUserId);
      
      if (!hasKeys) {
        throw new Error('Key initialization failed - encryption service has no keys after initialization');
      }

      return keyPair;
    } catch (error) {
      console.error('🔥 Key initialization failed:', error);
      throw error;
    }
  }

  /**
   * Register user's public key and prekeys in Firestore
   */
  async registerPublicKey(userId: string, publicKey: string, preKeys: string[], deviceId?: string): Promise<void> {
    const deviceInfo: DeviceInfo = {
      deviceId: deviceId || `device_${Date.now()}`,
      publicKey,
      lastUpdated: serverTimestamp() as Timestamp,
    };

    const userKeysData: Partial<UserKeys> = {
      userId,
      publicKey,
      preKeys,
      devices: new Map([[deviceInfo.deviceId, deviceInfo]]),
      createdAt: serverTimestamp() as Timestamp,
      updatedAt: serverTimestamp() as Timestamp,
    };

    // Convert Map to object for Firestore storage
    const firestoreData = {
      ...userKeysData,
      devices: Object.fromEntries(userKeysData.devices || new Map()),
    };

    await setDoc(doc(db, "userKeys", userId), firestoreData, { merge: true });
  }

  /**
   * Get a user's public key for encryption
   */
  async getUserPublicKey(userId: string): Promise<string | null> {
    try {
      const userKeysDoc = await getDoc(doc(db, "userKeys", userId));
      
      if (userKeysDoc.exists()) {
        const data = userKeysDoc.data() as UserKeys;
        return data.publicKey;
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching user public key:', error);
      return null;
    }
  }

  // BUG FIX: 2025-01-28 - Missing getPublicKey method
  // Problem: firestore-chat.service.ts and media.service.ts call getPublicKey() but method doesn't exist
  // Solution: Added getPublicKey as alias to getUserPublicKey for compatibility
  // Impact: Chat encryption now works without breaking existing code patterns
  /**
   * Get a user's public key for encryption (alias for getUserPublicKey)
   */
  async getPublicKey(userId: string): Promise<string | null> {
    return await this.getUserPublicKey(userId);
  }

  /**
   * Get prekeys for offline message exchange
   */
  async getUserPreKeys(userId: string): Promise<string[]> {
    try {
      const userKeysDoc = await getDoc(doc(db, "userKeys", userId));
      
      if (userKeysDoc.exists()) {
        const data = userKeysDoc.data() as UserKeys;
        return data.preKeys || [];
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching user prekeys:', error);
      return [];
    }
  }

  /**
   * Get public keys for multiple users (for group chats)
   */
  async getMultipleUserKeys(userIds: string[]): Promise<Map<string, string>> {
    const keyMap = new Map<string, string>();
    
    try {
      const promises = userIds.map(async (userId) => {
        const publicKey = await this.getUserPublicKey(userId);
        if (publicKey) {
          keyMap.set(userId, publicKey);
        }
      });
      
      await Promise.all(promises);
    } catch (error) {
      console.error('Error fetching multiple user keys:', error);
    }
    
    return keyMap;
  }

  /**
   * Rotate keys for forward secrecy
   */
  async rotateUserKeys(userId: string): Promise<KeyPair> {
    // Generate new key pair
    const newKeyPair = encryptionService.generateKeyPair();
    
    // Store new keys locally
    await storageService.storeKeyPair(userId, newKeyPair);
    
    // Generate new prekeys
    const newPreKeys = encryptionService.generatePreKeys(10);
    await storageService.storePreKeys(userId, newPreKeys);
    
    // Update Firestore with new public key
    await this.registerPublicKey(userId, newKeyPair.publicKey, newPreKeys);
    
    return newKeyPair;
  }

  /**
   * Add a new device for multi-device support
   */
  async addDevice(userId: string, deviceId: string, devicePublicKey: string): Promise<void> {
    const userKeysRef = doc(db, "userKeys", userId);
    const userKeysDoc = await getDoc(userKeysRef);
    
    if (userKeysDoc.exists()) {
      const data = userKeysDoc.data() as any;
      const devices = data.devices || {};
      
      devices[deviceId] = {
        deviceId,
        publicKey: devicePublicKey,
        lastUpdated: serverTimestamp(),
      };
      
      await setDoc(userKeysRef, { 
        devices,
        updatedAt: serverTimestamp()
      }, { merge: true });
    }
  }

  /**
   * Remove a device
   */
  async removeDevice(userId: string, deviceId: string): Promise<void> {
    const userKeysRef = doc(db, "userKeys", userId);
    const userKeysDoc = await getDoc(userKeysRef);
    
    if (userKeysDoc.exists()) {
      const data = userKeysDoc.data() as any;
      const devices = data.devices || {};
      
      delete devices[deviceId];
      
      await setDoc(userKeysRef, { 
        devices,
        updatedAt: serverTimestamp()
      }, { merge: true });
    }
  }

  /**
   * Verify if a user has registered keys
   */
  async hasUserKeys(userId: string): Promise<boolean> {
    try {
      const userKeysDoc = await getDoc(doc(db, "userKeys", userId));
      return userKeysDoc.exists();
    } catch (error) {
      console.error('Error checking user keys:', error);
      return false;
    }
  }

  /**
   * Get all users with registered keys (for user discovery)
   */
  async getRegisteredUsers(): Promise<string[]> {
    try {
      const q = query(collection(db, "userKeys"));
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => doc.id);
    } catch (error) {
      console.error('Error fetching registered users:', error);
      return [];
    }
  }

  /**
   * Cleanup old prekeys (security maintenance)
   */
  async cleanupOldPreKeys(userId: string, maxAge: number = 30 * 24 * 60 * 60 * 1000): Promise<void> {
    const userKeysRef = doc(db, "userKeys", userId);
    const userKeysDoc = await getDoc(userKeysRef);
    
    if (userKeysDoc.exists()) {
      const data = userKeysDoc.data() as any;
      const createdAt = data.createdAt?.toDate();
      
      if (createdAt && (Date.now() - createdAt.getTime()) > maxAge) {
        // Generate new prekeys
        const newPreKeys = encryptionService.generatePreKeys(10);
        
        await setDoc(userKeysRef, {
          preKeys: newPreKeys,
          updatedAt: serverTimestamp()
        }, { merge: true });
        
        // Update local storage
        await storageService.storePreKeys(userId, newPreKeys);
      }
    }
  }

  /**
   * Export user's public key for sharing
   */
  async exportPublicKey(userId: string): Promise<string | null> {
    return await this.getUserPublicKey(userId);
  }

  /**
   * Verify key integrity
   */
  async verifyKeyIntegrity(userId: string): Promise<boolean> {
    try {
      const localKeys = await storageService.getKeyPair(userId);
      const remotePublicKey = await this.getUserPublicKey(userId);
      
      return localKeys?.publicKey === remotePublicKey;
    } catch (error) {
      console.error('Error verifying key integrity:', error);
      return false;
    }
  }
}

// Export singleton instance
export const keyExchangeService = KeyExchangeService.getInstance();
