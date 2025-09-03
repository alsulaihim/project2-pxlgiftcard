import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const paymentId = searchParams.get('paymentId');
    const Id = searchParams.get('Id');
    
    // MyFatoorah sends the payment ID as 'paymentId' or 'Id' parameter
    const invoiceId = paymentId || Id;
    
    // Redirect to success page with payment details
    const redirectUrl = new URL('/pxl', request.url);
    redirectUrl.searchParams.set('payment', 'success');
    redirectUrl.searchParams.set('provider', 'myfatoorah');
    if (invoiceId) {
      redirectUrl.searchParams.set('invoiceId', invoiceId);
    }
    
    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error('MyFatoorah callback error:', error);
    
    // Redirect to error page
    const redirectUrl = new URL('/pxl', request.url);
    redirectUrl.searchParams.set('payment', 'error');
    redirectUrl.searchParams.set('provider', 'myfatoorah');
    
    return NextResponse.redirect(redirectUrl);
  }
}

export async function POST(request: NextRequest) {
  // MyFatoorah may also send POST callbacks
  return GET(request);
}