// BUG FIX: 2025-01-27 - Remove duplicate Navigation component from homepage
// Problem: Navigation component rendered twice (once in ClientLayout, once here)
// Solution: Remove Navigation import and component since it's already in ClientLayout
// Impact: Single navigation header now displays correctly on homepage

import { HeroSection } from "@/components/landing/hero-section";
import { PXLRateChart } from "@/components/dashboard/pxl-rate-chart";
import { FeaturedGiftcards } from "@/components/landing/featured-giftcards";

/**
 * Landing page for the GiftCard + PXL Platform
 * Matches the screenshot layout exactly
 */
export default function HomePage() {
  return (
    <div className="min-h-screen bg-black">
      {/* Main Content */}
      <main id="main-content" className="flex-1">
        {/* Hero Section */}
        <HeroSection />

        {/* PXL Exchange Rate Chart */}
        <section className="py-1 sm:py-2">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <PXLRateChart />
          </div>
        </section>

        {/* Featured Products */}
        <FeaturedGiftcards />
      </main>
    </div>
  );
}
