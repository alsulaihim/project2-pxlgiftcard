import { NextRequest, NextResponse } from 'next/server';
import { pxlCurrencyService } from '@/services/pxl-currency-service';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get('period') || '24h';
    
    // Validate period parameter
    const validPeriods = ['1h', '24h', '7d', '30d', '1y'];
    if (!validPeriods.includes(period)) {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_PERIOD',
            message: 'Invalid period parameter',
            details: `Valid periods are: ${validPeriods.join(', ')}`
          }
        },
        { status: 400 }
      );
    }
    
    // Initialize the service if not already done
    await pxlCurrencyService.initialize();
    
    // Get current currency data from Firebase
    const currencyData = pxlCurrencyService.getCurrentData();
    
    if (!currencyData) {
      throw new Error('Currency data not available');
    }

    // Get the appropriate rate data based on period
    let rateData: any[] = [];
    
    switch (period) {
      case '1h':
      case '24h':
        // Use hourly rates for short periods
        rateData = currencyData.marketData.hourlyRates.map((rate: any) => ({
          id: `rate_${rate.timestamp.seconds}`,
          rate: rate.rate,
          timestamp: rate.timestamp.toDate().toISOString(),
          volume: Math.round(Math.random() * 15000 + 5000) // Mock volume for now
        }));
        break;
      case '7d':
      case '30d':
      case '1y':
        // Use daily rates for longer periods, fallback to hourly if not available
        const rates = currencyData.marketData.dailyRates?.length > 0 
          ? currencyData.marketData.dailyRates 
          : currencyData.marketData.hourlyRates;
        
        rateData = rates.map((rate: any) => ({
          id: `rate_${rate.timestamp.seconds}`,
          rate: rate.rate,
          timestamp: rate.timestamp.toDate().toISOString(),
          volume: Math.round(Math.random() * 15000 + 5000) // Mock volume for now
        }));
        break;
    }
    
    // If we don't have enough data, fill with current rate
    if (rateData.length === 0) {
      const now = new Date();
      rateData = [{
        id: `rate_${now.getTime()}`,
        rate: currencyData.currentRate,
        timestamp: now.toISOString(),
        volume: 10000
      }];
    }
    
    // Calculate statistics
    const rateValues = rateData.map(r => r.rate);
    const currentRate = currencyData.currentRate;
    const minRate = Math.min(...rateValues);
    const maxRate = Math.max(...rateValues);
    const averageRate = rateValues.reduce((sum, rate) => sum + rate, 0) / rateValues.length;
    
    const response = {
      rates: rateData,
      period,
      currentRate: Math.round(currentRate * 1000) / 1000,
      minRate: Math.round(minRate * 1000) / 1000,
      maxRate: Math.round(maxRate * 1000) / 1000,
      averageRate: Math.round(averageRate * 1000) / 1000
    };
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Error fetching PXL rate history:', error);
    
    return NextResponse.json(
      {
        error: {
          code: 'RATE_HISTORY_ERROR',
          message: 'Failed to fetch rate history',
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