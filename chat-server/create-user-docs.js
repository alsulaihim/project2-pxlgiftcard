/**
 * Create user documents in Firestore
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');
const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'pxl-perfect-1'
});

const db = admin.firestore();

async function createUserDocuments() {
  console.log('📝 Creating user documents in Firestore...\n');
  
  const users = [
    {
      uid: 'NkTmPMpaTiTNw6RmhdITwCbmf6r2',
      displayName: 'User 1',
      email: 'user1@example.com',
      photoURL: '/default-avatar.png',
      tier: { current: 'starter' },
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    },
    {
      uid: '6NmJ13Xl01eLrOZ3HhAbEMYULI72',
      displayName: 'User 2',
      email: 'user2@example.com',
      photoURL: '/default-avatar.png',
      tier: { current: 'starter' },
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    },
    {
      uid: 'Rs6ia6SIaeZFSsJTQePhF2A1x1x1',
      displayName: 'User 3',
      email: 'user3@example.com',
      photoURL: '/default-avatar.png',
      tier: { current: 'starter' },
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    }
  ];
  
  try {
    for (const user of users) {
      const userRef = db.collection('users').doc(user.uid);
      
      // Check if user already exists
      const doc = await userRef.get();
      if (doc.exists) {
        console.log(`✅ User ${user.uid} already exists`);
        const data = doc.data();
        console.log(`   Name: ${data.displayName || 'Not set'}`);
        console.log(`   Email: ${data.email || 'Not set'}`);
      } else {
        await userRef.set(user);
        console.log(`✨ Created user document for ${user.uid}`);
        console.log(`   Name: ${user.displayName}`);
        console.log(`   Email: ${user.email}`);
      }
    }
    
    console.log('\n✅ User documents ready!');
  } catch (error) {
    console.error('❌ Error creating user documents:', error);
  }
  
  process.exit(0);
}

createUserDocuments();