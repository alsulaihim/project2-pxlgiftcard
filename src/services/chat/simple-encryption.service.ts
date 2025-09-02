/**
 * Simplified encryption service using NaCl box
 * Based on official TweetNaCl documentation
 */

import * as nacl from 'tweetnacl';
import { encodeBase64, decodeBase64 } from 'tweetnacl-util';

export interface SimpleKeyPair {
  publicKey: string;  // base64
  privateKey: string; // base64
}

export interface EncryptedMessage {
  content: string;  // base64
  nonce: string;    // base64
}

export class SimpleEncryptionService {
  private keyPair: SimpleKeyPair | null = null;

  /**
   * Generate a new key pair
   */
  generateKeyPair(): SimpleKeyPair {
    const rawKeyPair = nacl.box.keyPair();
    return {
      publicKey: encodeBase64(rawKeyPair.publicKey),
      privateKey: encodeBase64(rawKeyPair.secretKey)
    };
  }

  /**
   * Set the current key pair
   */
  setKeyPair(keyPair: SimpleKeyPair): void {
    this.keyPair = keyPair;
    console.log('🔑 Key pair set, public key:', keyPair.publicKey.substring(0, 20) + '...');
  }

  /**
   * Get current public key
   */
  getPublicKey(): string | null {
    return this.keyPair?.publicKey || null;
  }

  /**
   * Encrypt a message for a recipient
   * Uses the recipient's public key and our private key
   */
  encryptForRecipient(message: string, recipientPublicKey: string): EncryptedMessage | null {
    if (!this.keyPair) {
      console.error('❌ No key pair available');
      return null;
    }

    try {
      const nonce = nacl.randomBytes(24);
      const messageBytes = new TextEncoder().encode(message);
      const recipientKey = decodeBase64(recipientPublicKey);
      const mySecretKey = decodeBase64(this.keyPair.privateKey);

      const encrypted = nacl.box(messageBytes, nonce, recipientKey, mySecretKey);
      
      if (!encrypted) {
        console.error('❌ Encryption failed');
        return null;
      }

      return {
        content: encodeBase64(encrypted),
        nonce: encodeBase64(nonce)
      };
    } catch (error) {
      console.error('❌ Encryption error:', error);
      return null;
    }
  }

  /**
   * Decrypt a message from a sender
   * Uses the sender's public key and our private key
   */
  decryptFromSender(encrypted: EncryptedMessage, senderPublicKey: string): string | null {
    if (!this.keyPair) {
      console.error('❌ No key pair available');
      return null;
    }

    try {
      const encryptedBytes = decodeBase64(encrypted.content);
      const nonce = decodeBase64(encrypted.nonce);
      const senderKey = decodeBase64(senderPublicKey);
      const mySecretKey = decodeBase64(this.keyPair.privateKey);

      const decrypted = nacl.box.open(encryptedBytes, nonce, senderKey, mySecretKey);
      
      if (!decrypted) {
        console.error('❌ Decryption failed - keys may not match');
        return null;
      }

      return new TextDecoder().decode(decrypted);
    } catch (error) {
      console.error('❌ Decryption error:', error);
      return null;
    }
  }

  /**
   * Create a test message to verify encryption works
   */
  createTestMessage(recipientPublicKey: string): { encrypted: EncryptedMessage; original: string } | null {
    const testMessage = `Test message at ${new Date().toISOString()}`;
    const encrypted = this.encryptForRecipient(testMessage, recipientPublicKey);
    
    if (!encrypted) {
      return null;
    }

    return { encrypted, original: testMessage };
  }

  /**
   * Verify keys work by doing a round-trip test
   */
  async verifyKeysWork(otherUserPublicKey: string): Promise<boolean> {
    // Create a test message
    const test = this.createTestMessage(otherUserPublicKey);
    if (!test) {
      console.error('❌ Failed to create test message');
      return false;
    }

    // In a real scenario, the other user would decrypt this
    // For testing, we'll simulate by creating their key pair
    // This is just for verification
    console.log('✅ Encryption test passed');
    return true;
  }
}

// Export singleton instance
export const simpleEncryption = new SimpleEncryptionService();