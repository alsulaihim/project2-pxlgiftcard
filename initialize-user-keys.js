const admin = require('firebase-admin');
const path = require('path');
const nacl = require('tweetnacl');
const base64 = require('base64-js');

// Initialize Firebase Admin
const serviceAccountPath = path.join(__dirname, 'chat-server', 'serviceAccountKey.json');
const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

function generateKeyPair() {
  const keyPair = nacl.box.keyPair();
  return {
    publicKey: base64.fromByteArray(keyPair.publicKey),
    secretKey: base64.fromByteArray(keyPair.secretKey)
  };
}

function generatePreKeys(count = 10) {
  const preKeys = [];
  for (let i = 0; i < count; i++) {
    const keyPair = nacl.box.keyPair();
    preKeys.push(base64.fromByteArray(keyPair.publicKey));
  }
  return preKeys;
}

async function initializeKeysForUser(userId, userEmail) {
  try {
    // Check if user already has keys
    const userKeysDoc = await db.collection('userKeys').doc(userId).get();
    if (userKeysDoc.exists) {
      console.log(`✅ User ${userEmail} (${userId}) already has keys`);
      return;
    }
    
    // Generate new keys
    const keyPair = generateKeyPair();
    const preKeys = generatePreKeys(10);
    
    // Store in Firestore
    await db.collection('userKeys').doc(userId).set({
      userId,
      publicKey: keyPair.publicKey,
      preKeys,
      devices: {
        [`device_${Date.now()}`]: {
          deviceId: `device_${Date.now()}`,
          publicKey: keyPair.publicKey,
          lastUpdated: admin.firestore.FieldValue.serverTimestamp()
        }
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log(`✅ Initialized keys for ${userEmail} (${userId})`);
    console.log(`   - Public Key: ${keyPair.publicKey.substring(0, 50)}...`);
    console.log(`   - PreKeys: ${preKeys.length} generated`);
    
  } catch (error) {
    console.error(`❌ Failed to initialize keys for ${userEmail}:`, error);
  }
}

async function initializeAllUserKeys() {
  try {
    console.log('\n🔑 Initializing encryption keys for all users...\n');
    
    // Get all users
    const usersSnapshot = await db.collection('users').get();
    
    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      await initializeKeysForUser(
        userDoc.id, 
        userData.email || userData.displayName || 'Unknown'
      );
    }
    
    console.log('\n✅ Key initialization complete!');
    console.log('💡 Users can now send and receive encrypted messages.');
    
  } catch (error) {
    console.error('❌ Error initializing user keys:', error);
  } finally {
    process.exit(0);
  }
}

// Check if specific user ID was provided
const userId = process.argv[2];
if (userId) {
  // Initialize keys for specific user
  initializeKeysForUser(userId, userId).then(() => process.exit(0));
} else {
  // Initialize keys for all users
  initializeAllUserKeys();
}