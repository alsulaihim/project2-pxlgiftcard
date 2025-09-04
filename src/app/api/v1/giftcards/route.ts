import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-config';
import { collection, getDocs, query, where, orderBy, limit as firestoreLimit } from 'firebase/firestore';
import { pxlCurrencyService } from '@/services/pxl-currency-service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const limitParam = searchParams.get('limit');
    const offsetParam = searchParams.get('offset');
    const featured = searchParams.get('featured');

    // Initialize PXL currency service to get real exchange rates
    await pxlCurrencyService.initialize();
    const currencyData = pxlCurrencyService.getCurrentData();
    const currentPXLRate = currencyData?.currentRate || 100; // Fallback to 100
    const tierDiscounts = currencyData?.purchaseDiscounts || {
      starter: 0.00,
      rising: 0.03,
      pro: 0.07,
      pixlbeast: 0.09,
      pixlionaire: 0.13
    };

    let productsQuery = query(collection(db, 'products'), where('status', '==', 'active'));
    
    // Add category filter if specified
    if (category && category !== 'all') {
      productsQuery = query(productsQuery, where('category', '==', category));
    }
    
    // Add featured filter if specified
    if (featured === 'true') {
      productsQuery = query(productsQuery, where('featured', '==', true));
    }
    
    // Add ordering (commented out due to Firebase index requirement)
    // productsQuery = query(productsQuery, orderBy('totalSold', 'desc'));
    
    // Add limit if specified
    const limitValue = limitParam ? parseInt(limitParam, 10) : 50;
    if (limitValue > 0) {
      productsQuery = query(productsQuery, firestoreLimit(limitValue));
    }

    const snapshot = await getDocs(productsQuery);
    
    const giftcards = snapshot.docs.map(doc => {
      const data = doc.data();
      
      // Parse denominations from Firebase format
      const denominationsArray = [];
      if (data.denominations && Array.isArray(data.denominations)) {
        denominationsArray.push(...data.denominations.map(d => d.value).sort((a, b) => a - b));
      }
      
      // Create pricing structure for iOS using real PXL exchange rate
      const pricing = {
        usd: {},
        pxl: {},
        tierDiscounts: tierDiscounts
      };
      
      // Populate pricing for each denomination using real exchange rate
      denominationsArray.forEach(denom => {
        pricing.usd[denom.toString()] = denom;
        pricing.pxl[denom.toString()] = Math.round(denom * currentPXLRate); // Use real exchange rate
      });
      
      return {
        id: doc.id,
        brand: data.brand || data.name || 'Unknown',
        description: data.description || `${data.brand || data.name} Gift Card`,
        category: data.category || 'retail',
        imageUrl: data.artwork_url || data.logo_url || '',
        denominations: denominationsArray,
        pricing: pricing,
        availability: data.status === 'active' ? 'in_stock' : 'out_of_stock'
      };
    });

    return NextResponse.json({
      giftcards: giftcards,
      total: giftcards.length,
      hasMore: false // Simple implementation
    });
    
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch gift cards', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}