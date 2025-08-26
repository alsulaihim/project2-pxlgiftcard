// BUG FIX: 2025-01-27 - Remove duplicate Navigation component
// Problem: Navigation component rendered twice (in ClientLayout and here)
// Solution: Remove Navigation from individual pages since it's in ClientLayout
// Impact: Fixes double navbar issue

import { PXLWalletOverview } from "@/components/pxl/pxl-wallet-overview";
import { TierProgressSection } from "@/components/pxl/tier-progress-section";
import { PXLPurchaseSection } from "@/components/pxl/pxl-purchase-section";
import { PXLTransferSection } from "@/components/pxl/pxl-transfer-section";
import { TransactionHistory } from "@/components/pxl/transaction-history";

/**
 * PXL Wallet page for managing PXL currency, tier progression, and transfers.
 * Features wallet overview, tier benefits, PXL purchase, and transaction history.
 */
export default function PXLPage() {
  return (
    <div className="min-h-screen bg-black">
      <main className="flex-1">
        <div className="container mx-auto px-4 py-4 md:px-6 lg:px-8">
          <div className="space-y-4">
            {/* Page Header */}
            <div className="text-center">
              <h1 className="text-2xl font-bold text-white sm:text-3xl">
                PXL Wallet
              </h1>
              <p className="mt-1 text-gray-400">
                Manage your PXL currency, track tier progression, and transfer to other users
              </p>
            </div>

            {/* Wallet Overview */}
            <PXLWalletOverview />

            {/* Tier Progress */}
            <TierProgressSection />

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {/* PXL Purchase */}
              <PXLPurchaseSection />

              {/* PXL Transfer */}
              <PXLTransferSection />
            </div>

            {/* Transaction History */}
            <TransactionHistory />
          </div>
        </div>
      </main>
    </div>
  );
}
