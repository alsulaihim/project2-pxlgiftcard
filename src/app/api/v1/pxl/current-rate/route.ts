import { NextRequest, NextResponse } from 'next/server';
import { pxlCurrencyService } from '@/services/pxl-currency-service';

export async function GET(request: NextRequest) {
  try {
    // Initialize the service if not already done
    await pxlCurrencyService.initialize();
    
    // Get current currency data from Firebase
    const currencyData = pxlCurrencyService.getCurrentData();
    
    if (!currencyData) {
      throw new Error('Currency data not available');
    }

    // Calculate 24h change from hourly rates
    const hourlyRates = currencyData.marketData.hourlyRates;
    let change24h = 0;
    
    if (hourlyRates.length >= 2) {
      const current = hourlyRates[hourlyRates.length - 1];
      const previous = hourlyRates[Math.max(0, hourlyRates.length - 24)]; // 24 hours ago or oldest available
      change24h = current.rate - previous.rate;
    }
    
    const response = {
      rate: currencyData.currentRate,
      baseRate: currencyData.baseRate,
      lastUpdated: currencyData.lastUpdated.toDate().toISOString(),
      trend: currencyData.marketData.trend,
      change24h: Math.round(change24h * 1000) / 1000,
      purchaseDiscounts: currencyData.purchaseDiscounts
    };
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Error fetching PXL exchange rate:', error);
    
    return NextResponse.json(
      {
        error: {
          code: 'EXCHANGE_RATE_ERROR',
          message: 'Failed to fetch current exchange rate',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      },
      { status: 500 }
    );
  }
}

export async function HEAD(request: NextRequest) {
  return new NextResponse(null, { status: 200 });
}