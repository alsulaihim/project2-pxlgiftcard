import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { calculatePXLFromUSD } from './utils/pxl-calculations';

// Initialize admin if not already done
if (admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * Process PXL purchase and update user balance
 * This should be called after successful payment verification
 */
export const processPXLPurchase = functions.https.onCall(async (data, context) => {
  // Check authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { usdAmount, paymentMethod, paymentId, userTier } = data;
  const userId = context.auth.uid;

  // Validate input
  if (!usdAmount || usdAmount <= 0) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid USD amount');
  }

  if (!paymentMethod || !paymentId) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing payment information');
  }

  try {
    // Get current exchange rate
    const currencyDoc = await db.doc('pxl-currency/main').get();
    if (!currencyDoc.exists) {
      throw new functions.https.HttpsError('failed-precondition', 'Currency data not found');
    }

    const currencyData = currencyDoc.data();
    const currentRate = currencyData?.currentRate || 100;

    // Calculate PXL amount with tier discount
    const calculation = calculatePXLFromUSD(usdAmount, currentRate, userTier);

    // Start a transaction to ensure atomicity
    const result = await db.runTransaction(async (transaction) => {
      // Get user document
      const userRef = db.doc(`users/${userId}`);
      const userDoc = await transaction.get(userRef);

      if (!userDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'User not found');
      }

      const userData = userDoc.data();
      const currentBalance = userData?.wallets?.pxl?.balance || 0;
      const currentTotalEarned = userData?.wallets?.pxl?.totalEarned || 0;

      // Create transaction record
      const transactionRef = db.collection('transactions').doc();
      transaction.set(transactionRef, {
        userId,
        type: 'pxl-purchase',
        amounts: {
          usd: usdAmount,
          pxl: calculation.totalPxl,
          exchangeRate: currentRate,
          bonusPxl: calculation.bonusPxl,
          effectiveRate: calculation.effectiveRate,
        },
        payment: {
          method: paymentMethod,
          provider: paymentMethod === 'paypal' ? 'paypal' : 'stripe',
          externalId: paymentId,
        },
        tier: {
          userTier,
          purchaseDiscountPercentage: calculation.appliedDiscount,
        },
        status: 'completed',
        timestamps: {
          created: admin.firestore.FieldValue.serverTimestamp(),
          updated: admin.firestore.FieldValue.serverTimestamp(),
          completed: admin.firestore.FieldValue.serverTimestamp(),
        },
      });

      // Update user balance
      transaction.update(userRef, {
        'wallets.pxl.balance': currentBalance + calculation.totalPxl,
        'wallets.pxl.totalEarned': currentTotalEarned + calculation.totalPxl,
        'timestamps.updated': admin.firestore.FieldValue.serverTimestamp(),
      });

      return {
        transactionId: transactionRef.id,
        pxlReceived: calculation.totalPxl,
        bonusPxl: calculation.bonusPxl,
        effectiveRate: calculation.effectiveRate,
      };
    });

    return result;
  } catch (error) {
    console.error('Error processing PXL purchase:', error);
    throw new functions.https.HttpsError('internal', 'Failed to process PXL purchase');
  }
});
