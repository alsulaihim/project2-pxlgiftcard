/**
 * MyFatoorah Payment Callback Handler
 * Handles successful payment callbacks
 */

import { NextRequest, NextResponse } from 'next/server';
import { myfatoorahService } from '@/lib/myfatoorah-service';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const paymentId = searchParams.get('paymentId');
    const Id = searchParams.get('Id'); // Invoice ID
    
    console.log('MyFatoorah callback received:', { paymentId, Id });
    
    if (!paymentId && !Id) {
      return NextResponse.redirect(new URL('/checkout?error=missing_payment_id', request.url));
    }

    // Get payment status from MyFatoorah
    const paymentStatus = await myfatoorahService.getPaymentStatus(
      paymentId || Id || '',
      paymentId ? 'PaymentId' : 'InvoiceId'
    );

    console.log('Payment status:', paymentStatus);

    if (!paymentStatus) {
      return NextResponse.redirect(new URL('/checkout?error=payment_not_found', request.url));
    }

    // Check if payment was successful
    const isSuccess = paymentStatus.invoiceStatus === 'Paid';
    
    if (isSuccess) {
      // Get the order reference from customerReference
      const orderId = paymentStatus.customerReference;
      
      // For now, we'll create a success URL with the payment details
      // In production, you would create the order in Firestore here
      const successUrl = new URL('/payment-success', request.url);
      successUrl.searchParams.set('invoiceId', paymentStatus.invoiceId);
      successUrl.searchParams.set('amount', paymentStatus.invoiceValue.toString());
      successUrl.searchParams.set('currency', paymentStatus.currency);
      successUrl.searchParams.set('reference', orderId || '');
      successUrl.searchParams.set('status', 'success');
      
      return NextResponse.redirect(successUrl);
    } else {
      // Payment failed or pending
      const status = paymentStatus.invoiceStatus;
      return NextResponse.redirect(
        new URL(`/checkout?error=payment_${status.toLowerCase()}`, request.url)
      );
    }
  } catch (error) {
    console.error('Payment callback error:', error);
    return NextResponse.redirect(
      new URL('/checkout?error=processing_error', request.url)
    );
  }
}

export async function POST(request: NextRequest) {
  // Handle webhook notifications from MyFatoorah
  try {
    const body = await request.json();
    
    // Log webhook for debugging (remove in production)
    console.log('MyFatoorah webhook received:', body);
    
    // Process webhook based on event type
    if (body.Event === 'PaymentStatusChanged') {
      const paymentStatus = await myfatoorahService.getPaymentStatus(
        body.Data.InvoiceId,
        'InvoiceId'
      );
      
      if (paymentStatus) {
        // Update order status based on payment status
        const orderId = paymentStatus.customerReference;
        if (orderId) {
          const orderRef = doc(db, 'orders', orderId);
          await updateDoc(orderRef, {
            status: paymentStatus.invoiceStatus === 'Paid' ? 'completed' : 'failed',
            updatedAt: new Date().toISOString(),
          });
        }
      }
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}