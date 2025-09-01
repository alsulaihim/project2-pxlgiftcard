import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-config';
import { collection, getDocs, limit, query } from 'firebase/firestore';

export async function GET() {
  try {
    const q = query(collection(db, 'products'), limit(10));
    const snapshot = await getDocs(q);
    
    const products = snapshot.docs.map(doc => {
      const data = doc.data();
      
      // Check stock for each denomination
      const stockInfo = data.denominations?.map((denom: any) => {
        const availableCount = denom.serials?.filter(
          (serial: any) => serial.status === 'available'
        ).length || 0;
        
        return {
          value: denom.value,
          totalSerials: denom.serials?.length || 0,
          available: availableCount
        };
      }) || [];
      
      const hasStock = stockInfo.some((d: any) => d.available > 0);
      
      return {
        id: doc.id,
        brand: data.brand,
        name: data.name,
        hasArtwork: !!data.artwork_url,
        artworkUrl: data.artwork_url || null,
        hasStock,
        stockInfo
      };
    });
    
    return NextResponse.json({
      total: products.length,
      withStock: products.filter(p => p.hasStock).length,
      withArtwork: products.filter(p => p.hasArtwork).length,
      products
    });
  } catch (error) {
    return NextResponse.json({ 
      error: 'Failed to check stock',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}