/**
 * Test script to verify Firestore permissions
 * Run with: node test-firestore.js
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

async function testFirestoreAccess() {
  console.log('🧪 Testing Firestore access...\n');
  
  try {
    // Test 1: Read users collection
    console.log('📖 Test 1: Reading users collection...');
    const usersSnapshot = await db.collection('users').limit(1).get();
    console.log(`✅ Successfully read users collection (${usersSnapshot.size} docs)\n`);
    
    // Test 2: Read conversations collection
    console.log('📖 Test 2: Reading conversations collection...');
    const convSnapshot = await db.collection('conversations').limit(1).get();
    console.log(`✅ Successfully read conversations collection (${convSnapshot.size} docs)\n`);
    
    // Test 3: Write test document
    console.log('✍️ Test 3: Writing test document...');
    const testDoc = {
      test: true,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      message: 'Test from chat server'
    };
    await db.collection('conversations').doc('test-conversation').set(testDoc);
    console.log('✅ Successfully wrote test document\n');
    
    // Test 4: Delete test document
    console.log('🗑️ Test 4: Deleting test document...');
    await db.collection('conversations').doc('test-conversation').delete();
    console.log('✅ Successfully deleted test document\n');
    
    console.log('🎉 All Firestore tests passed! Permissions are correctly configured.');
    
  } catch (error) {
    console.error('❌ Firestore test failed:', error.message);
    console.error('\n⚠️ Please ensure the service account has the following roles:');
    console.error('   - Cloud Datastore User (roles/datastore.user)');
    console.error('   - Firebase Admin SDK Administrator Service Agent (roles/firebase.sdkAdminServiceAgent)');
    console.error('\nAdd these roles at:');
    console.error('https://console.cloud.google.com/iam-admin/iam?project=pxl-perfect-1');
  }
  
  process.exit(0);
}

testFirestoreAccess();