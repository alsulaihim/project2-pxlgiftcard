/*
 * Admin script to purge all messages from all conversations in Firestore (dev/staging only)
 * - Deletes every document in conversations/{id}/messages subcollections
 * - Resets conversation lastMessage fields
 *
 * Usage: node scripts/purge-messages.js
 */

const path = require('path');
const admin = require('firebase-admin');

async function initAdmin() {
  if (admin.apps.length) return;
  try {
    const saPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
      ? (path.isAbsolute(process.env.GOOGLE_APPLICATION_CREDENTIALS)
          ? process.env.GOOGLE_APPLICATION_CREDENTIALS
          : path.join(process.cwd(), process.env.GOOGLE_APPLICATION_CREDENTIALS))
      : path.join(__dirname, '..', 'serviceAccountKey.json');

    const serviceAccount = require(saPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: process.env.FIREBASE_PROJECT_ID || serviceAccount.project_id || 'pxl-perfect-1'
    });
    console.log('✅ Firebase Admin initialized');
  } catch (err) {
    console.error('❌ Failed to init Firebase Admin:', err.message);
    process.exit(1);
  }
}

async function deleteCollection(db, collectionRef, batchSize = 400) {
  const snapshot = await collectionRef.limit(batchSize).get();
  if (snapshot.empty) return 0;
  const batch = db.batch();
  snapshot.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
  return snapshot.size;
}

async function purgeMessages() {
  await initAdmin();
  const db = admin.firestore();

  const convSnap = await db.collection('conversations').get();
  console.log(`📚 Found ${convSnap.size} conversations`);

  let totalDeleted = 0;
  for (const convDoc of convSnap.docs) {
    const convId = convDoc.id;
    const messagesRef = db.collection('conversations').doc(convId).collection('messages');

    // Delete in batches
    let deletedInConv = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const deleted = await deleteCollection(db, messagesRef, 400);
      deletedInConv += deleted;
      totalDeleted += deleted;
      if (deleted < 400) break;
    }

    // Reset conversation lastMessage fields
    await convDoc.ref.set({
      lastMessage: admin.firestore.FieldValue.delete(),
      lastMessageTime: admin.firestore.FieldValue.delete(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    console.log(`🗑️ Conversation ${convId}: deleted ${deletedInConv} messages`);
  }

  console.log(`✅ Purge complete. Total messages deleted: ${totalDeleted}`);
}

purgeMessages().then(() => process.exit(0)).catch((e) => {
  console.error('❌ Purge failed:', e);
  process.exit(1);
});


