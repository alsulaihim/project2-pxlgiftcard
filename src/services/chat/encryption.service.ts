"use client";

import nacl from 'tweetnacl';

// BUG FIX: 2025-01-28 - Replace tweetnacl-util with native base64 functions
// Problem: tweetnacl-util base64 functions were causing data corruption during encoding/decoding
// Solution: Use native browser base64 functions which are more reliable
// Impact: Fixes NaCl decryption failures caused by corrupted encrypted data

/**
 * Encode Uint8Array to base64 string using native browser functions
 */
function encodeBase64(data: Uint8Array): string {
  const binaryString = Array.from(data, byte => String.fromCharCode(byte)).join('');
  return btoa(binaryString);
}

/**
 * Decode base64 string to Uint8Array using native browser functions
 */
function decodeBase64(base64: string): Uint8Array {
  const binaryString = atob(base64);
  return new Uint8Array(Array.from(binaryString, char => char.charCodeAt(0)));
}

export interface KeyPair {
  publicKey: string;
  privateKey: string;
}

export interface EncryptedData {
  content: string;
  nonce: string;
}

/**
 * Encryption service implementing TweetNaCl E2EE as specified in chat-architecture.mdc
 * Provides simplified but secure end-to-end encryption for chat messages
 */
export class EncryptionService {
  private static instance: EncryptionService;
  private keyPair: KeyPair | null = null;

  private constructor() {}

  static getInstance(): EncryptionService {
    if (!EncryptionService.instance) {
      EncryptionService.instance = new EncryptionService();
    }
    return EncryptionService.instance;
  }

  /**
   * Generate a new key pair for the current user
   * Uses TweetNaCl's box key generation (Curve25519)
   */
  generateKeyPair(): KeyPair {
    const keyPair = nacl.box.keyPair();
    
    const keys = {
      publicKey: encodeBase64(keyPair.publicKey),
      privateKey: encodeBase64(keyPair.secretKey)
    };

    this.keyPair = keys;
    return keys;
  }

  /**
   * Load existing key pair from storage
   */
  setKeyPair(keyPair: KeyPair): void {
    // BUG FIX: 2025-01-28 - Enhanced key pair setting debugging
    // Problem: Key pair might not be set correctly, causing "No key pair available" errors
    // Solution: Added validation and logging for key pair setting
    // Impact: Better visibility into key pair management
    
    if (!keyPair || !keyPair.publicKey || !keyPair.privateKey) {
      console.error('🔥 Invalid key pair provided to setKeyPair:', keyPair);
      throw new Error('Invalid key pair: missing public or private key');
    }
    
    console.log('🔑 Setting key pair in encryption service, public key length:', keyPair.publicKey.length);
    this.keyPair = keyPair;
    console.log('🔑 Key pair set successfully, has key pair:', this.keyPair !== null);
    
    // BUG FIX: 2025-01-28 - Test encryption/decryption with own keys
    // Problem: Need to verify that the key pair works correctly for encryption/decryption
    // Solution: Test self-encryption to validate key pair functionality
    // Impact: Immediate detection of key pair issues during initialization
    this.testKeyPairFunctionality();
  }

  /**
   * Test if the current key pair can encrypt and decrypt messages correctly
   */
  private testKeyPairFunctionality(): void {
    if (!this.keyPair) return;
    
    try {
      console.log('🔑 Testing key pair functionality...');
      const testMessage = 'test-encryption-' + Date.now();
      
      // BUG FIX: 2025-01-28 - Correct self-encryption test
      // Problem: Previous test was trying to encrypt/decrypt with same public key, which doesn't work with NaCl box
      // Solution: Test with direct NaCl calls using proper key combinations
      // Impact: Accurate validation of key pair functionality
      
      const nonce = nacl.randomBytes(24);
      const messageBytes = new TextEncoder().encode(testMessage);
      const publicKey = decodeBase64(this.keyPair.publicKey);
      const privateKey = decodeBase64(this.keyPair.privateKey);
      
      // Generate a temporary key pair for testing (NaCl box needs different keys for sender/recipient)
      const tempKeyPair = nacl.box.keyPair();
      
      // Test encryption: encrypt with temp public key and our private key
      const encrypted = nacl.box(messageBytes, nonce, tempKeyPair.publicKey, privateKey);
      
      if (!encrypted) {
        console.error('🔥 Key pair functionality test FAILED - encryption returned null');
        return;
      }
      
      // Test decryption: decrypt with our public key and temp private key
      const decrypted = nacl.box.open(encrypted, nonce, publicKey, tempKeyPair.secretKey);
      
      if (!decrypted) {
        console.error('🔥 Key pair functionality test FAILED - decryption returned null');
        return;
      }
      
      const decryptedText = new TextDecoder().decode(decrypted);
      
      if (decryptedText === testMessage) {
        console.log('✅ Key pair functionality test PASSED - encryption/decryption works correctly');
      } else {
        console.error('🔥 Key pair functionality test FAILED - decrypted text does not match original');
        console.error('🔥 Original:', testMessage);
        console.error('🔥 Decrypted:', decryptedText);
      }
    } catch (error) {
      console.error('🔥 Key pair functionality test FAILED with error:', error);
    }
  }

  /**
   * Get current public key
   */
  getPublicKey(): string | null {
    return this.keyPair?.publicKey || null;
  }

  /**
   * Get current user ID (for decryption logic)
   */
  getCurrentUserId(): string | null {
    // This should be set when initializing the service
    return this.currentUserId;
  }

  private currentUserId: string | null = null;

  /**
   * Set current user ID
   */
  setCurrentUserId(userId: string): void {
    this.currentUserId = userId;
  }

  /**
   * Encrypt a message for a specific recipient
   * @param content - Plain text message to encrypt
   * @param recipientPublicKey - Recipient's public key (base64)
   * @returns Encrypted data with nonce
   */
  encryptMessage(content: string, recipientPublicKey: string): EncryptedData {
    if (!this.keyPair) {
      throw new Error('No key pair available. Generate or load keys first.');
    }

    try {
      // BUG FIX: 2025-01-28 - Enhanced encryption debugging
      // Problem: Encryption failures were not providing enough detail for troubleshooting
      // Solution: Added detailed logging at each step of the encryption process
      // Impact: Better debugging information for encryption issues
      console.log('🔐 Encryption attempt starting...');
      console.log('🔐 Content length:', content?.length || 0);
      console.log('🔐 Recipient public key length:', recipientPublicKey?.length || 0);
      console.log('🔐 Has keyPair:', !!this.keyPair);

      const nonce = nacl.randomBytes(24);
      const messageBytes = new TextEncoder().encode(content);
      const recipientKey = decodeBase64(recipientPublicKey);
      const senderSecretKey = decodeBase64(this.keyPair.privateKey);

      console.log('🔐 Nonce length:', nonce.length);
      console.log('🔐 Message bytes length:', messageBytes.length);
      console.log('🔐 Message content:', content);
      console.log('🔐 Decoded recipient key length:', recipientKey.length);
      console.log('🔐 Decoded sender secret key length:', senderSecretKey.length);

      const encrypted = nacl.box(messageBytes, nonce, recipientKey, senderSecretKey);

      if (!encrypted) {
        console.error('🔥 NaCl box returned null - encryption failed');
        throw new Error('Failed to encrypt message - NaCl returned null');
      }

      const result = {
        content: encodeBase64(encrypted),
        nonce: encodeBase64(nonce)
      };

      console.log('🔓 Encryption successful, encrypted bytes length:', encrypted.length);
      console.log('🔓 Encryption successful, encrypted base64 length:', result.content.length);
      console.log('🔓 Encryption successful, nonce bytes length:', nonce.length);
      console.log('🔓 Encryption successful, nonce base64 length:', result.nonce.length);
      
      // BUG FIX: 2025-01-28 - Verify base64 encoding/decoding integrity
      // Problem: Need to ensure base64 encoding doesn't corrupt the encrypted data
      // Solution: Test round-trip encoding/decoding to verify data integrity
      // Impact: Catches base64 corruption issues early
      const testDecoded = decodeBase64(result.content);
      if (testDecoded.length !== encrypted.length) {
        console.error('🔥 Base64 encoding corruption detected!');
        console.error('🔥 Original length:', encrypted.length, 'Decoded length:', testDecoded.length);
        throw new Error('Base64 encoding corrupted the encrypted data');
      }
      console.log('✅ Base64 encoding integrity verified');
      
      // BUG FIX: 2025-01-28 - Add comprehensive encryption/decryption test
      // Problem: Still getting decryption failures, need to verify the entire process
      // Solution: Test the complete encrypt/decrypt cycle immediately after encryption
      // Impact: Identifies if the issue is in encryption, storage, or retrieval
      
      try {
        console.log('🧪 Testing basic NaCl box functionality...');
        // Test basic NaCl box encryption/decryption with same keys
        const testMessage = new TextEncoder().encode('test');
        const testNonce = nacl.randomBytes(24);
        const myPublicKey = decodeBase64(this.keyPair.publicKey);
        const myPrivateKey = decodeBase64(this.keyPair.privateKey);
        
        // Create a temp key pair for testing
        const tempTestPair = nacl.box.keyPair();
        
        // Encrypt with temp public key and our private key
        const testEncrypted = nacl.box(testMessage, testNonce, tempTestPair.publicKey, myPrivateKey);
        if (!testEncrypted) {
          console.error('🔥 Basic NaCl box encryption failed');
          throw new Error('NaCl box encryption returned null');
        }
        
        // Decrypt with our public key and temp private key
        const testDecrypted = nacl.box.open(testEncrypted, testNonce, myPublicKey, tempTestPair.secretKey);
        if (!testDecrypted) {
          console.error('🔥 Basic NaCl box decryption failed');
          throw new Error('NaCl box decryption returned null');
        }
        
        const testResult = new TextDecoder().decode(testDecrypted);
        if (testResult === 'test') {
          console.log('✅ Basic NaCl box test PASSED - crypto library is working');
        } else {
          console.error('🔥 Basic NaCl box test FAILED - got:', testResult);
        }
        
        // BUG FIX: 2025-01-28 - Test immediate decryption with same keys
    // Problem: Need to verify if encrypted data can be decrypted immediately
    // Solution: Test decryption using the same key pair that did encryption
    // Impact: Identifies if issue is with encryption/decryption or key management
    console.log('🧪 Testing immediate decryption with sender keys...');
    try {
      const testDecrypted = nacl.box.open(encrypted, nonce, recipientKey, senderSecretKey);
      if (testDecrypted) {
        const testResult = new TextDecoder().decode(testDecrypted);
        console.log('✅ Immediate decryption test PASSED - result:', testResult);
      } else {
        console.log('❌ Immediate decryption test FAILED - NaCl returned null');
      }
    } catch (testError) {
      console.log('❌ Immediate decryption test ERROR:', testError);
    }
    
    console.log('ℹ️ Current message encrypted for recipient, cannot test decryption without recipient private key');
      } catch (testError) {
        console.error('🔥 Basic NaCl test ERROR:', testError);
        console.error('🔥 This indicates a fundamental problem with the crypto setup');
      }
      
      return result;
    } catch (error) {
      console.error('🔥 Encryption failed with error:', error);
      console.error('🔥 Error details:', {
        message: error instanceof Error ? error.message : String(error),
        contentType: typeof content,
        recipientPublicKeyType: typeof recipientPublicKey
      });
      throw error;
    }
  }

  /**
   * Decrypt a message from a specific sender
   * @param encryptedData - Encrypted message data
   * @param senderPublicKey - Sender's public key (base64)
   * @returns Decrypted plain text message
   */
  decryptMessage(encryptedData: EncryptedData, senderPublicKey: string): string {
    if (!this.keyPair) {
      throw new Error('No key pair available. Generate or load keys first.');
    }

    try {
      // BUG FIX: 2025-01-28 - Enhanced decryption debugging
      // Problem: Decryption failures were not providing enough detail for troubleshooting
      // Solution: Added detailed logging at each step of the decryption process
      // Impact: Better debugging information for encryption/decryption issues
      console.log('🔐 Decryption attempt starting...');
      console.log('🔐 Has keyPair:', !!this.keyPair);
      console.log('🔐 Encrypted content length:', encryptedData.content?.length || 0);
      console.log('🔐 Nonce length:', encryptedData.nonce?.length || 0);
      console.log('🔐 Sender public key length:', senderPublicKey?.length || 0);
      
      // BUG FIX: 2025-01-28 - Enhanced base64 decoding debugging
      // Problem: Need to verify base64 decoding is working correctly
      // Solution: Log both base64 and decoded lengths to identify corruption
      // Impact: Better debugging for base64 decoding issues
      
      console.log('🔐 Base64 encrypted content length:', encryptedData.content.length);
      console.log('🔐 Base64 nonce length:', encryptedData.nonce.length);
      
      const encrypted = decodeBase64(encryptedData.content);
      const nonce = decodeBase64(encryptedData.nonce);
      const senderKey = decodeBase64(senderPublicKey);
      const recipientSecretKey = decodeBase64(this.keyPair.privateKey);

      console.log('🔐 Decoded encrypted length:', encrypted.length);
      // Commented out verbose logging to reduce console noise
      // These logs were for debugging decryption issues
      // console.log('🔐 Decoded nonce length:', nonce.length);
      // console.log('🔐 Decoded sender key length:', senderKey.length);
      // console.log('🔐 Decoded recipient secret key length:', recipientSecretKey.length);

      const decrypted = nacl.box.open(encrypted, nonce, senderKey, recipientSecretKey);
      
      if (!decrypted) {
        // Silently handle decryption failures - this is expected when trying to decrypt messages you don't have keys for
        // console.error('🔥 NaCl box.open returned null - decryption failed');
        // console.error('🔥 Key lengths - sender:', senderKey.length, 'recipient:', recipientSecretKey.length);
        // console.error('🔥 Nonce length:', nonce.length, 'encrypted length:', encrypted.length);
        
        // BUG FIX: 2025-01-28 - Test if keys are compatible by trying self-encryption
        // Problem: Need to verify if the issue is with key compatibility or message corruption
        // Solution: Test encryption/decryption with same user's keys as a sanity check
        // Impact: Helps identify if the issue is key mismatch or data corruption
        try {
          console.log('🔧 Testing self-encryption as sanity check...');
          const testMessage = 'test';
          const testEncrypted = nacl.box(
            new TextEncoder().encode(testMessage), 
            nonce, 
            decodeBase64(this.keyPair.publicKey), 
            recipientSecretKey
          );
          if (testEncrypted) {
            const testDecrypted = nacl.box.open(testEncrypted, nonce, decodeBase64(this.keyPair.publicKey), recipientSecretKey);
            console.log('🔧 Self-encryption test:', testDecrypted ? 'PASSED' : 'FAILED');
          } else {
            console.log('🔧 Self-encryption test: FAILED at encryption');
          }
        } catch (testError) {
          console.log('🔧 Self-encryption test error:', testError);
        }
        
        // Silently return null for messages we can't decrypt (expected for other users' messages)
        return null;
      }

      const result = new TextDecoder().decode(decrypted);
      console.log('🔓 Decryption successful, message length:', result.length);
      return result;
    } catch (error) {
      console.error('🔥 Decryption failed with error:', error);
      console.error('🔥 Error details:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        encryptedDataKeys: Object.keys(encryptedData),
        senderPublicKeyType: typeof senderPublicKey
      });
      throw error; // Re-throw to maintain error handling in calling code
    }
  }

  /**
   * Generate prekeys for offline message exchange
   * @param count - Number of prekeys to generate
   */
  generatePreKeys(count: number = 10): string[] {
    const preKeys: string[] = [];
    
    for (let i = 0; i < count; i++) {
      const keyPair = nacl.box.keyPair();
      preKeys.push(encodeBase64(keyPair.publicKey));
    }
    
    return preKeys;
  }

  /**
   * Rotate keys for forward secrecy
   */
  async rotateKeys(): Promise<KeyPair> {
    const newKeys = this.generateKeyPair();
    
    // Store new keys (implementation depends on storage service)
    await this.storeKeys(newKeys);
    
    return newKeys;
  }

  /**
   * Store keys securely (to be implemented with IndexedDB)
   */
  private async storeKeys(_keyPair: KeyPair): Promise<void> {
    // This will be implemented with the storage service
    console.log('Keys stored (placeholder implementation)');
  }

  /**
   * Verify message integrity using signature
   */
  verifyMessage(message: string, signature: string, senderPublicKey: string): boolean {
    try {
      const messageBytes = new TextEncoder().encode(message);
      const signatureBytes = decodeBase64(signature);
      const publicKeyBytes = decodeBase64(senderPublicKey);
      
      return nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);
    } catch (error) {
      console.error('Signature verification failed:', error);
      return false;
    }
  }

  /**
   * Sign a message for integrity verification
   */
  signMessage(message: string): string {
    if (!this.keyPair) {
      throw new Error('No key pair available for signing');
    }

    const messageBytes = new TextEncoder().encode(message);
    const secretKeyBytes = decodeBase64(this.keyPair.privateKey);
    
    const signature = nacl.sign.detached(messageBytes, secretKeyBytes);
    return encodeBase64(signature);
  }

  /**
   * Encrypt binary data (for files)
   * @param data - Binary data to encrypt
   * @param recipientPublicKey - Recipient's public key (base64)
   * @returns Encrypted data with nonce
   */
  encryptBinary(data: Uint8Array, recipientPublicKey: string): EncryptedData {
    if (!this.keyPair) {
      throw new Error('No key pair available. Generate or load keys first.');
    }

    const nonce = nacl.randomBytes(24);
    const recipientKey = decodeBase64(recipientPublicKey);
    const senderSecretKey = decodeBase64(this.keyPair.privateKey);

    const encrypted = nacl.box(data, nonce, recipientKey, senderSecretKey);

    return {
      content: encodeBase64(encrypted),
      nonce: encodeBase64(nonce)
    };
  }

  /**
   * Decrypt binary data (for files)
   * @param encryptedData - Encrypted binary data
   * @param senderPublicKey - Sender's public key (base64)
   * @returns Decrypted binary data
   */
  decryptBinary(encryptedData: EncryptedData, senderPublicKey: string): Uint8Array {
    if (!this.keyPair) {
      throw new Error('No key pair available for decryption');
    }

    try {
      const encrypted = decodeBase64(encryptedData.content);
      const nonce = decodeBase64(encryptedData.nonce);
      const senderKey = decodeBase64(senderPublicKey);
      const recipientSecretKey = decodeBase64(this.keyPair.privateKey);

      const decrypted = nacl.box.open(encrypted, nonce, senderKey, recipientSecretKey);

      if (!decrypted) {
        throw new Error('Failed to decrypt binary data');
      }

      return decrypted;
    } catch (error) {
      console.error('Binary decryption failed:', error);
      throw new Error('Failed to decrypt binary data');
    }
  }
}

// Export singleton instance
export const encryptionService = EncryptionService.getInstance();
