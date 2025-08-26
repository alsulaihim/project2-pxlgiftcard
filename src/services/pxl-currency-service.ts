/**
 * PXL Currency Service
 * Handles real-time PXL exchange rate updates, Firestore integration,
 * and currency calculations
 */

import { 
  doc, 
  onSnapshot, 
  setDoc, 
  getDoc, 
  updateDoc,
  Timestamp,
  collection,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  getDocs
} from 'firebase/firestore';
import { db } from '@/lib/firebase-config';
import { 
  PXLCurrency, 
  DEFAULT_TIER_BENEFITS, 
  PURCHASE_DISCOUNTS,
  generateMockRateData,
  calculatePXLFromUSD,
  calculateDiscountedPrice,
  TierBenefits
} from '@/lib/pxl-currency';

// Singleton instance
let currencyInstance: PXLCurrencyService | null = null;

export class PXLCurrencyService {
  private currentData: PXLCurrency | null = null;
  private listeners: Set<(data: PXLCurrency) => void> = new Set();
  private unsubscribe: (() => void) | null = null;

  private constructor() {}

  static getInstance(): PXLCurrencyService {
    if (!currencyInstance) {
      currencyInstance = new PXLCurrencyService();
    }
    return currencyInstance;
  }

  /**
   * Initialize the PXL currency system and start listening for updates
   */
  async initialize(): Promise<void> {
    try {
      // Check if currency document exists
      const currencyRef = doc(db, 'pxl-currency', 'main');
      const currencySnap = await getDoc(currencyRef);

      if (!currencySnap.exists()) {
        console.log('PXL currency data not found, initializing...');
        // Initialize with default data
        await this.initializeDefaultCurrency();
      } else {
        console.log('PXL currency data loaded successfully');
      }

      // Start listening for real-time updates
      this.startListening();
    } catch (error) {
      console.error('Failed to initialize PXL currency service:', error);
      // If we can't read, it might be a permissions issue
      // Try to start listening anyway - it might work for real-time updates
      this.startListening();
    }
  }

  /**
   * Initialize default currency data
   */
  private async initializeDefaultCurrency(): Promise<void> {
    const mockData = generateMockRateData(100);
    
    const defaultCurrency: PXLCurrency = {
      id: 'pxl-currency',
      currentRate: mockData.currentRate,
      baseRate: 100,
      marketData: {
        hourlyRates: mockData.hourlyRates,
        dailyRates: mockData.dailyRates,
        trend: mockData.trend,
        volatility: mockData.volatility,
      },
      tierMultipliers: DEFAULT_TIER_BENEFITS,
      purchaseDiscounts: PURCHASE_DISCOUNTS,
      lastUpdated: Timestamp.now(),
    };

    await setDoc(doc(db, 'pxl-currency', 'main'), defaultCurrency);
  }

  /**
   * Start listening for real-time currency updates
   */
  private startListening(): void {
    const currencyRef = doc(db, 'pxl-currency', 'main');
    
    this.unsubscribe = onSnapshot(currencyRef, (snapshot) => {
      if (snapshot.exists()) {
        this.currentData = snapshot.data() as PXLCurrency;
        this.notifyListeners();
      }
    }, (error) => {
      console.error('Error listening to currency updates:', error);
    });
  }

  /**
   * Stop listening for updates
   */
  destroy(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    this.listeners.clear();
    currencyInstance = null;
  }

  /**
   * Subscribe to currency updates
   */
  subscribe(callback: (data: PXLCurrency) => void): () => void {
    this.listeners.add(callback);
    
    // Immediately call with current data if available
    if (this.currentData) {
      callback(this.currentData);
    }
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Notify all listeners of updates
   */
  private notifyListeners(): void {
    if (this.currentData) {
      this.listeners.forEach(callback => callback(this.currentData!));
    }
  }

  /**
   * Get current currency data
   */
  getCurrentData(): PXLCurrency | null {
    return this.currentData;
  }

  /**
   * Get current exchange rate
   */
  getCurrentRate(): number {
    return this.currentData?.currentRate || 100;
  }

  /**
   * Get tier benefits
   */
  getTierBenefits(tier: string): TierBenefits {
    return this.currentData?.tierMultipliers[tier as keyof typeof this.currentData.tierMultipliers] || 
           DEFAULT_TIER_BENEFITS.starter;
  }

  /**
   * Calculate PXL amount for USD conversion with tier discount
   */
  calculatePXLPurchase(usdAmount: number, userTier: string) {
    const currentRate = this.getCurrentRate();
    return calculatePXLFromUSD(usdAmount, currentRate, userTier as any);
  }

  /**
   * Calculate discounted price for giftcard purchase with PXL
   */
  calculateGiftcardPrice(originalPrice: number, userTier: string) {
    const tierBenefits = this.getTierBenefits(userTier);
    return calculateDiscountedPrice(originalPrice, tierBenefits);
  }

  /**
   * Update exchange rate (admin function)
   */
  async updateExchangeRate(newRate: number, reason?: string): Promise<void> {
    const currencyRef = doc(db, 'pxl-currency', 'main');
    
    // Get current data to preserve history
    const currentSnap = await getDoc(currencyRef);
    if (!currentSnap.exists()) {
      throw new Error('Currency data not found');
    }
    
    const currentData = currentSnap.data() as PXLCurrency;
    
    // Add new rate point to hourly data
    const newRatePoint = {
      timestamp: Timestamp.now(),
      rate: newRate,
    };
    
    // Update hourly rates (keep last 24 hours)
    const updatedHourlyRates = [...currentData.marketData.hourlyRates, newRatePoint]
      .slice(-24);
    
    // Calculate new trend
    const oldRate = currentData.currentRate;
    const trend = newRate > oldRate ? 'up' : newRate < oldRate ? 'down' : 'stable';
    
    await updateDoc(currencyRef, {
      currentRate: newRate,
      'marketData.hourlyRates': updatedHourlyRates,
      'marketData.trend': trend,
      lastUpdated: Timestamp.now(),
    });
    
    // Log the rate change
    if (reason) {
      await this.logRateChange(oldRate, newRate, reason);
    }
  }

  /**
   * Log rate change for audit trail
   */
  private async logRateChange(oldRate: number, newRate: number, reason: string): Promise<void> {
    await addDoc(collection(db, 'admin-actions'), {
      type: 'exchange_rate_update',
      oldRate,
      newRate,
      change: newRate - oldRate,
      changePercent: ((newRate - oldRate) / oldRate) * 100,
      reason,
      timestamp: Timestamp.now(),
    });
  }

  /**
   * Process PXL purchase transaction
   */
  async processPXLPurchase(
    userId: string,
    usdAmount: number,
    userTier: string,
    paymentMethod: string,
    paymentId: string
  ): Promise<{
    transactionId: string;
    pxlReceived: number;
    bonusPxl: number;
    effectiveRate: number;
  }> {
    // Calculate PXL amount with tier discount
    const calculation = this.calculatePXLPurchase(usdAmount, userTier);
    
    // Create transaction record
    const transaction = {
      userId,
      type: 'pxl-purchase',
      amounts: {
        usd: usdAmount,
        pxl: calculation.totalPxl,
        exchangeRate: this.getCurrentRate(),
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
        created: Timestamp.now(),
        updated: Timestamp.now(),
        completed: Timestamp.now(),
      },
    };
    
    // Add transaction to Firestore
    const docRef = await addDoc(collection(db, 'transactions'), transaction);
    
    // Update user's PXL balance would happen here
    // This would be done in a Cloud Function for security
    
    return {
      transactionId: docRef.id,
      pxlReceived: calculation.totalPxl,
      bonusPxl: calculation.bonusPxl,
      effectiveRate: calculation.effectiveRate,
    };
  }

  /**
   * Get transaction history for a user
   */
  async getUserTransactions(userId: string, limit: number = 20): Promise<any[]> {
    const q = query(
      collection(db, 'transactions'),
      where('userId', '==', userId),
      orderBy('timestamps.created', 'desc'),
      limit(limit)
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  }
}

// Export singleton instance getter
export const pxlCurrencyService = PXLCurrencyService.getInstance();
