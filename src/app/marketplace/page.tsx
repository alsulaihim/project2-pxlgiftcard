// BUG FIX: 2025-01-27 - Remove duplicate Navigation component
// Problem: Navigation component rendered twice (in ClientLayout and here)
// Solution: Remove Navigation from individual pages since it's in ClientLayout
// Impact: Fixes double navbar issue

import { MarketplaceHeader } from "@/components/marketplace/marketplace-header";
import { SearchAndFilters } from "@/components/marketplace/search-and-filters";
// import { GiftcardGrid } from "@/components/marketplace/giftcard-grid";
import { GiftcardGridSimple as GiftcardGrid } from "@/components/marketplace/giftcard-grid-simple"; // Temporary for debugging

/**
 * Marketplace page for browsing and purchasing giftcards
 * 
 * Features:
 * - Comprehensive giftcard catalog with major brands
 * - Dual-currency pricing (USD/PXL) with tier-based discounts
 * - Advanced search and filtering capabilities
 * - Category-based organization
 * - Mobile-first responsive design
 * - Real-time inventory status
 * - Tier-based savings indicators
 */
export default function MarketplacePage() {
  return (
    <div className="min-h-screen bg-black">
      {/* Main Content */}
      <main id="main-content" className="flex-1">
        {/* Marketplace Header */}
        <MarketplaceHeader />

        {/* Search and Filters */}
        <SearchAndFilters />

        {/* Giftcard Grid */}
        <GiftcardGrid />
      </main>
    </div>
  );
}
