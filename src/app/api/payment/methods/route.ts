/**
 * MyFatoorah Payment Methods API
 * Returns available payment methods for a given amount
 */

import { NextRequest, NextResponse } from 'next/server';
import { myfatoorahService } from '@/lib/myfatoorah-service';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const amount = searchParams.get('amount');
    const currency = searchParams.get('currency') || 'USD';

    if (!amount) {
      return NextResponse.json(
        { error: 'Amount is required' },
        { status: 400 }
      );
    }

    const paymentMethods = await myfatoorahService.getPaymentMethods(
      parseFloat(amount),
      currency
    );

    // Format the payment methods for frontend use
    const formattedMethods = paymentMethods.map((method: any) => ({
      id: method.PaymentMethodId,
      name: method.PaymentMethodEn,
      nameAr: method.PaymentMethodAr,
      code: method.PaymentMethodCode,
      isDirectPayment: method.IsDirectPayment,
      serviceCharge: method.ServiceCharge,
      totalAmount: method.TotalAmount,
      currencyIso: method.CurrencyIso,
      imageUrl: method.ImageUrl,
      isRecommended: method.IsRecommended,
      paymentType: method.PaymentType,
    }));

    return NextResponse.json({
      success: true,
      methods: formattedMethods,
      count: formattedMethods.length,
    });
  } catch (error) {
    console.error('Error fetching payment methods:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payment methods' },
      { status: 500 }
    );
  }
}