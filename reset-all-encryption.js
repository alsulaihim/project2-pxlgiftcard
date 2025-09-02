/**
 * Complete reset of encryption system
 * Run this to clear all encryption-related data and start fresh
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
const serviceAccount = require('./chat-server/serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'pxl-perfect-1'
});

const db = admin.firestore();

async function resetEncryption() {
  console.log('🔄 Starting complete encryption reset...\n');

  try {
    // 1. Delete all user keys
    console.log('1️⃣ Deleting all user keys from Firestore...');
    const userKeysSnapshot = await db.collection('userKeys').get();
    const deletePromises = [];
    userKeysSnapshot.forEach((doc) => {
      deletePromises.push(doc.ref.delete());
      console.log(`   Deleting keys for user: ${doc.id}`);
    });
    await Promise.all(deletePromises);
    console.log(`   ✅ Deleted ${deletePromises.length} user key documents\n`);

    // 2. Get all conversations
    console.log('2️⃣ Finding all conversations...');
    const conversationsSnapshot = await db.collection('conversations').get();
    console.log(`   Found ${conversationsSnapshot.size} conversations\n`);

    // 3. Delete all messages from all conversations
    console.log('3️⃣ Deleting all messages (they have old encryption)...');
    let totalMessages = 0;
    for (const convDoc of conversationsSnapshot.docs) {
      const messagesSnapshot = await convDoc.ref.collection('messages').get();
      const messageDeletions = [];
      messagesSnapshot.forEach((msgDoc) => {
        messageDeletions.push(msgDoc.ref.delete());
      });
      await Promise.all(messageDeletions);
      totalMessages += messageDeletions.length;
      console.log(`   Deleted ${messageDeletions.length} messages from conversation: ${convDoc.id}`);
    }
    console.log(`   ✅ Deleted ${totalMessages} total messages\n`);

    console.log('✅ COMPLETE! Encryption system has been reset.\n');
    console.log('Next steps:');
    console.log('1. Both users should clear their browser data:');
    console.log('   - Open DevTools (F12)');
    console.log('   - Application tab → Storage → Clear site data');
    console.log('2. Refresh both browser windows');
    console.log('3. New encryption keys will be generated automatically');
    console.log('4. Send new test messages\n');

  } catch (error) {
    console.error('❌ Error during reset:', error);
  }

  process.exit(0);
}

// Run the reset
resetEncryption();