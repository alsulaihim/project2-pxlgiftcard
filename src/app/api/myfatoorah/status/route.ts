import { NextRequest, NextResponse } from 'next/server';
import { myFatoorahConfig } from '@/lib/payment-config';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sessionId = searchParams.get('sessionId');
    
    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Get payment status from MyFatoorah
    const getPaymentStatusUrl = `${myFatoorahConfig.apiUrl}/v2/GetPaymentStatus`;
    
    const response = await fetch(getPaymentStatusUrl, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${myFatoorahConfig.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        Key: sessionId,
        KeyType: 'InvoiceId',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('MyFatoorah status check error:', errorText);
      throw new Error('Failed to check payment status');
    }

    const statusData = await response.json();
    
    if (statusData.IsSuccess) {
      const invoiceStatus = statusData.Data.InvoiceStatus;
      const invoiceTransactions = statusData.Data.InvoiceTransactions || [];
      
      // Check if payment is successful
      if (invoiceStatus === 'Paid') {
        return NextResponse.json({
          status: 'success',
          paymentId: statusData.Data.InvoiceId,
          transactionId: invoiceTransactions[0]?.TransactionId,
          amount: statusData.Data.InvoiceValue,
          currency: statusData.Data.InvoiceDisplayValue,
        });
      } else if (invoiceStatus === 'Failed' || invoiceStatus === 'Expired') {
        return NextResponse.json({
          status: 'failed',
          error: 'Payment failed or expired',
        });
      } else if (invoiceStatus === 'Pending') {
        return NextResponse.json({
          status: 'pending',
          message: 'Payment is still processing',
        });
      } else {
        return NextResponse.json({
          status: 'cancelled',
          message: 'Payment was cancelled',
        });
      }
    } else {
      throw new Error(statusData.Message || 'Failed to get payment status');
    }
  } catch (error) {
    console.error('MyFatoorah status API error:', error);
    return NextResponse.json(
      { 
        status: 'error',
        error: error instanceof Error ? error.message : 'Failed to check payment status' 
      },
      { status: 500 }
    );
  }
}