/**
 * Message Decryption Service
 * Handles proper decryption of messages with key loading and fallback logic
 */

import { EncryptionService } from './encryption.service';
import { keyExchangeService } from './key-exchange.service';
import { auth } from '@/lib/firebase-config';

const encryptionService = EncryptionService.getInstance();

export interface DecryptionResult {
  success: boolean;
  text: string;
  error?: string;
}

/**
 * Decrypt a message with proper key loading and user identification
 */
export async function decryptMessage(
  messageData: any,
  currentUserId?: string
): Promise<DecryptionResult> {
  try {
    // Get the current user ID from Firebase Auth if not provided
    const userId = currentUserId || auth.currentUser?.uid;
    
    if (!userId) {
      console.error('❌ No user ID available for decryption');
      return { success: false, text: '[Authentication required]', error: 'No user ID' };
    }

    // Ensure keys are loaded for the current user
    let hasKeyPair = encryptionService.getPublicKey() !== null;
    
    if (!hasKeyPair) {
      console.log('🔐 Loading encryption keys for user:', userId);
      try {
        await keyExchangeService.initializeUserKeys(userId);
        hasKeyPair = encryptionService.getPublicKey() !== null;
        
        if (!hasKeyPair) {
          console.error('❌ Failed to load encryption keys');
          // Don't fail immediately - messages might be unencrypted or sender's own messages
          console.log('⚠️ Continuing without keys - will try plaintext decryption');
        }
      } catch (error) {
        console.error('❌ Error loading keys:', error);
        // Continue without keys - some messages might still be readable
        console.log('⚠️ Continuing without keys - will try plaintext decryption');
      }
    }

    // Check if this is a media message - they don't need decryption
    const isMediaMessage = messageData.type && ['image', 'file', 'voice', 'media'].includes(messageData.type);
    
    if (isMediaMessage) {
      // Media messages contain URLs that don't need decryption
      return { success: true, text: messageData.text || messageData.url || '' };
    }

    // Determine if this is the sender's own message
    // Primary check: senderId matches current user
    // Fallback check: presence of sender plaintext copy per E2EE spec
    const hasSenderPlaintextCopy = messageData.senderNonce === 'plaintext' && !!messageData.senderText;
    const isOwnMessage = (messageData.senderId === userId) || hasSenderPlaintextCopy;
    
    // Enhanced logging for debugging
    if (messageData.id) {
      console.log('🔐 Decrypting message:', {
        messageId: messageData.id,
        isOwnMessage,
        senderId: messageData.senderId,
        currentUserId: userId,
        hasSenderText: !!messageData.senderText,
        hasSenderNonce: !!messageData.senderNonce,
        senderNonceValue: messageData.senderNonce,
        hasText: !!messageData.text,
        hasNonce: !!messageData.nonce
      });
    }

    // Handle plaintext messages (no encryption)
    if (!messageData.nonce && !messageData.senderNonce) {
      const plaintext = messageData.text || messageData.senderText || '';
      console.log('📝 Message is plaintext (no encryption)');
      return { success: true, text: plaintext };
    }

    // Handle sender's own messages
    if (isOwnMessage) {
      // Primary path: Check for senderText/senderNonce fields (sender's copy)
      if (messageData.senderNonce === 'plaintext' && messageData.senderText) {
        try {
          // UTF-8 safe base64 decode for plaintext sender copy
          const binary = atob(messageData.senderText);
          const bytes = new Uint8Array(Array.from(binary, c => c.charCodeAt(0)));
          const decoded = new TextDecoder().decode(bytes);
          console.log('✅ Decoded sender\'s plaintext message (UTF-8)');
          return { success: true, text: decoded };
        } catch (e) {
          console.warn('⚠️ Base64 UTF-8 decode failed, trying as plain text');
          // Not base64, use as-is
          return { success: true, text: messageData.senderText };
        }
      }
      
      // Fallback 1: Check if senderText exists without plaintext marker
      if (messageData.senderText && !messageData.senderNonce) {
        try {
          // Try UTF-8 safe base64 first
          const binary = atob(messageData.senderText);
          const bytes = new Uint8Array(Array.from(binary, c => c.charCodeAt(0)));
          const decoded = new TextDecoder().decode(bytes);
          console.log('✅ Decoded sender text (no nonce marker, UTF-8)');
          return { success: true, text: decoded };
        } catch (e) {
          // Not base64, use as-is
          console.log('📝 Using sender text as-is');
          return { success: true, text: messageData.senderText };
        }
      }
      
      // Fallback 2: Plaintext message without encryption
      if (messageData.text && !messageData.nonce) {
        console.log('📝 Using plaintext for own message');
        return { success: true, text: messageData.text };
      }
      
      // Fallback 3: Attempt to handle dual-encrypted sender copies
      // Some historical messages stored a second encrypted copy for the sender
      // Try to decrypt using the current user's own public/private keys
      if (messageData.senderText && messageData.senderNonce && messageData.senderNonce !== 'plaintext') {
        try {
          // 3a) First, try base64 decode in case senderText is actually plaintext with a non-standard marker
          try {
            const decoded = atob(messageData.senderText);
            // Heuristic: if decoded contains printable characters, accept it
            if (decoded && /[\x20-\x7E\n\r\t]/.test(decoded)) {
              console.warn('⚠️ Sender text looked encrypted but decoded as base64 plaintext');
              return { success: true, text: decoded };
            }
          } catch (_e) {
            // Not base64 plaintext, proceed to decrypt attempt
          }

          // 3b) Try decrypting using our own public key (dual-encrypted copy)
          const myPublicKeyBase64 = encryptionService.getPublicKey();
          if (myPublicKeyBase64) {
            const decryptedOwn = encryptionService.decryptMessage(
              { content: messageData.senderText, nonce: messageData.senderNonce },
              myPublicKeyBase64
            );
            if (decryptedOwn) {
              console.log('✅ Decrypted dual-encrypted sender copy');
              return { success: true, text: decryptedOwn };
            }
          }

          console.warn('⚠️ Legacy encrypted senderText present but could not decrypt');
          return { success: false, text: '[Legacy encrypted message]', error: 'Legacy encryption' };
        } catch (_err) {
          console.warn('⚠️ Error while attempting dual-encrypted sender decrypt');
          return { success: false, text: '[Legacy encrypted message]', error: 'Legacy encryption' };
        }
      }
      
      // Own message without any readable copy
      console.error('❌ Own message without readable senderText');
      return { success: false, text: '[Cannot decrypt own message]', error: 'Missing sender copy' };
    }

    // Handle recipient's messages (messages from other users)
    if (!isOwnMessage && messageData.text) {
      if (messageData.nonce) {
        // Message is encrypted, need to decrypt
        try {
          // Get sender's public key
          const senderPublicKey = await keyExchangeService.getUserPublicKey(messageData.senderId);
          
          if (!senderPublicKey) {
            console.error('❌ Sender public key not found');
            return { success: false, text: '[Sender key not available]', error: 'No sender key' };
          }

          // Decrypt the message
          const decrypted = encryptionService.decryptMessage(
            {
              content: messageData.text,  // Changed from encryptedContent to content
              nonce: messageData.nonce
            },
            senderPublicKey
          );

          if (decrypted) {
            console.log('✅ Successfully decrypted message from other user');
            return { success: true, text: decrypted };
          } else {
            console.error('❌ Decryption returned empty');
            return { success: false, text: '[Decryption failed]', error: 'Decryption failed' };
          }
        } catch (error) {
          console.error('❌ Decryption error:', error);
          return { success: false, text: '[Decryption error]', error: 'Decryption exception' };
        }
      } else {
        // Message is plaintext (no encryption was used)
        console.log('📝 Message from other user is plaintext');
        return { success: true, text: messageData.text };
      }
    }

    // Fallback for unexpected cases
    console.warn('⚠️ Unexpected message format');
    const fallbackText = messageData.text || messageData.senderText || '[No content]';
    return { success: false, text: fallbackText, error: 'Unexpected format' };

  } catch (error) {
    console.error('❌ Message decryption service error:', error);
    return { 
      success: false, 
      text: '[Decryption service error]', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Batch decrypt multiple messages
 */
export async function decryptMessages(
  messages: any[],
  currentUserId?: string
): Promise<Map<string, DecryptionResult>> {
  const results = new Map<string, DecryptionResult>();
  
  // Ensure keys are loaded once before processing all messages
  const userId = currentUserId || auth.currentUser?.uid;
  if (userId) {
    try {
      await keyExchangeService.initializeUserKeys(userId);
    } catch (error) {
      console.error('Failed to initialize keys for batch decryption:', error);
    }
  }

  // Process messages in parallel for better performance
  const decryptionPromises = messages.map(async (message) => {
    const result = await decryptMessage(message, userId);
    results.set(message.id, result);
  });

  await Promise.all(decryptionPromises);
  
  return results;
}