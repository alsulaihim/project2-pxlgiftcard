/**
 * MyFatoorah Payment Initiation API
 * Creates a payment session and returns payment URL
 */

import { NextRequest, NextResponse } from 'next/server';
import { myfatoorahService } from '@/lib/myfatoorah-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      orderId,
      amount,
      customerName,
      customerEmail,
      customerMobile,
      items,
      paymentMethodId, // Optional: specific payment method
      showAllPaymentMethods = true, // Default: show all available payment methods
    } = body;

    if (!amount || !customerName || !customerEmail) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // For testing, we'll use a simple reference ID without Firestore
    // In production, you'd create the order after successful payment
    let orderReference = orderId || `ORDER-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Execute payment with MyFatoorah
    const paymentResponse = await myfatoorahService.executePayment({
      invoiceValue: amount,
      customerName,
      customerEmail,
      customerMobile,
      customerReference: orderReference,
      paymentMethodId: showAllPaymentMethods ? undefined : paymentMethodId, // Pass method ID only if not showing all
      items: items?.map((item: any) => ({
        itemName: item.name || item.productName || 'Gift Card',
        quantity: item.quantity || 1,
        unitPrice: item.price || item.denomination || amount,
      })),
    });

    if (paymentResponse.isSuccess && paymentResponse.data) {
      // Return payment URL without updating Firestore for now
      // Order will be created after successful payment callback
      return NextResponse.json({
        success: true,
        paymentUrl: paymentResponse.data.invoiceURL,
        invoiceId: paymentResponse.data.invoiceId,
        orderId: orderReference,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: paymentResponse.message,
          details: paymentResponse.error,
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Payment initiation error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate payment' },
      { status: 500 }
    );
  }
}