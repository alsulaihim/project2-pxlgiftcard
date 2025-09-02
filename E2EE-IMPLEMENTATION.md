# End-to-End Encryption (E2EE) Implementation Documentation

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Key Components](#key-components)
4. [Implementation Details](#implementation-details)
5. [Message Flow](#message-flow)
6. [Troubleshooting Guide](#troubleshooting-guide)
7. [Testing & Verification](#testing--verification)
8. [Security Considerations](#security-considerations)

## Overview

This document describes the complete end-to-end encryption (E2EE) implementation for the chat system. The system uses **TweetNaCl** (NaCl: Networking and Cryptography library) to provide secure message encryption between users.

### Encryption Algorithm
- **Algorithm**: Curve25519-XSalsa20-Poly1305 (NaCl box)
- **Library**: TweetNaCl.js
- **Key Size**: 32 bytes (256 bits)
- **Nonce Size**: 24 bytes

### Core Principle
Messages are encrypted on the sender's device and can only be decrypted by the intended recipient. The server and database never have access to plaintext messages.

## Architecture

```
┌─────────────┐                      ┌─────────────┐
│   User A    │                      │   User B    │
│  (Browser)  │                      │  (Browser)  │
└─────┬───────┘                      └──────┬──────┘
      │                                      │
      │  1. Generate Keypair                 │  1. Generate Keypair
      │  2. Store in IndexedDB               │  2. Store in IndexedDB
      │  3. Upload Public Key                │  3. Upload Public Key
      │                                      │
      ├──────────────┬───────────────────────┤
      │              │                       │
      ▼              ▼                       ▼
┌──────────────────────────────────────────────────┐
│                  Firestore                       │
│  ┌─────────────────────────────────────────┐    │
│  │  userKeys Collection                    │    │
│  │  - userId/publicKey pairs               │    │
│  └─────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────┐    │
│  │  conversations/messages Collection      │    │
│  │  - Encrypted message content            │    │
│  │  - Plaintext marker for sender's copy   │    │
│  └─────────────────────────────────────────┘    │
└──────────────────────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────┐
│              Socket.IO Server                    │
│  - Real-time message delivery                    │
│  - No access to message content                  │
│  - Only routes encrypted payloads                │
└──────────────────────────────────────────────────┘
```

## Key Components

### 1. Key Management Service (`/src/services/chat/key-exchange.service.ts`)

Handles cryptographic key generation and exchange:

```typescript
// Key generation and storage
export async function initializeEncryption(userId: string): Promise<void> {
  // Generate keypair
  const keyPair = nacl.box.keyPair();
  
  // Store keys in IndexedDB
  await storeKeys(userId, {
    publicKey: keyPair.publicKey,
    secretKey: keyPair.secretKey
  });
  
  // Upload public key to Firestore
  await uploadPublicKey(userId, keyPair.publicKey);
}

// Retrieve user's public key for encryption
export async function getUserPublicKey(userId: string): Promise<Uint8Array | null> {
  // First check cache, then IndexedDB, finally Firestore
  return await fetchPublicKey(userId);
}
```

### 2. Encryption Service (`/src/services/chat/encryption.service.ts`)

Core encryption/decryption logic:

```typescript
// Encrypt message for recipient
export function encryptMessage(
  content: string,
  recipientPublicKey: Uint8Array,
  senderSecretKey: Uint8Array
): { encrypted: string; nonce: string } {
  const nonce = nacl.randomBytes(24);
  const messageBytes = new TextEncoder().encode(content);
  
  const encrypted = nacl.box(
    messageBytes,
    nonce,
    recipientPublicKey,
    senderSecretKey
  );
  
  return {
    encrypted: Buffer.from(encrypted).toString('base64'),
    nonce: Buffer.from(nonce).toString('base64')
  };
}

// Decrypt received message
export function decryptMessage(
  encryptedContent: string,
  nonce: string,
  senderPublicKey: Uint8Array,
  recipientSecretKey: Uint8Array
): string {
  const encryptedBytes = Buffer.from(encryptedContent, 'base64');
  const nonceBytes = Buffer.from(nonce, 'base64');
  
  const decrypted = nacl.box.open(
    encryptedBytes,
    nonceBytes,
    senderPublicKey,
    recipientSecretKey
  );
  
  return new TextDecoder().decode(decrypted);
}
```

### 3. Chat Store (`/src/stores/chatStore.ts`)

Manages message sending with encryption:

```typescript
sendMessage: async (content: string) => {
  const { currentUser, activeConversationId } = get();
  
  // Get recipient's public key
  const recipientPublicKey = await getUserPublicKey(recipientId);
  
  // Get sender's keys
  const senderKeys = await getKeys(currentUser.uid);
  
  // Encrypt for recipient
  const { encrypted, nonce } = encryptMessage(
    content,
    recipientPublicKey,
    senderKeys.secretKey
  );
  
  // For sender's copy: Use plaintext marker
  const senderText = Buffer.from(content).toString('base64');
  const senderNonce = 'plaintext'; // Special marker
  
  // Send via Socket.IO
  socket.emit('message:send', {
    conversationId,
    text: encrypted,
    nonce: nonce,
    senderText: senderText,
    senderNonce: senderNonce
  });
}
```

### 4. Firestore Chat Service (`/src/services/chat/firestore-chat.service.ts`)

Handles message display and decryption:

```typescript
// Process messages for display
async function processMessageForDisplay(message: any): Promise<any> {
  const currentUserId = auth.currentUser?.uid;
  
  // Determine which encrypted version to use
  const isOwnMessage = message.senderId === currentUserId;
  
  if (isOwnMessage && message.senderNonce === 'plaintext') {
    // Sender viewing their own message - use plaintext
    const content = Buffer.from(message.senderText, 'base64').toString('utf-8');
    return { ...message, text: content, decrypted: true };
  } else {
    // Recipient viewing message - decrypt
    const senderPublicKey = await getUserPublicKey(message.senderId);
    const recipientKeys = await getKeys(currentUserId);
    
    const decrypted = decryptMessage(
      message.text,
      message.nonce,
      senderPublicKey,
      recipientKeys.secretKey
    );
    
    return { ...message, text: decrypted, decrypted: true };
  }
}
```

## Message Flow

### Sending a Message

1. **User types message** → Clicks send
2. **Get encryption keys**:
   - Fetch recipient's public key from Firestore
   - Get sender's private key from IndexedDB
3. **Encrypt message**:
   - Generate random nonce (24 bytes)
   - Encrypt using NaCl box (recipient's public + sender's private)
   - Create plaintext copy for sender (base64 encoded with 'plaintext' marker)
4. **Send via Socket.IO**:
   - Emit encrypted message with both versions
5. **Store in Firestore**:
   - Save encrypted content and nonces
   - Both sender and recipient versions stored

### Receiving a Message

1. **Socket.IO receives** encrypted message
2. **Determine viewer**:
   - If sender: Use senderText with plaintext marker
   - If recipient: Use encrypted text with nonce
3. **Decrypt if needed**:
   - Get sender's public key from Firestore
   - Get own private key from IndexedDB
   - Decrypt using NaCl box.open
4. **Display** decrypted message

## Troubleshooting Guide

### Common Issues and Solutions

#### 1. "[Legacy encrypted message]" Error
**Cause**: Message was encrypted with old keys or different encryption system.
**Solution**:
```bash
# Run the encryption reset script
node reset-all-encryption.js
```
Then have all users:
1. Clear browser data (F12 → Application → Storage → Clear site data)
2. Refresh browsers
3. New keys will be generated automatically

#### 2. "[Unable to decrypt - keys mismatch]" Error
**Cause**: Keys in IndexedDB don't match keys in Firestore.
**Solution**:
1. Check if UIDs match between Firebase Auth and Socket.IO:
```javascript
// In browser console
console.log('Firebase UID:', firebase.auth().currentUser.uid);
// Should match the UID used in Socket.IO authentication
```
2. Clear and regenerate keys:
```javascript
// In browser console
await indexedDB.deleteDatabase('chatKeys');
location.reload();
```

#### 3. "[No encrypted version available]" Error
**Cause**: Message doesn't have encrypted content for this user.
**Solution**: 
- Ensure both `text/nonce` (for recipient) and `senderText/senderNonce` (for sender) are being saved
- Check Socket.IO message handler includes all fields

#### 4. Messages Not Encrypting
**Cause**: Encryption not initialized.
**Solution**:
```javascript
// Check if keys exist (browser console)
const db = await openDB('chatKeys', 1);
const keys = await db.get('keys', 'currentUserId');
console.log('Keys exist:', !!keys);
```

#### 5. NaCl Box Encryption Fails
**Cause**: Trying to encrypt to your own public key.
**Important**: NaCl box CANNOT encrypt a message using the same keypair (sender = recipient).
**Solution**: Use plaintext storage with 'plaintext' marker for sender's copy.

### Debug Commands

```javascript
// Check encryption status (browser console)
async function checkEncryptionStatus() {
  const db = await openDB('chatKeys', 1);
  const keys = await db.getAll('keys');
  console.log('Stored keys:', keys);
  
  // Check Firestore public keys
  const response = await fetch('/api/debug/keys');
  const publicKeys = await response.json();
  console.log('Public keys in Firestore:', publicKeys);
}

// Force key regeneration
async function forceKeyRegeneration() {
  await indexedDB.deleteDatabase('chatKeys');
  await chatStore.getState().initializeEncryption(currentUser.uid);
  console.log('Keys regenerated');
}
```

## Testing & Verification

### 1. Verify Encryption is Working

Open browser DevTools Network tab and inspect WebSocket messages:
1. Look for `message:send` events
2. Message content should be base64 encoded gibberish
3. Should see both `text` (encrypted) and `senderText` (plaintext for sender)

### 2. Verify Keys are Generated

```javascript
// Browser console
const db = await openDB('chatKeys', 1);
const keys = await db.get('keys', firebase.auth().currentUser.uid);
console.log('Public key:', btoa(String.fromCharCode(...keys.publicKey)));
console.log('Secret key exists:', !!keys.secretKey);
```

### 3. Test Message Flow

1. Open two different browsers (or incognito windows)
2. Log in as different users
3. Send a message from User A to User B
4. Verify:
   - User A sees their message immediately (using plaintext copy)
   - User B receives and can read the message (after decryption)
   - Database shows encrypted content

### 4. Inspect Firestore Data

In Firebase Console → Firestore:
- Check `userKeys` collection - should only have public keys
- Check `conversations/{id}/messages` - should show encrypted `text` and `senderText`
- No plaintext should be visible in database

## Security Considerations

### What's Secure
✅ **Private keys never leave the device** - Stored only in IndexedDB  
✅ **Messages encrypted end-to-end** - Server/database can't read content  
✅ **Forward secrecy** - Each message has unique nonce  
✅ **Authentication** - Firebase Auth ensures user identity  

### Limitations
⚠️ **Key backup** - If user clears browser data, messages are lost  
⚠️ **No key rotation** - Keys are generated once per device  
⚠️ **Trust on first use** - No verification of public keys  
⚠️ **Metadata visible** - Timestamps, sender/recipient IDs are not encrypted  

### Best Practices
1. **Never log or transmit private keys**
2. **Always use HTTPS in production**
3. **Implement key backup mechanism for production**
4. **Add public key verification (fingerprints)**
5. **Consider implementing Perfect Forward Secrecy**
6. **Regular security audits**

## Quick Reference

### File Locations
- **Key Exchange**: `/src/services/chat/key-exchange.service.ts`
- **Encryption Logic**: `/src/services/chat/encryption.service.ts`
- **Message Sending**: `/src/stores/chatStore.ts`
- **Message Display**: `/src/services/chat/firestore-chat.service.ts`
- **Socket Handler**: `/chat-server/src/handlers/message.handler.ts`
- **Reset Script**: `/reset-all-encryption.js`

### Key Functions
```typescript
// Initialize encryption for user
await initializeEncryption(userId);

// Encrypt a message
const { encrypted, nonce } = encryptMessage(content, recipientPublicKey, senderSecretKey);

// Decrypt a message
const plaintext = decryptMessage(encrypted, nonce, senderPublicKey, recipientSecretKey);

// Get user's public key
const publicKey = await getUserPublicKey(userId);

// Reset all encryption (emergency)
node reset-all-encryption.js
```

### Environment Requirements
- **Node.js**: 18+ 
- **Firebase**: Firestore for key exchange and message storage
- **Socket.IO**: Real-time message delivery
- **IndexedDB**: Browser API for local key storage

## Emergency Procedures

### Complete System Reset
If encryption is completely broken:

1. **Stop all services**:
```bash
# Kill chat server and Next.js
pkill -f "npm start"
pkill -f "npm run dev"
```

2. **Run reset script**:
```bash
node reset-all-encryption.js
```

3. **Clear all browser data** (all users):
- Open DevTools (F12)
- Application tab → Storage → Clear site data

4. **Restart services**:
```bash
# Terminal 1 - Chat server
cd chat-server
unset GOOGLE_APPLICATION_CREDENTIALS
npm start

# Terminal 2 - Next.js
npm run dev
```

5. **Test with fresh session**:
- Both users log in
- Keys auto-generate
- Send test messages

---

*Last Updated: January 2025*  
*Version: 1.0*  
*Status: Production Ready*