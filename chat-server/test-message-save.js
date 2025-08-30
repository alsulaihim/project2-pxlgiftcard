/**
 * Test saving messages to Firestore
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

async function testMessageSave() {
  console.log('🧪 Testing message save to Firestore...\n');
  
  const conversationId = 'direct_6NmJ13Xl01eLrOZ3HhAbEMYULI72_NkTmPMpaTiTNw6RmhdITwCbmf6r2';
  
  try {
    // Create/update conversation document
    const conversationRef = db.collection('conversations').doc(conversationId);
    await conversationRef.set({
      members: ['NkTmPMpaTiTNw6RmhdITwCbmf6r2', '6NmJ13Xl01eLrOZ3HhAbEMYULI72'],
      type: 'direct',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    console.log('✅ Conversation document created/updated');
    
    // Save a test message
    const messageData = {
      senderId: 'NkTmPMpaTiTNw6RmhdITwCbmf6r2',
      text: 'Test message from Firestore',
      type: 'text',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      delivered: [],
      read: []
    };
    
    const messageRef = await conversationRef.collection('messages').add(messageData);
    console.log('✅ Message saved with ID:', messageRef.id);
    
    // Read it back
    const messageDoc = await messageRef.get();
    console.log('✅ Message retrieved:', messageDoc.data());
    
    console.log('\n🎉 Firestore message save test successful!');
  } catch (error) {
    console.error('❌ Error saving message:', error);
  }
  
  process.exit(0);
}

testMessageSave();