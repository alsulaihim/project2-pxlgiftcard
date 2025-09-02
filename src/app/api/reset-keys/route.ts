import { NextResponse } from 'next/server';
import { auth } from '@/lib/firebase-config';
import { db } from '@/lib/firebase-config';
import { doc, deleteDoc } from 'firebase/firestore';

export async function POST(request: Request) {
  try {
    const { userId } = await request.json();
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }
    
    // Delete the user's keys from Firestore to force regeneration
    await deleteDoc(doc(db, 'userKeys', userId));
    
    return NextResponse.json({ 
      success: true, 
      message: 'Keys deleted from Firestore. User should clear browser data and refresh.' 
    });
  } catch (error) {
    console.error('Error resetting keys:', error);
    return NextResponse.json({ error: 'Failed to reset keys' }, { status: 500 });
  }
}