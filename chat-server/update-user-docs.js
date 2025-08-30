/**
 * Update user documents with display names
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

async function updateUserDocuments() {
  console.log('📝 Updating user documents in Firestore...\n');
  
  const updates = [
    {
      uid: 'NkTmPMpaTiTNw6RmhdITwCbmf6r2',
      displayName: 'Coco 1',
      photoURL: '/default-avatar.png'
    },
    {
      uid: '6NmJ13Xl01eLrOZ3HhAbEMYULI72',
      displayName: 'Coco 2',
      photoURL: '/default-avatar.png'
    },
    {
      uid: 'Rs6ia6SIaeZFSsJTQePhF2A1x1x1',
      displayName: 'Coco 4',
      photoURL: '/default-avatar.png'
    }
  ];
  
  try {
    for (const update of updates) {
      const userRef = db.collection('users').doc(update.uid);
      await userRef.update({
        displayName: update.displayName,
        photoURL: update.photoURL
      });
      console.log(`✨ Updated user ${update.uid}`);
      console.log(`   Display Name: ${update.displayName}`);
    }
    
    console.log('\n✅ User documents updated!');
  } catch (error) {
    console.error('❌ Error updating user documents:', error);
  }
  
  process.exit(0);
}

updateUserDocuments();