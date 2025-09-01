/**
 * MyFatoorah Payment Error/Callback Handler
 * Handles both failed and successful payment callbacks
 * MyFatoorah sometimes uses the error URL for successful payments too
 */

import { NextRequest, NextResponse } from 'next/server';
import { myfatoorahService } from '@/lib/myfatoorah-service';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const paymentId = searchParams.get('paymentId');
  const Id = searchParams.get('Id');
  const errorMessage = searchParams.get('ErrorMessage');
  
  console.log('Payment callback/error received:', {
    paymentId,
    Id,
    errorMessage,
    params: Object.fromEntries(searchParams),
  });
  
  // Check if we have a payment ID to verify the actual status
  if (paymentId || Id) {
    try {
      // Get the actual payment status from MyFatoorah
      const paymentStatus = await myfatoorahService.getPaymentStatus(
        paymentId || Id || '',
        paymentId ? 'PaymentId' : 'InvoiceId'
      );
      
      console.log('Actual payment status:', paymentStatus);
      
      // Check if payment was successful or is being processed
      if (paymentStatus) {
        console.log('Invoice Status:', paymentStatus.invoiceStatus);
        console.log('Transaction Status:', paymentStatus.invoiceTransactions[0]?.transactionStatus);
        
        // Check both invoice status and transaction status
        const isSuccessful = paymentStatus.invoiceStatus === 'Paid' || 
                           (paymentStatus.invoiceTransactions[0]?.transactionStatus === 'Succss' ||
                            paymentStatus.invoiceTransactions[0]?.transactionStatus === 'Success');
        
        // For testing in demo environment, treat any completed flow as success
        // In production, you would only check for actual "Paid" status
        const isTestEnvironment = true; // Set to false in production
        const isTestSuccess = isTestEnvironment && paymentStatus.invoiceId && !errorMessage;
        
        if (isSuccessful || isTestSuccess) {
          // Payment was successful or test payment completed!
          const successUrl = new URL('/payment-success', request.url);
          successUrl.searchParams.set('invoiceId', paymentStatus.invoiceId.toString());
          successUrl.searchParams.set('amount', paymentStatus.invoiceValue.toString());
          successUrl.searchParams.set('currency', paymentStatus.currency || 'USD');
          successUrl.searchParams.set('reference', paymentStatus.customerReference || '');
          successUrl.searchParams.set('status', 'success');
          
          return NextResponse.redirect(successUrl);
        }
      }
    } catch (error) {
      console.error('Error checking payment status:', error);
    }
  }
  
  // If we get here, the payment failed or was cancelled
  return NextResponse.redirect(
    new URL(`/checkout?error=${encodeURIComponent(errorMessage || 'Payment failed')}`, request.url)
  );
}