import { NextRequest, NextResponse } from 'next/server';
import { pxlCurrencyService } from '@/services/pxl-currency-service';
import { adminDb, getAuthenticatedUser } from '@/lib/firebase-admin';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get('limit');
    const offsetParam = searchParams.get('offset');
    
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
    
    const limit = limitParam ? parseInt(limitParam, 10) : 20;
    const offset = offsetParam ? parseInt(offsetParam, 10) : 0;
    
    // Initialize PXL currency service
    await pxlCurrencyService.initialize();
    
    // Get user transactions from Firebase using Admin SDK
    if (!adminDb) {
      throw new Error('Firebase Admin not initialized');
    }
    
    const transactionsRef = adminDb.collection('transactions');
    const transactionsQuery = transactionsRef
      .where('userId', '==', userId)
      .orderBy('timestamps.created', 'desc')
      .limit(limit);
    
    const transactionsSnapshot = await transactionsQuery.get();
    const transactions = transactionsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // If no transactions exist, create mock transactions for development
    let formattedTransactions = transactions;
    
    if (transactions.length === 0) {
      // Create mock transaction data
      formattedTransactions = [
        {
          id: 'txn_123',
          type: 'purchase',
          amount: -2500,
          description: 'Amazon $25 Gift Card',
          timestamp: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
          recipient: null,
          appliedDiscount: 0.05,
          bonusPxl: null,
          effectiveRate: null
        },
        {
          id: 'txn_124',
          type: 'transfer_received',
          amount: 500,
          description: 'From @ahmad_k',
          timestamp: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
          recipient: null,
          appliedDiscount: null,
          bonusPxl: null,
          effectiveRate: null
        },
        {
          id: 'txn_125',
          type: 'cashback',
          amount: 125,
          description: 'Purchase cashback',
          timestamp: new Date(Date.now() - 259200000).toISOString(), // 3 days ago
          recipient: null,
          appliedDiscount: null,
          bonusPxl: null,
          effectiveRate: null
        },
        {
          id: 'txn_126',
          type: 'bonus',
          amount: 200,
          description: 'Tier upgrade bonus',
          timestamp: new Date(Date.now() - 432000000).toISOString(), // 5 days ago
          recipient: null,
          appliedDiscount: null,
          bonusPxl: 200,
          effectiveRate: null
        }
      ];
    } else {
      // Format Firebase transactions to match iOS model
      formattedTransactions = transactions.map((tx: any) => {
        // Map Firebase transaction types to iOS expected types
        let mappedType = 'purchase'; // default
        switch (tx.type) {
          case 'pxl-purchase':
            mappedType = 'purchase';
            break;
          case 'giftcard-purchase':
            mappedType = 'purchase';
            break;
          case 'pxl-transfer-received':
          case 'transfer_received':
            mappedType = 'transfer_received';
            break;
          case 'pxl-transfer-sent':
          case 'transfer_sent':
            mappedType = 'transfer_sent';
            break;
          case 'cashback':
            mappedType = 'cashback';
            break;
          case 'bonus':
            mappedType = 'bonus';
            break;
          default:
            mappedType = 'purchase';
        }
        
        return {
          id: tx.id,
          type: mappedType,
          amount: tx.amounts?.pxl || 0,
          description: tx.description || 'PXL Transaction',
          timestamp: tx.timestamps?.created?.toDate?.()?.toISOString() || new Date().toISOString(),
          recipient: tx.recipient || null,
          appliedDiscount: tx.tier?.purchaseDiscountPercentage || null,
          bonusPxl: tx.amounts?.bonusPxl || null,
          effectiveRate: tx.amounts?.effectiveRate || null
        };
      });
    }
    
    const response = {
      transactions: formattedTransactions,
      total: formattedTransactions.length,
      hasMore: false // Simple implementation for now
    };
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Error fetching PXL transactions:', error);
    
    return NextResponse.json(
      {
        error: {
          code: 'TRANSACTIONS_ERROR',
          message: 'Failed to fetch PXL transactions',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      },
      { status: 500 }
    );
  }
}