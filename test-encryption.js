const nacl = require('tweetnacl');
const util = require('tweetnacl-util');

// Generate key pairs for Alice and Bob
const alice = nacl.box.keyPair();
const bob = nacl.box.keyPair();

console.log('Alice public key:', util.encodeBase64(alice.publicKey));
console.log('Bob public key:', util.encodeBase64(bob.publicKey));

// Message from Alice to Bob
const message = 'Hello Bob, this is Alice!';
console.log('\n📝 Original message:', message);

// Alice encrypts for Bob
const nonce = nacl.randomBytes(24);
const messageBytes = util.decodeUTF8(message);

// Alice uses Bob's public key and her secret key
const encrypted = nacl.box(messageBytes, nonce, bob.publicKey, alice.secretKey);
console.log('🔐 Encrypted (base64):', util.encodeBase64(encrypted));

// Bob decrypts
// Bob uses Alice's public key and his secret key
const decrypted = nacl.box.open(encrypted, nonce, alice.publicKey, bob.secretKey);

if (decrypted) {
    const decryptedMessage = util.encodeUTF8(decrypted);
    console.log('🔓 Decrypted message:', decryptedMessage);
    console.log('✅ Success! Messages match:', message === decryptedMessage);
} else {
    console.log('❌ Decryption failed!');
}

// Test with shared key approach (more efficient)
console.log('\n--- Testing with shared key approach ---');

// Alice computes shared key with Bob
const aliceSharedKey = nacl.box.before(bob.publicKey, alice.secretKey);

// Bob computes shared key with Alice (should be the same)
const bobSharedKey = nacl.box.before(alice.publicKey, bob.secretKey);

console.log('Shared keys match:', util.encodeBase64(aliceSharedKey) === util.encodeBase64(bobSharedKey));

// Alice encrypts using shared key
const nonce2 = nacl.randomBytes(24);
const encrypted2 = nacl.box.after(messageBytes, nonce2, aliceSharedKey);

// Bob decrypts using shared key
const decrypted2 = nacl.box.open.after(encrypted2, nonce2, bobSharedKey);

if (decrypted2) {
    console.log('🔓 Decrypted with shared key:', util.encodeUTF8(decrypted2));
    console.log('✅ Shared key approach works!');
} else {
    console.log('❌ Shared key decryption failed!');
}