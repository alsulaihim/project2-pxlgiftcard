"use client";

import * as React from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useCart, cartActions } from "@/contexts/cart-context";
import { formatBalance } from "@/lib/validation";

/**
 * Featured Giftcards section with 2 rows of 4 cards each
 * Matches Vercel's clean card design patterns
 */
export function FeaturedGiftcards() {
  const { dispatch } = useCart();
  
  // Add to cart function for featured cards
  const handleAddToCart = (card: any) => {
    const cartItem = {
      id: `featured-${card.id}`,
      giftcardId: card.id.toString(),
      brand: card.brand,
      productName: card.productName,
      denomination: card.usdPrice,
      pricing: {
        usd: card.usdPrice,
        pxl: card.pxlPrice,
      },
      tierDiscount: 0, // Featured cards might have different discount logic
      cashback: 0,
      imageUrl: card.logo,
    };
    
    dispatch(cartActions.addItem(cartItem));
    
    // Only auto-open cart on mobile devices
    if (window.innerWidth < 768) {
      dispatch(cartActions.openCart());
    }
  };

  const featuredCards = [
    {
      id: 1,
      brand: "Amazon",
      productName: "Amazon",
      logo: "A",
      usdPrice: 9.00,
      pxlPrice: 907.49,
      inStock: true,
      bgColor: "bg-orange-500"
    },
    {
      id: 2,
      brand: "Amazon",
      productName: "Amazon Gift Card 001",
      logo: "A",
      usdPrice: 23.03,
      pxlPrice: 2322.16,
      inStock: true,
      bgColor: "bg-orange-500"
    },
    {
      id: 3,
      brand: "Amazon",
      productName: "Amazon Gift Card 006",
      logo: "A",
      usdPrice: 8.99,
      pxlPrice: 906.48,
      inStock: true,
      bgColor: "bg-orange-500"
    },
    {
      id: 4,
      brand: "Amazon",
      productName: "Amazon Gift Card 008",
      logo: "A",
      usdPrice: 9.34,
      pxlPrice: 941.77,
      inStock: true,
      bgColor: "bg-orange-500"
    },
    {
      id: 5,
      brand: "Amazon",
      productName: "Amazon Gift Card 009",
      logo: "A",
      usdPrice: 14.66,
      pxlPrice: 1478.20,
      inStock: true,
      bgColor: "bg-orange-500"
    },
    {
      id: 6,
      brand: "Amazon",
      productName: "Amazon Gift Card 012",
      logo: "A",
      usdPrice: 8.92,
      pxlPrice: 899.42,
      inStock: true,
      bgColor: "bg-orange-500"
    },
    {
      id: 7,
      brand: "Amazon",
      productName: "Amazon Gift Card 016",
      logo: "A",
      usdPrice: 14.21,
      pxlPrice: 1432.82,
      inStock: true,
      bgColor: "bg-orange-500"
    },
    {
      id: 8,
      brand: "Amazon",
      productName: "Amazon Gift Card 020",
      logo: "A",
      usdPrice: 13.61,
      pxlPrice: 1372.32,
      inStock: true,
      bgColor: "bg-orange-500"
    }
  ];

  return (
    <section className="py-8 sm:py-10">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold text-white">Featured Products</h2>
          <button className="text-sm text-gray-400 hover:text-white transition-colors">View all →</button>
        </div>

        {/* Gift Cards Grid - 2 rows of 4 (maintain size) */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:gap-6">
          {featuredCards.map((card) => (
            <div
              key={card.id}
              className="group relative overflow-hidden rounded-xl bg-[#111111] border border-[#262626] transition-colors hover:bg-[#1a1a1a] hover:border-[#333333]"
            >
              {/* Brand Bar */}
              <div className="px-4 py-3 border-b border-[#262626] bg-[#0a0a0a]">
                <div className="flex items-center gap-2">
                  <div className={`flex h-6 w-6 items-center justify-center rounded ${card.bgColor} text-white font-semibold text-sm`} aria-label={`${card.brand} badge`}>
                    {card.logo}
                  </div>
                  <span className="text-xs text-gray-400">{card.brand}</span>
                </div>
              </div>

              {/* Card Content */}
              <div className="p-4">
                {/* Product Name */}
                <h3 className="text-sm font-medium text-white mb-3 truncate">
                  {card.productName}
                </h3>

                {/* Pricing */}
                <div className="space-y-2 mb-4">
                  <div className="inline-flex items-center gap-2">
                    <span className="text-lg font-semibold text-white tracking-[-0.01em]">${card.usdPrice.toFixed(2)}</span>
                    <span className="inline-flex items-center rounded-md border border-[#333333] px-2 py-0.5 text-[11px] text-gray-300 bg-transparent">PXL {card.pxlPrice.toFixed(0)}</span>
                  </div>
                </div>

                {/* Stock Status */}
                <div className="flex items-center">
                  {card.inStock ? (
                    <div className="flex items-center text-xs text-green-400">
                      <div className="mr-2 h-2 w-2 rounded-full bg-green-500"></div>
                      In Stock
                    </div>
                  ) : (
                    <div className="flex items-center text-xs text-gray-500">
                      <div className="mr-2 h-2 w-2 rounded-full bg-gray-500"></div>
                      Out of Stock
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Action Bar (visible on hover / always on mobile) */}
              <div className="absolute inset-x-0 bottom-0 p-3 translate-y-6 opacity-0 transition-all group-hover:translate-y-0 group-hover:opacity-100 sm:opacity-100 sm:translate-y-0">
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    className="bg-[#0070f3] text-white hover:bg-[#0059c9]"
                    disabled={!card.inStock}
                    onClick={() => handleAddToCart(card)}
                    aria-label={card.inStock ? `Add ${card.productName} to cart` : `Notify me ${card.productName}`}
                  >
                    {card.inStock ? "Add to Cart" : "Notify Me"}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
