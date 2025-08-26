/**
 * React hook for accessing PXL currency data and calculations
 */

import { useEffect, useState, useCallback } from 'react';
import { PXLCurrency } from '@/lib/pxl-currency';
import { pxlCurrencyService } from '@/services/pxl-currency-service';
import { useAuth } from '@/contexts/auth-context';

export function usePXLCurrency() {
  const [currencyData, setCurrencyData] = useState<PXLCurrency | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { platformUser } = useAuth();

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const initializeCurrency = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Initialize the service if not already done
        await pxlCurrencyService.initialize();
        
        // Subscribe to updates
        unsubscribe = pxlCurrencyService.subscribe((data) => {
          setCurrencyData(data);
          setLoading(false);
          setError(null);
        });
        
        // If no data received within 3 seconds, set loading to false
        setTimeout(() => {
          if (loading && !currencyData) {
            setLoading(false);
            // Use default values if no data available
            console.log('Using default PXL currency values');
          }
        }, 3000);
      } catch (err) {
        console.error('Failed to initialize PXL currency:', err);
        setError('Failed to load currency data');
        setLoading(false);
      }
    };

    initializeCurrency();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  // Calculate PXL amount for USD conversion
  const calculatePXLAmount = useCallback((usdAmount: number) => {
    const userTier = platformUser?.tier.current || 'starter';
    return pxlCurrencyService.calculatePXLPurchase(usdAmount, userTier);
  }, [platformUser?.tier.current]);

  // Calculate discounted price for giftcard purchase
  const calculateGiftcardPrice = useCallback((originalPrice: number) => {
    const userTier = platformUser?.tier.current || 'starter';
    return pxlCurrencyService.calculateGiftcardPrice(originalPrice, userTier);
  }, [platformUser?.tier.current]);

  // Process PXL purchase
  const processPXLPurchase = useCallback(async (
    usdAmount: number,
    paymentMethod: string,
    paymentId: string
  ) => {
    if (!platformUser) {
      throw new Error('User not authenticated');
    }

    return pxlCurrencyService.processPXLPurchase(
      platformUser.uid,
      usdAmount,
      platformUser.tier.current,
      paymentMethod,
      paymentId
    );
  }, [platformUser]);

  return {
    // Data
    currencyData,
    currentRate: currencyData?.currentRate || 100,
    trend: currencyData?.marketData.trend || 'stable',
    volatility: currencyData?.marketData.volatility || 0,
    
    // User tier benefits
    userTier: platformUser?.tier.current || 'starter',
    tierBenefits: currencyData?.tierMultipliers[platformUser?.tier.current || 'starter'] || {
      discountPercentage: 0,
      cashbackPercentage: 0,
    },
    purchaseDiscount: currencyData?.purchaseDiscounts?.[platformUser?.tier.current || 'starter'] || 0,
    
    // State
    loading,
    error,
    
    // Functions
    calculatePXLAmount,
    calculateGiftcardPrice,
    processPXLPurchase,
  };
}
