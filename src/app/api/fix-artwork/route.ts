import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-config';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';

export async function GET() {
  try {
    const snapshot = await getDocs(collection(db, 'products'));
    
    let fixed = 0;
    let alreadyHasArtwork = 0;
    const updates = [];
    
    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      
      if (!data.artwork_url) {
        // Generate a placeholder artwork URL based on brand
        const placeholderUrl = `https://via.placeholder.com/600x400/6366f1/ffffff?text=${encodeURIComponent(data.brand)}`;
        
        updates.push({
          id: docSnap.id,
          brand: data.brand,
          action: 'needs_artwork',
          placeholderUrl
        });
        
        // Uncomment to actually update the products with placeholder artwork
        // await updateDoc(doc(db, 'products', docSnap.id), {
        //   artwork_url: placeholderUrl
        // });
        
        fixed++;
      } else {
        alreadyHasArtwork++;
        updates.push({
          id: docSnap.id,
          brand: data.brand,
          action: 'has_artwork',
          artworkUrl: data.artwork_url
        });
      }
    }
    
    return NextResponse.json({
      total: snapshot.size,
      alreadyHasArtwork,
      needsArtwork: fixed,
      products: updates
    });
  } catch (error) {
    return NextResponse.json({ 
      error: 'Failed to check artwork',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}