import { NextRequest, NextResponse } from 'next/server';
import { pxlCurrencyService } from '@/services/pxl-currency-service';

export async function POST(request: NextRequest) {
  try {
    // Initialize the PXL currency service with default data
    await pxlCurrencyService.initialize();
    
    // Get the initialized data to confirm it worked
    const currencyData = pxlCurrencyService.getCurrentData();
    
    if (!currencyData) {
      throw new Error('Failed to initialize currency data');
    }
    
    return NextResponse.json({
      message: 'PXL currency system initialized successfully',
      data: {
        currentRate: currencyData.currentRate,
        baseRate: currencyData.baseRate,
        trend: currencyData.marketData.trend,
        hourlyRatesCount: currencyData.marketData.hourlyRates.length,
        dailyRatesCount: currencyData.marketData.dailyRates.length,
        tiers: Object.keys(currencyData.tierMultipliers),
        purchaseDiscounts: currencyData.purchaseDiscounts
      }
    });
    
  } catch (error) {
    console.error('Error initializing PXL currency system:', error);
    
    return NextResponse.json(
      {
        error: {
          code: 'INITIALIZATION_ERROR',
          message: 'Failed to initialize PXL currency system',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Use POST method to initialize the PXL currency system',
    endpoints: {
      initialize: 'POST /api/v1/pxl/initialize',
      currentRate: 'GET /api/v1/pxl/current-rate', 
      rateHistory: 'GET /api/v1/pxl/rate-history'
    }
  });
}