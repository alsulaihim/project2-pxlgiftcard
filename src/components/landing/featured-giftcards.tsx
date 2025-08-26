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
          <h2 className="text-2xl font-bold text-white">
            Featured Products
          </h2>
          <button className="text-sm text-gray-400 hover:text-white flex items-center">
            View all →
          </button>
        </div>

        {/* Gift Cards Grid - 2 rows of 4 */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:gap-6">
          {featuredCards.map((card) => (
            <div
              key={card.id}
              className="group relative overflow-hidden rounded-lg bg-gray-900 border border-gray-800 transition-all hover:border-gray-700"
            >
              {/* Brand Logo Header */}
              <div className="bg-gray-800 px-4 py-3 border-b border-gray-700">
                <div className="flex items-center space-x-2">
                  <div className={`flex h-6 w-6 items-center justify-center rounded ${card.bgColor} text-white font-bold text-sm`}>
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
                <div className="space-y-1 mb-3">
                  <div className="text-lg font-bold text-white">
                    ${card.usdPrice.toFixed(2)}
                  </div>
                  <div className="text-sm text-gray-400">
                    PXL {card.pxlPrice.toFixed(2)}
                  </div>
                </div>

                {/* Stock Status */}
                <div className="flex items-center">
                  {card.inStock ? (
                    <div className="flex items-center text-xs text-success">
                      <div className="mr-1 h-2 w-2 rounded-full bg-success"></div>
                      In Stock
                    </div>
                  ) : (
                    <div className="flex items-center text-xs text-gray-500">
                      <div className="mr-1 h-2 w-2 rounded-full bg-gray-500"></div>
                      Out of Stock
                    </div>
                  )}
                </div>
              </div>

              {/* Hover overlay */}
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
                <Button 
                  size="sm" 
                  className="bg-white text-black hover:bg-gray-200"
                  disabled={!card.inStock}
                  onClick={() => handleAddToCart(card)}
                >
                  {card.inStock ? "Add to Cart" : "Notify Me"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
