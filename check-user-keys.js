const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
const serviceAccountPath = path.join(__dirname, 'chat-server', 'serviceAccountKey.json');
const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkUserKeys() {
  try {
    console.log('\n🔍 Checking userKeys collection in Firestore...\n');
    
    const userKeysSnapshot = await db.collection('userKeys').get();
    
    if (userKeysSnapshot.empty) {
      console.log('❌ No user keys found in Firestore!');
      console.log('   Users need to have their encryption keys registered.');
      return;
    }
    
    console.log(`✅ Found ${userKeysSnapshot.size} users with registered keys:\n`);
    
    userKeysSnapshot.forEach((doc) => {
      const data = doc.data();
      console.log(`👤 User: ${doc.id}`);
      console.log(`   - Public Key: ${data.publicKey ? data.publicKey.substring(0, 50) + '...' : 'MISSING'}`);
      console.log(`   - PreKeys Count: ${data.preKeys ? data.preKeys.length : 0}`);
      console.log(`   - Created: ${data.createdAt ? data.createdAt.toDate() : 'N/A'}`);
      console.log(`   - Updated: ${data.updatedAt ? data.updatedAt.toDate() : 'N/A'}`);
      console.log('');
    });
    
    // Check users collection to see who doesn't have keys
    console.log('\n🔍 Checking which users are missing encryption keys...\n');
    
    const usersSnapshot = await db.collection('users').get();
    const usersWithoutKeys = [];
    
    for (const userDoc of usersSnapshot.docs) {
      const userKeysDoc = await db.collection('userKeys').doc(userDoc.id).get();
      if (!userKeysDoc.exists) {
        const userData = userDoc.data();
        usersWithoutKeys.push({
          uid: userDoc.id,
          email: userData.email || 'N/A',
          displayName: userData.displayName || 'N/A'
        });
      }
    }
    
    if (usersWithoutKeys.length > 0) {
      console.log(`⚠️ Found ${usersWithoutKeys.length} users without encryption keys:`);
      usersWithoutKeys.forEach(user => {
        console.log(`   - ${user.uid}: ${user.displayName} (${user.email})`);
      });
      console.log('\n💡 These users need to log in to the chat to initialize their encryption keys.');
    } else {
      console.log('✅ All users have encryption keys registered!');
    }
    
  } catch (error) {
    console.error('❌ Error checking user keys:', error);
  } finally {
    process.exit(0);
  }
}

checkUserKeys();