/**
 * Firebase Cloud Functions for PXL Currency System
 * Handles secure balance updates, tier progression, and transaction processing
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { 
  calculateTier, 
  getNextTierThreshold,
  calculatePXLFromUSD,
  TIER_THRESHOLDS,
  PURCHASE_DISCOUNTS
} from '../../src/lib/pxl-currency';

const db = admin.firestore();

/**
 * Process PXL purchase after successful payment
 * This function should be called after Stripe/PayPal payment confirmation
 */
export const processPXLPurchase = functions.https.onCall(async (data, context) => {
  // Verify authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { usdAmount, paymentMethod, paymentId } = data;
  const userId = context.auth.uid;

  if (!usdAmount || !paymentMethod || !paymentId) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing required parameters');
  }

  try {
    // Get current user data
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'User not found');
    }

    const userData = userDoc.data()!;
    const currentTier = userData.tier.current;
    const currentPXLBalance = userData.wallets.pxl.balance || 0;

    // Get current exchange rate
    const currencyDoc = await db.collection('pxl-currency').doc('main').get();
    if (!currencyDoc.exists) {
      throw new functions.https.HttpsError('internal', 'Currency data not found');
    }
    
    const currencyData = currencyDoc.data()!;
    const exchangeRate = currencyData.currentRate;

    // Calculate PXL amount with tier bonus
    const calculation = calculatePXLFromUSD(
      usdAmount,
      exchangeRate,
      currentTier as keyof typeof PURCHASE_DISCOUNTS
    );

    // Create transaction record
    const transaction = {
      userId,
      type: 'pxl-purchase',
      amounts: {
        usd: usdAmount,
        pxl: calculation.totalPxl,
        exchangeRate,
        bonusPxl: calculation.bonusPxl,
        effectiveRate: calculation.effectiveRate,
      },
      payment: {
        method: paymentMethod,
        provider: paymentMethod === 'paypal' ? 'paypal' : 'stripe',
        externalId: paymentId,
      },
      tier: {
        userTier: currentTier,
        purchaseDiscountPercentage: calculation.appliedDiscount,
      },
      status: 'completed',
      timestamps: {
        created: admin.firestore.Timestamp.now(),
        updated: admin.firestore.Timestamp.now(),
        completed: admin.firestore.Timestamp.now(),
      },
    };

    // Update user balance and check for tier progression
    const newPXLBalance = currentPXLBalance + calculation.totalPxl;
    const newTier = calculateTier(newPXLBalance);
    const tierChanged = newTier !== currentTier;

    // Prepare user update
    const userUpdate: any = {
      'wallets.pxl.balance': newPXLBalance,
      'wallets.pxl.totalEarned': admin.firestore.FieldValue.increment(calculation.totalPxl),
      'timestamps.updated': admin.firestore.Timestamp.now(),
    };

    // Update tier if changed
    if (tierChanged) {
      userUpdate['tier.current'] = newTier;
      userUpdate['tier.pxlBalance'] = newPXLBalance;
      userUpdate['tier.nextTierThreshold'] = getNextTierThreshold(newPXLBalance);
      
      // Add tier progression history
      userUpdate['tier.progressHistory'] = admin.firestore.FieldValue.arrayUnion({
        fromTier: currentTier,
        toTier: newTier,
        timestamp: admin.firestore.Timestamp.now(),
        triggerAmount: calculation.totalPxl,
        newBalance: newPXLBalance,
      });
    }

    // Execute updates in a transaction
    const batch = db.batch();
    
    // Add transaction record
    const txRef = db.collection('transactions').doc();
    batch.set(txRef, transaction);
    
    // Update user
    batch.update(userRef, userUpdate);
    
    // Commit
    await batch.commit();

    // Log admin action
    await db.collection('admin-actions').add({
      type: 'pxl_purchase_processed',
      userId,
      amount: usdAmount,
      pxlCredited: calculation.totalPxl,
      tierChanged,
      newTier: tierChanged ? newTier : null,
      timestamp: admin.firestore.Timestamp.now(),
    });

    return {
      success: true,
      transactionId: txRef.id,
      pxlReceived: calculation.totalPxl,
      bonusPxl: calculation.bonusPxl,
      effectiveRate: calculation.effectiveRate,
      newBalance: newPXLBalance,
      tierChanged,
      newTier,
    };
  } catch (error) {
    console.error('Error processing PXL purchase:', error);
    throw new functions.https.HttpsError('internal', 'Failed to process PXL purchase');
  }
});

/**
 * Update PXL exchange rate (admin only)
 */
export const updateExchangeRate = functions.https.onCall(async (data, context) => {
  // Verify admin authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  // Check if user is admin (you would implement your own admin check)
  const adminDoc = await db.collection('admin-users').doc(context.auth.uid).get();
  if (!adminDoc.exists) {
    throw new functions.https.HttpsError('permission-denied', 'User is not an admin');
  }

  const { newRate, reason } = data;

  if (!newRate || newRate <= 0) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid exchange rate');
  }

  try {
    const currencyRef = db.collection('pxl-currency').doc('main');
    const currencyDoc = await currencyRef.get();
    
    if (!currencyDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Currency data not found');
    }

    const currentData = currencyDoc.data()!;
    const oldRate = currentData.currentRate;

    // Add new rate point
    const newRatePoint = {
      timestamp: admin.firestore.Timestamp.now(),
      rate: newRate,
    };

    // Update hourly rates
    const updatedHourlyRates = [...(currentData.marketData.hourlyRates || []), newRatePoint]
      .slice(-24); // Keep last 24 hours

    // Calculate trend
    const trend = newRate > oldRate ? 'up' : newRate < oldRate ? 'down' : 'stable';

    await currencyRef.update({
      currentRate: newRate,
      'marketData.hourlyRates': updatedHourlyRates,
      'marketData.trend': trend,
      lastUpdated: admin.firestore.Timestamp.now(),
    });

    // Log the change
    await db.collection('admin-actions').add({
      type: 'exchange_rate_update',
      adminId: context.auth.uid,
      oldRate,
      newRate,
      change: newRate - oldRate,
      changePercent: ((newRate - oldRate) / oldRate) * 100,
      reason: reason || 'Manual update',
      timestamp: admin.firestore.Timestamp.now(),
    });

    return {
      success: true,
      oldRate,
      newRate,
      change: newRate - oldRate,
    };
  } catch (error) {
    console.error('Error updating exchange rate:', error);
    throw new functions.https.HttpsError('internal', 'Failed to update exchange rate');
  }
});

/**
 * Scheduled function to generate mock rate fluctuations (for demo purposes)
 * In production, this would integrate with real market data
 */
export const simulateRateFluctuation = functions.pubsub
  .schedule('every 1 hours')
  .onRun(async (context) => {
    try {
      const currencyRef = db.collection('pxl-currency').doc('main');
      const currencyDoc = await currencyRef.get();
      
      if (!currencyDoc.exists) {
        console.error('Currency document not found');
        return;
      }

      const currentData = currencyDoc.data()!;
      const baseRate = currentData.baseRate || 100;
      const currentRate = currentData.currentRate;

      // Generate small fluctuation (±0.5% from current rate)
      const fluctuation = (Math.random() - 0.5) * 0.01;
      const newRate = currentRate * (1 + fluctuation);
      
      // Keep within ±5% of base rate
      const boundedRate = Math.max(
        baseRate * 0.95,
        Math.min(baseRate * 1.05, newRate)
      );

      // Add rate point
      const newRatePoint = {
        timestamp: admin.firestore.Timestamp.now(),
        rate: boundedRate,
        volume: Math.random() * 1000000, // Mock volume
      };

      // Update hourly rates
      const updatedHourlyRates = [...(currentData.marketData.hourlyRates || []), newRatePoint]
        .slice(-24);

      // Calculate trend
      const oldRate = updatedHourlyRates[0]?.rate || currentRate;
      const trend = boundedRate > oldRate ? 'up' : boundedRate < oldRate ? 'down' : 'stable';

      // Calculate volatility
      const rates = updatedHourlyRates.map(p => p.rate);
      const avg = rates.reduce((a, b) => a + b, 0) / rates.length;
      const variance = rates.reduce((sum, rate) => sum + Math.pow(rate - avg, 2), 0) / rates.length;
      const volatility = Math.sqrt(variance) / avg * 100;

      await currencyRef.update({
        currentRate: boundedRate,
        'marketData.hourlyRates': updatedHourlyRates,
        'marketData.trend': trend,
        'marketData.volatility': volatility,
        lastUpdated: admin.firestore.Timestamp.now(),
      });

      console.log(`Rate updated: ${currentRate.toFixed(2)} → ${boundedRate.toFixed(2)} (${trend})`);
    } catch (error) {
      console.error('Error in rate fluctuation simulation:', error);
    }
  });
