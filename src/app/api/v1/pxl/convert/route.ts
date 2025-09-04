import { NextRequest, NextResponse } from 'next/server';
import { pxlCurrencyService } from '@/services/pxl-currency-service';
import { db } from '@/lib/firebase-config';
import { doc, getDoc, updateDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';

export async function POST(request: NextRequest) {
  try {
    const { usdAmount, paymentMethodId } = await request.json();
    
    // For development, we'll use a mock user ID
    // In production, this would come from Firebase Auth token
    const mockUserId = 'mock_user_123';
    
    // Validate input
    if (!usdAmount || usdAmount <= 0) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid USD amount',
            details: 'USD amount must be greater than 0'
          }
        },
        { status: 400 }
      );
    }

    // Initialize PXL currency service
    await pxlCurrencyService.initialize();
    const currencyData = pxlCurrencyService.getCurrentData();
    
    if (!currencyData) {
      return NextResponse.json(
        {
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: 'PXL currency service unavailable'
          }
        },
        { status: 503 }
      );
    }

    // Get user data for tier-based discount calculation
    const userRef = doc(db, 'users', mockUserId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      return NextResponse.json(
        {
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found'
          }
        },
        { status: 404 }
      );
    }

    const userData = userSnap.data();
    const currentPxlBalance = userData.wallets?.pxl?.balance || 0;
    
    // Calculate user tier based on PXL balance
    let currentTier = 'starter';
    if (currentPxlBalance >= 100000) {
      currentTier = 'pixlionaire';
    } else if (currentPxlBalance >= 50000) {
      currentTier = 'pixlbeast';
    } else if (currentPxlBalance >= 20000) {
      currentTier = 'pro';
    } else if (currentPxlBalance >= 5000) {
      currentTier = 'rising';
    }
    
    // Get purchase discount for user's tier
    const purchaseDiscountPercentage = currencyData.purchaseDiscounts?.[currentTier] || 0.0;
    
    // Calculate PXL conversion
    const baseRate = currencyData.currentRate;
    const basePxl = Math.floor(usdAmount * baseRate);
    const bonusPxl = Math.floor(basePxl * purchaseDiscountPercentage);
    const pxlReceived = basePxl + bonusPxl;
    const effectiveRate = pxlReceived / usdAmount;

    // In a real implementation, you would:
    // 1. Process payment with Stripe/PayPal/MyFatoorah using paymentMethodId
    // 2. Only proceed if payment is successful
    // For development, we'll simulate successful payment

    // Update user's PXL balance
    const newPxlBalance = currentPxlBalance + pxlReceived;
    await updateDoc(userRef, {
      'wallets.pxl.balance': newPxlBalance,
      'timestamps.updated': serverTimestamp()
    });

    // Create transaction record
    const transactionData = {
      userId: mockUserId,
      type: 'purchase',
      amounts: {
        usd: usdAmount,
        pxl: pxlReceived,
        basePxl: basePxl,
        bonusPxl: bonusPxl
      },
      exchangeRate: baseRate,
      effectiveRate: effectiveRate,
      purchaseDiscountPercentage: purchaseDiscountPercentage,
      tier: {
        level: currentTier,
        purchaseDiscountPercentage: purchaseDiscountPercentage
      },
      paymentMethod: {
        provider: paymentMethodId?.startsWith('pm_') ? 'stripe' : 'mock',
        paymentMethodId: paymentMethodId || 'mock_payment'
      },
      description: `USD to PXL conversion - $${usdAmount}`,
      status: 'completed',
      timestamps: {
        created: serverTimestamp(),
        completed: serverTimestamp()
      }
    };

    const transactionRef = await addDoc(collection(db, 'transactions'), transactionData);
    
    const response = {
      transactionId: transactionRef.id,
      usdAmount: usdAmount,
      pxlReceived: pxlReceived,
      exchangeRate: baseRate,
      purchaseDiscountPercentage: purchaseDiscountPercentage,
      bonusPxl: bonusPxl,
      effectiveRate: Math.round(effectiveRate * 100) / 100,
      fee: 0,
      timestamp: new Date().toISOString(),
      newBalance: newPxlBalance
    };

    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Error converting USD to PXL:', error);
    
    return NextResponse.json(
      {
        error: {
          code: 'CONVERSION_ERROR',
          message: 'Failed to convert USD to PXL',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      },
      { status: 500 }
    );
  }
}