import { NextRequest, NextResponse } from 'next/server';
import { myFatoorahConfig } from '@/lib/payment-config';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { amount, currency, description, customerName, customerEmail } = body;

    // MyFatoorah InitiatePayment API
    const initiatePaymentUrl = `${myFatoorahConfig.apiUrl}/v2/InitiatePayment`;
    
    const initiateResponse = await fetch(initiatePaymentUrl, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${myFatoorahConfig.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        InvoiceAmount: amount,
        CurrencyIso: currency || myFatoorahConfig.currency,
      }),
    });

    if (!initiateResponse.ok) {
      const errorText = await initiateResponse.text();
      console.error('MyFatoorah initiate payment error:', errorText);
      throw new Error('Failed to initiate payment');
    }

    const paymentMethods = await initiateResponse.json();
    
    // Execute payment with the first available method (or specific method if needed)
    const executePaymentUrl = `${myFatoorahConfig.apiUrl}/v2/ExecutePayment`;
    
    const invoiceValue = parseFloat(amount);
    const paymentMethodId = paymentMethods.Data?.PaymentMethods?.[0]?.PaymentMethodId || 2; // Default to Visa/Master
    
    const executeResponse = await fetch(executePaymentUrl, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${myFatoorahConfig.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        PaymentMethodId: paymentMethodId,
        CustomerName: customerName || 'Customer',
        DisplayCurrencyIso: currency || myFatoorahConfig.currency,
        MobileCountryCode: '+965', // Kuwait country code
        CustomerMobile: '12345678',
        CustomerEmail: customerEmail || 'customer@example.com',
        InvoiceValue: invoiceValue,
        CallBackUrl: myFatoorahConfig.callbackUrl,
        ErrorUrl: myFatoorahConfig.errorUrl,
        Language: 'en',
        CustomerReference: `PXL_${Date.now()}`,
        CustomerAddress: {
          Block: '',
          Street: '',
          HouseBuildingNo: '',
          Address: 'Kuwait',
          AddressInstructions: '',
        },
        InvoiceItems: [
          {
            ItemName: description || 'PXL Currency Purchase',
            Quantity: 1,
            UnitPrice: invoiceValue,
          },
        ],
      }),
    });

    if (!executeResponse.ok) {
      const errorText = await executeResponse.text();
      console.error('MyFatoorah execute payment error:', errorText);
      throw new Error('Failed to execute payment');
    }

    const paymentData = await executeResponse.json();
    
    if (paymentData.IsSuccess) {
      return NextResponse.json({
        success: true,
        paymentUrl: paymentData.Data.PaymentURL,
        sessionId: paymentData.Data.InvoiceId,
        invoiceId: paymentData.Data.InvoiceId,
      });
    } else {
      throw new Error(paymentData.Message || 'Payment initiation failed');
    }
  } catch (error) {
    console.error('MyFatoorah API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Payment initiation failed' 
      },
      { status: 500 }
    );
  }
}