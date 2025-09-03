/**
 * Direct encryption initialization function
 * This ensures encryption is properly set up for the chat system
 */

import { keyExchangeService } from './key-exchange.service';
import { encryptionService } from './encryption.service';

export async function initializeEncryption(userId: string): Promise<boolean> {
  try {
    console.log('🔐 Direct encryption initialization starting for user:', userId);
    
    // Initialize keys through key exchange service
    const keyPair = await keyExchangeService.initializeUserKeys(userId);
    
    if (!keyPair) {
      console.error('❌ Failed to initialize keys - no key pair returned');
      return false;
    }
    
    console.log('✅ Keys initialized successfully');
    console.log('🔑 Public key length:', keyPair.publicKey?.length);
    
    // Verify encryption service has the keys
    const hasKeys = encryptionService.getPublicKey() !== null;
    const currentUserId = encryptionService.getCurrentUserId();
    
    console.log('🔐 Encryption service status:');
    console.log('  - Has keys:', hasKeys);
    console.log('  - Current user:', currentUserId);
    console.log('  - User ID match:', currentUserId === userId);
    
    if (!hasKeys) {
      console.error('❌ Encryption service does not have keys after initialization');
      return false;
    }
    
    console.log('✅ Encryption fully initialized and ready');
    return true;
    
  } catch (error) {
    console.error('❌ Encryption initialization failed:', error);
    return false;
  }
}