import { MarketplaceHeader } from "@/components/marketplace/marketplace-header";
import MarketplaceClient from "./marketplace-client";

/**
 * Marketplace page for browsing and purchasing giftcards
 * 
 * Features:
 * - Smart search with fuzzy matching across brand, category, and description
 * - Real-time filtering and sorting
 * - Category-based organization with dynamic counts
 * - Price range filtering
 * - Multiple sort options (popularity, name, price)
 * - Mobile-first responsive design
 * - Real-time inventory status
 * - Integrated search and filter system
 */
export default function MarketplacePage() {
  return (
    <div className="min-h-screen bg-black">
      {/* Marketplace Header */}
      <MarketplaceHeader />
      
      {/* Integrated Search, Filters, and Products */}
      <MarketplaceClient />
    </div>
  );
}
