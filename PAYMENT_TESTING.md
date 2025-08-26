# Payment Testing Guide

## Overview
The Giftcard + PXL Platform now includes fully integrated Stripe and PayPal sandbox environments for testing payment flows.

## Payment Methods Available

### 1. PXL Payment
- **Description**: Pay using platform's PXL currency with tier-based discounts
- **Testing**: Uses mock PXL balance (5000 PXL) for testing
- **Benefits**: Automatic tier discounts and cashback applied

### 2. Stripe Credit Card Payment
- **Environment**: Sandbox/Test mode
- **Integration**: Stripe Elements with secure card input
- **Test Cards Available**:
  - **Visa Success**: `4242 4242 4242 4242`
  - **Visa Debit**: `4000 0566 5566 5556`
  - **Mastercard**: `5555 5555 5555 4444`
  - **Amex**: `3782 822463 10005`
  - **Declined Card**: `4000 0000 0000 0002`
  - **Insufficient Funds**: `4000 0000 0000 9995`
  - **Expired Card**: `4000 0000 0000 0069`

**Test Details**:
- Use any future expiry date (e.g., 12/25)
- Use any 3-4 digit CVC (e.g., 123 or 1234)
- Use any ZIP code (e.g., 12345)

### 3. PayPal Payment
- **Environment**: Sandbox mode
- **Integration**: PayPal JavaScript SDK with PayPal buttons
- **Test Account**:
  - **Email**: `sb-buyer@business.example.com`
  - **Password**: `testpassword123`

## How to Test

### Testing Stripe Payments
1. Go to checkout page
2. Select "Credit Card" payment method
3. Enter test card details:
   - Card: `4242 4242 4242 4242`
   - Expiry: Any future date
   - CVC: Any 3 digits
4. Click "Pay $X.XX"
5. Payment should process successfully

### Testing PayPal Payments
1. Go to checkout page
2. Select "PayPal" payment method
3. Click the PayPal button
4. Login with test credentials or create sandbox account
5. Complete payment in PayPal popup
6. Return to platform with successful payment

### Testing PXL Payments
1. Go to checkout page
2. Select "PXL" payment method (default)
3. Click "Pay with PXL" button
4. Payment processes using mock PXL balance
5. Tier benefits automatically applied

## Configuration Files

### Payment Configuration
- **File**: `src/lib/payment-config.ts`
- **Contains**: Sandbox API keys, test card numbers, environment settings

### Stripe Integration
- **File**: `src/components/payments/stripe-payment.tsx`
- **Features**: Stripe Elements, card validation, error handling

### PayPal Integration
- **File**: `src/components/payments/paypal-payment.tsx`
- **Features**: PayPal buttons, sandbox environment, order creation

## Environment Variables

Create a `.env.local` file with:

```bash
# Stripe Test Keys (Replace with your test keys from Stripe Dashboard)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_PUBLISHABLE_KEY
STRIPE_SECRET_KEY=sk_test_YOUR_SECRET_KEY

# PayPal Sandbox Keys
NEXT_PUBLIC_PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_CLIENT_SECRET=your_paypal_client_secret

# Environment
NODE_ENV=development
```

## Security Notes

- All payments are in **TEST/SANDBOX** mode
- No real money is processed
- Test cards will not charge actual accounts
- PayPal sandbox accounts are isolated from production
- All API keys are for testing purposes only

## Troubleshooting

### Stripe Issues
- Ensure test card numbers are entered correctly
- Check browser console for detailed error messages
- Verify Stripe Elements are loading properly

### PayPal Issues
- Ensure popup blockers are disabled
- Use sandbox test accounts only
- Check PayPal developer console for logs

### General Issues
- Clear browser cache and cookies
- Check network connectivity
- Verify all dependencies are installed
- Check browser console for JavaScript errors

## Next Steps

1. **Test all payment flows** with different scenarios
2. **Add real API keys** when ready for production
3. **Implement webhook handling** for payment confirmations
4. **Add order management** system for completed payments
5. **Integrate with backend** for real transaction processing

---

**Note**: This is a development/testing environment. All transactions are simulated and no real payments are processed.
