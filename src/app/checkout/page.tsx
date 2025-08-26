/**
 * Checkout Page with Dual Payment Methods
 * Supports both USD (Stripe/PayPal) and PXL payments
 */

import CheckoutForm from "@/components/ecommerce/checkout-form";

export default function CheckoutPage() {
  return (
    <main className="flex-1 py-8 md:py-12">
      <div className="container mx-auto px-4 md:px-6 lg:px-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Checkout</h1>
          <p className="text-gray-400">
            Complete your purchase with USD or PXL currency
          </p>
        </div>
        
        <CheckoutForm />
      </div>
    </main>
  );
}
