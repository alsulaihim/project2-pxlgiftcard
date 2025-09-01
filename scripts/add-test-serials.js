// Quick script to add test serial codes to products
// Run with: node scripts/add-test-serials.js

const admin = require('firebase-admin');
const serviceAccount = require('../firebase-service-account.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function addTestSerials() {
  try {
    // Get all products
    const productsSnapshot = await db.collection('products').get();
    
    console.log(`Found ${productsSnapshot.size} products`);
    
    for (const doc of productsSnapshot.docs) {
      const product = doc.data();
      console.log(`\nProcessing: ${product.brand} - ${product.name}`);
      
      // Update each denomination with test serials
      const updatedDenominations = product.denominations.map(denom => {
        // Generate 10 test serials for each denomination
        const testSerials = [];
        for (let i = 1; i <= 10; i++) {
          testSerials.push({
            code: `TEST-${product.brand.toUpperCase()}-${denom.value}-${String(i).padStart(4, '0')}`,
            status: 'available'
          });
        }
        
        console.log(`  - Adding ${testSerials.length} serials to $${denom.value} denomination`);
        
        return {
          ...denom,
          serials: testSerials,
          stock: testSerials.length
        };
      });
      
      // Update the product
      await doc.ref.update({
        denominations: updatedDenominations,
        status: 'active', // Also set to active
        updatedAt: admin.firestore.Timestamp.now()
      });
      
      console.log(`  ✓ Updated with test serials and set to active`);
    }
    
    console.log('\n✅ All products updated with test serials!');
    process.exit(0);
  } catch (error) {
    console.error('Error adding test serials:', error);
    process.exit(1);
  }
}

addTestSerials();