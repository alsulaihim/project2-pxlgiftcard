/**
 * PXL calculation utilities for Cloud Functions
 */

// Tier thresholds in PXL
export const TIER_THRESHOLDS = {
  starter: 0,
  rising: 1000,
  pro: 5000,
  pixlbeast: 10000,
  pixlionaire: 50000,
} as const;

// Purchase discounts by tier (bonus PXL on USD->PXL conversion)
export const PURCHASE_DISCOUNTS = {
  starter: 0.00,
  rising: 0.03,
  pro: 0.07,
  pixlbeast: 0.09,
  pixlionaire: 0.13,
} as const;

export interface PXLPurchaseCalculation {
  basePxl: number;
  bonusPxl: number;
  totalPxl: number;
  appliedDiscount: number;
  effectiveRate: number;
}

/**
 * Calculate PXL amount from USD with tier-based purchase discount
 */
export function calculatePXLFromUSD(
  usdAmount: number,
  exchangeRate: number,
  userTier: keyof typeof PURCHASE_DISCOUNTS
): PXLPurchaseCalculation {
  // Calculate base PXL amount
  const basePxl = Math.floor(usdAmount * exchangeRate);
  
  // Get tier discount
  const discountRate = PURCHASE_DISCOUNTS[userTier] || 0;
  
  // Calculate bonus PXL
  const bonusPxl = Math.floor(basePxl * discountRate);
  
  // Total PXL
  const totalPxl = basePxl + bonusPxl;
  
  // Effective rate
  const effectiveRate = totalPxl / usdAmount;
  
  return {
    basePxl,
    bonusPxl,
    totalPxl,
    appliedDiscount: discountRate,
    effectiveRate,
  };
}
