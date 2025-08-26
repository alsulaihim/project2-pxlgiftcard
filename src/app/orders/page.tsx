// BUG FIX: 2025-01-27 - Remove duplicate Navigation component
// Problem: Navigation component rendered twice (in ClientLayout and here)
// Solution: Remove Navigation from individual pages since it's in ClientLayout
// Impact: Fixes double navbar issue

/**
 * Orders Page - Shows user's order history and status
 */

import { OrderHistory } from "@/components/ecommerce/order-history";

export default function OrdersPage() {
  return (
    <div className="min-h-screen bg-black">
      <main className="flex-1 py-8 md:py-12">
        <div className="container mx-auto px-4 md:px-6 lg:px-8 max-w-6xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Your Orders</h1>
            <p className="text-gray-400">
              Track your giftcard purchases and download your digital cards
            </p>
          </div>
          
          <OrderHistory />
        </div>
      </main>
    </div>
  );
}
