/**
 * Script to remove all existing products from Firestore
 * WARNING: This will permanently delete all product data!
 * 
 * Usage: node scripts/cleanup-all-products.js
 */

const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function deleteAllProducts() {
  console.log('🗑️  Starting product cleanup...\n');
  
  try {
    // Get all products
    const productsSnapshot = await db.collection('products').get();
    
    if (productsSnapshot.empty) {
      console.log('✅ No products found. Database is already clean.');
      return;
    }
    
    console.log(`Found ${productsSnapshot.size} products to delete.\n`);
    
    // Create a batch for efficient deletion
    const batch = db.batch();
    let count = 0;
    
    productsSnapshot.docs.forEach(doc => {
      const product = doc.data();
      console.log(`  - Deleting: ${product.brand} - ${product.name} (ID: ${doc.id})`);
      batch.delete(doc.ref);
      count++;
    });
    
    // Execute the batch delete
    console.log(`\n⏳ Deleting ${count} products...`);
    await batch.commit();
    
    console.log('\n✅ Successfully deleted all products!');
    console.log('   The products collection is now empty.');
    console.log('   You can now import your CSV file without conflicts.\n');
    
    // Also cleanup any related collections if they exist
    console.log('🔍 Checking for related data...');
    
    // Check for inventory logs
    const inventoryLogs = await db.collection('inventory-logs').limit(1).get();
    if (!inventoryLogs.empty) {
      console.log('   Note: inventory-logs collection still contains data.');
      console.log('   These logs will remain for audit purposes.');
    }
    
    // Check for artwork
    const artwork = await db.collection('artwork').limit(1).get();
    if (!artwork.empty) {
      console.log('   Note: artwork collection still contains data.');
      console.log('   Artwork entries are preserved for reuse.');
    }
    
    console.log('\n📋 Next steps:');
    console.log('   1. Go to /admin/products in your app');
    console.log('   2. Click "Import CSV"');
    console.log('   3. Select "sample-products-import.csv" from the data folder');
    console.log('   4. Import the 50 sample products\n');
    
  } catch (error) {
    console.error('❌ Error deleting products:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

// Confirmation prompt
const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('⚠️  WARNING: This script will DELETE ALL PRODUCTS from your database!');
console.log('   This action cannot be undone.\n');

rl.question('Are you sure you want to continue? (yes/no): ', (answer) => {
  if (answer.toLowerCase() === 'yes') {
    rl.close();
    deleteAllProducts();
  } else {
    console.log('\n❌ Cleanup cancelled. No products were deleted.');
    rl.close();
    process.exit(0);
  }
});