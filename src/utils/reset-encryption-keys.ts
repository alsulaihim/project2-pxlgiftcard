/**
 * Utility to reset encryption keys
 * This forces regeneration of keys to ensure they match between Firestore and local storage
 */

import { keyExchangeService } from '@/services/chat/key-exchange.service';
import { storageService } from '@/services/chat/storage.service';
import { encryptionService } from '@/services/chat/encryption.service';
import { auth } from '@/lib/firebase-config';

export async function resetEncryptionKeys(): Promise<void> {
  const userId = auth.currentUser?.uid;
  if (!userId) {
    console.error('❌ No authenticated user');
    return;
  }

  console.log('🔄 Resetting encryption keys for user:', userId);

  try {
    // 1. Clear local storage
    console.log('1️⃣ Clearing local keys...');
    await storageService.clearAll();
    
    // 2. Generate new key pair
    console.log('2️⃣ Generating new key pair...');
    const newKeyPair = encryptionService.generateKeyPair();
    
    // 3. Store locally
    console.log('3️⃣ Storing new keys locally...');
    await storageService.storeKeyPair(userId, newKeyPair);
    
    // 4. Set in encryption service
    console.log('4️⃣ Setting keys in encryption service...');
    encryptionService.setKeyPair(newKeyPair);
    encryptionService.setCurrentUserId(userId);
    
    // 5. Generate prekeys
    console.log('5️⃣ Generating prekeys...');
    const preKeys = encryptionService.generatePreKeys(10);
    await storageService.storePreKeys(userId, preKeys);
    
    // 6. Register in Firestore
    console.log('6️⃣ Registering in Firestore...');
    await keyExchangeService.registerPublicKey(userId, newKeyPair.publicKey, preKeys);
    
    console.log('✅ Encryption keys reset successfully!');
    console.log('📝 New public key:', newKeyPair.publicKey.substring(0, 30) + '...');
    
    return;
  } catch (error) {
    console.error('❌ Failed to reset encryption keys:', error);
    throw error;
  }
}

// Add to window for easy access from console
if (typeof window !== 'undefined') {
  (window as any).resetEncryptionKeys = resetEncryptionKeys;
}