import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-config';
import { collection, getDocs, limit, query } from 'firebase/firestore';

export async function GET() {
  try {
    const q = query(collection(db, 'products'), limit(5));
    const snapshot = await getDocs(q);
    
    const products = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        brand: data.brand,
        name: data.name,
        artwork_url: data.artwork_url || null,
        logo_url: data.logo_url || null,
        defaultArtworkUrl: data.defaultArtworkUrl || null,
        featured: data.featured || false
      };
    });
    
    return NextResponse.json({
      total: products.length,
      products,
      message: 'Debug info for first 5 products'
    });
  } catch (error) {
    return NextResponse.json({ 
      error: 'Failed to fetch products',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}