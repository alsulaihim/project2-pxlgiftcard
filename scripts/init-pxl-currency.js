/**
 * Script to initialize PXL currency data in Firestore
 * Run this once to set up the initial currency document
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin with service account
// You'll need to download the service account key from Firebase Console
// and save it as service-account-key.json
const serviceAccount = require('../service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'pxl-perfect-1'
});

const db = admin.firestore();

async function initializePXLCurrency() {
  try {
    console.log('Initializing PXL currency data...');
    
    const now = admin.firestore.Timestamp.now();
    
    // Generate initial rate data
    const baseRate = 100;
    const currentRate = 99.76; // Slightly below base for demo
    
    // Generate hourly data for last 24 hours
    const hourlyRates = [];
    for (let i = 23; i >= 0; i--) {
      const timestamp = new Date(Date.now() - i * 60 * 60 * 1000);
      const rate = baseRate + (Math.random() - 0.5) * 3; // ±1.5% variation
      hourlyRates.push({
        timestamp: admin.firestore.Timestamp.fromDate(timestamp),
        rate,
        volume: Math.random() * 1000000, // Random volume up to 1M
      });
    }
    
    // Generate daily data for last 30 days
    const dailyRates = [];
    for (let i = 29; i >= 0; i--) {
      const timestamp = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const rate = baseRate + (Math.random() - 0.5) * 5; // ±2.5% variation
      dailyRates.push({
        timestamp: admin.firestore.Timestamp.fromDate(timestamp),
        rate,
        volume: Math.random() * 10000000, // Random volume up to 10M
      });
    }
    
    // Create the currency document
    const currencyData = {
      id: 'pxl-currency',
      currentRate,
      baseRate,
      marketData: {
        hourlyRates,
        dailyRates,
        trend: currentRate > hourlyRates[0].rate ? 'up' : 'down',
        volatility: 2.34, // Example volatility percentage
      },
      tierMultipliers: {
        starter: {
          discountPercentage: 0.00,
          cashbackPercentage: 0.00,
        },
        rising: {
          discountPercentage: 0.03,
          cashbackPercentage: 0.01,
        },
        pro: {
          discountPercentage: 0.08,
          cashbackPercentage: 0.02,
        },
        pixlbeast: {
          discountPercentage: 0.10,
          cashbackPercentage: 0.025,
        },
        pixlionaire: {
          discountPercentage: 0.13,
          cashbackPercentage: 0.03,
        },
      },
      purchaseDiscounts: {
        starter: 0.00,
        rising: 0.03,
        pro: 0.07,
        pixlbeast: 0.09,
        pixlionaire: 0.13,
      },
      lastUpdated: now,
    };
    
    // Save to Firestore
    await db.collection('pxl-currency').doc('main').set(currencyData);
    
    console.log('✅ PXL currency data initialized successfully!');
    console.log(`Current rate: 1 USD = ${currentRate} PXL`);
    console.log(`Base rate: 1 USD = ${baseRate} PXL`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error initializing PXL currency:', error);
    process.exit(1);
  }
}

// Run the initialization
initializePXLCurrency();
