/**
 * Firebase Cloud Functions Entry Point
 * Exports all cloud functions for the PXL Giftcard Platform
 */

import * as admin from 'firebase-admin';

// Initialize Firebase Admin
admin.initializeApp();

// Export PXL Currency Functions
export {
  processPXLPurchase,
  updateExchangeRate,
  simulateRateFluctuation
} from './pxl-currency';

// Export secure PXL purchase processing
export { processPXLPurchase as processSecurePXLPurchase } from './process-pxl-purchase';

// TODO: Add more function exports as they are created:
// - Payment processing functions (Stripe/PayPal webhooks)
// - Giftcard purchase functions
// - PXL transfer functions
// - User tier progression functions
// - Admin functions
