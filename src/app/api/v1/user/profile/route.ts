import { NextRequest, NextResponse } from 'next/server';
import { adminDb, getAuthenticatedUser } from '@/lib/firebase-admin';
import { pxlCurrencyService } from '@/services/pxl-currency-service';

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user from Firebase token
    const authenticatedUser = await getAuthenticatedUser(request);
    if (!authenticatedUser) {
      return NextResponse.json(
        {
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
            details: 'Missing or invalid Firebase token'
          }
        },
        { status: 401 }
      );
    }
    
    const userId = authenticatedUser.uid;
    
    // Get user document from Firebase using Admin SDK
    const userRef = adminDb.collection('users').doc(userId);
    const userSnap = await userRef.get();
    
    let userData;
    
    if (!userSnap.exists) {
      // Create default user data using Firebase Auth info if it doesn't exist
      const displayName = authenticatedUser.displayName || 'User';
      const nameParts = displayName.split(' ');
      const firstName = nameParts[0] || 'User';
      const lastName = nameParts.slice(1).join(' ') || '';
      
      userData = {
        uid: userId,
        email: authenticatedUser.email || 'user@example.com',
        username: `@${firstName.toLowerCase()}${lastName.toLowerCase()}`.replace(/\s/g, ''),
        profile: {
          firstName: firstName,
          lastName: lastName,
          phone: authenticatedUser.phoneNumber || null,
          country: 'AE',
          region: 'Dubai',
          gender: null,
          avatarUrl: authenticatedUser.photoURL || null,
          kycStatus: authenticatedUser.emailVerified ? 'verified' : 'pending'
        },
        wallets: {
          pxl: {
            balance: 15420,
            lockedBalance: 100
          },
          usd: {
            balance: 0.0
          }
        },
        timestamps: {
          created: new Date().toISOString(),
          updated: new Date().toISOString()
        }
      };
    } else {
      // User document exists, use the real data from Firestore
      userData = { uid: userId, ...userSnap.data() };
    }
    
    // Get PXL currency data for tier calculations
    await pxlCurrencyService.initialize();
    const currencyData = pxlCurrencyService.getCurrentData();
    
    // Calculate user tier based on PXL balance
    const pxlBalance = (userData as any).wallets?.pxl?.balance || 0;
    let currentTier = 'starter';
    let nextTierThreshold = 5000;
    
    if (pxlBalance >= 100000) {
      currentTier = 'pixlionaire';
      nextTierThreshold = null; // Max tier
    } else if (pxlBalance >= 50000) {
      currentTier = 'pixlbeast';
      nextTierThreshold = 100000;
    } else if (pxlBalance >= 20000) {
      currentTier = 'pro';
      nextTierThreshold = 50000;
    } else if (pxlBalance >= 5000) {
      currentTier = 'rising';
      nextTierThreshold = 20000;
    }
    
    // Get tier benefits from currency data
    const tierBenefits = currencyData?.tierMultipliers?.[currentTier as keyof typeof currencyData.tierMultipliers] || {
      discountPercentage: 0.0,
      cashbackPercentage: 0.0
    };
    
    const purchaseDiscountPercentage = currencyData?.purchaseDiscounts?.[currentTier as keyof typeof currencyData.purchaseDiscounts] || 0.0;
    
    // Format response according to iOS model structure
    const response = {
      uid: userData.uid,
      email: (userData as any).email,
      username: (userData as any).username,
      profile: (userData as any).profile,
      tier: {
        current: currentTier,
        pxlBalance: pxlBalance,
        nextTierThreshold: nextTierThreshold,
        benefits: {
          discountPercentage: tierBenefits.discountPercentage,
          cashbackPercentage: tierBenefits.cashbackPercentage,
          pxlPurchaseDiscountPercentage: purchaseDiscountPercentage
        }
      },
      wallets: (userData as any).wallets
    };
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Error fetching user profile:', error);
    
    return NextResponse.json(
      {
        error: {
          code: 'USER_PROFILE_ERROR',
          message: 'Failed to fetch user profile',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      },
      { status: 500 }
    );
  }
}