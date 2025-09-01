/**
 * Import products from CSV file
 * Usage: node scripts/import-products-csv.js data/sample-products-import.csv
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  const serviceAccount = require('../serviceAccountKey.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

// Function to expand serial range (e.g., "AMZN10XXX001-AMZN10XXX015")
function expandSerialRange(rangeStr) {
  const [start, end] = rangeStr.split('-');
  if (!start || !end) return [rangeStr]; // Single serial
  
  // Extract the numeric part
  const startMatch = start.match(/(\d+)$/);
  const endMatch = end.match(/(\d+)$/);
  
  if (!startMatch || !endMatch) return [rangeStr];
  
  const prefix = start.substring(0, startMatch.index);
  const startNum = parseInt(startMatch[1]);
  const endNum = parseInt(endMatch[1]);
  const numDigits = startMatch[1].length;
  
  const serials = [];
  for (let i = startNum; i <= endNum; i++) {
    const paddedNum = i.toString().padStart(numDigits, '0');
    serials.push(prefix + paddedNum);
  }
  
  return serials;
}

// Parse denomination string format: "value:quantity:serialRange|..."
function parseDenominations(denomStr) {
  const denominations = [];
  const denomParts = denomStr.split('|');
  
  for (const part of denomParts) {
    const [value, quantity, serialRange] = part.split(':');
    const serials = expandSerialRange(serialRange);
    
    denominations.push({
      value: parseInt(value),
      stock: parseInt(quantity),
      serials: serials.map(code => ({
        code,
        status: 'available'
      }))
    });
  }
  
  return denominations;
}

async function importProducts(csvFilePath) {
  console.log('📂 Reading CSV file:', csvFilePath);
  
  const csvContent = fs.readFileSync(csvFilePath, 'utf-8');
  const lines = csvContent.split('\n').filter(line => line.trim());
  
  if (lines.length < 2) {
    console.error('❌ CSV file is empty or invalid');
    return;
  }
  
  // Parse headers
  const headers = lines[0].split(',').map(h => h.trim());
  console.log('📋 Headers found:', headers);
  
  let successCount = 0;
  let errorCount = 0;
  
  // Process each product
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    
    // Simple CSV parsing (handles basic cases, not escaped commas in quotes)
    const values = line.split(',').map(v => v.trim());
    
    if (values.length < headers.length) {
      console.warn(`⚠️  Skipping row ${i + 1}: insufficient columns`);
      continue;
    }
    
    try {
      const brand = values[0];
      const name = values[1];
      const description = values[2];
      const category = values[3];
      const featured = values[4] === 'true';
      const status = values[5];
      const artwork = values[6];
      const denominationsStr = values[7];
      const totalSold = parseInt(values[8]) || 0;
      const createdAt = values[9] ? admin.firestore.Timestamp.fromDate(new Date(values[9])) : admin.firestore.Timestamp.now();
      
      console.log(`\n🎁 Processing: ${brand} - ${name}`);
      
      // Check if product already exists
      const existingQuery = await db.collection('products')
        .where('brand', '==', brand)
        .where('name', '==', name)
        .limit(1)
        .get();
      
      if (!existingQuery.empty) {
        console.log(`   ⚠️  Product already exists, skipping...`);
        continue;
      }
      
      // Parse denominations and serials
      const denominations = parseDenominations(denominationsStr);
      
      // Calculate total stock
      const totalStock = denominations.reduce((sum, d) => sum + d.stock, 0);
      
      // Create product document
      const productData = {
        brand,
        name,
        description,
        category,
        featured,
        status: totalStock > 0 ? status : 'out_of_stock',
        defaultArtworkUrl: '', // Will be set later if artwork exists
        artwork, // Store artwork identifier for later mapping
        denominations,
        totalSold,
        totalStock,
        popularity: totalSold, // Use totalSold as initial popularity
        createdAt,
        updatedAt: admin.firestore.Timestamp.now(),
        
        // Additional fields that might be needed
        supplierId: 'default',
        supplierName: 'Default Supplier',
        commission: 10,
        bgColor: '#000000'
      };
      
      // Add to Firestore
      const docRef = await db.collection('products').add(productData);
      console.log(`   ✅ Created product with ID: ${docRef.id}`);
      console.log(`   📦 Added ${totalStock} items across ${denominations.length} denominations`);
      
      successCount++;
      
    } catch (error) {
      console.error(`   ❌ Error processing row ${i + 1}:`, error.message);
      errorCount++;
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 Import Summary:');
  console.log(`   ✅ Successfully imported: ${successCount} products`);
  console.log(`   ❌ Failed: ${errorCount} products`);
  console.log(`   📦 Total processed: ${successCount + errorCount} rows`);
  console.log('='.repeat(60));
}

// Main execution
const csvFile = process.argv[2];

if (!csvFile) {
  console.error('❌ Please provide a CSV file path');
  console.log('Usage: node scripts/import-products-csv.js <csv-file-path>');
  console.log('Example: node scripts/import-products-csv.js data/sample-products-import.csv');
  process.exit(1);
}

if (!fs.existsSync(csvFile)) {
  console.error(`❌ File not found: ${csvFile}`);
  process.exit(1);
}

console.log('🚀 Starting product import...\n');
importProducts(csvFile)
  .then(() => {
    console.log('\n✅ Import complete!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Import failed:', error);
    process.exit(1);
  });