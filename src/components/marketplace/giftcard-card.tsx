"use client";

import * as React from "react";
import { ShoppingCart, Star, TrendingUp, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCart, cartActions } from "@/contexts/cart-context";
import { formatBalance } from "@/lib/validation";

interface GiftcardData {
  id: string;
  brand: string;
  logo: string;
  category: string;
  denominations: number[];
  selectedDenomination: number;
  usdPrice: number;
  pxlPrice: number;
  tierDiscount: number;
  cashback: number;
  inStock: boolean;
  popularity: number;
  bgColor: string;
  description: string;
}

interface GiftcardCardProps {
  giftcard: GiftcardData;
}

/**
 * Individual giftcard card component
 * Displays dual pricing, tier benefits, and purchase options
 */
export function GiftcardCard({ giftcard }: GiftcardCardProps) {
  const [selectedDenomination, setSelectedDenomination] = React.useState(giftcard.selectedDenomination);
  const { dispatch } = useCart();

  // Calculate prices based on selected denomination
  const basePrice = selectedDenomination;
  const pxlPrice = Math.floor(selectedDenomination * 98); // Slight PXL advantage
  const discountAmount = (basePrice * giftcard.tierDiscount) / 100;
  const finalUSDPrice = basePrice;
  const finalPXLPrice = pxlPrice - Math.floor(pxlPrice * giftcard.tierDiscount / 100);
  const savings = basePrice - (finalPXLPrice / 100);

  // Add to cart function
  const handleAddToCart = () => {
    const cartItem = {
      id: `${giftcard.id}-${selectedDenomination}`,
      giftcardId: giftcard.id,
      brand: giftcard.brand,
      productName: `${giftcard.brand} Gift Card`,
      denomination: selectedDenomination,
      pricing: {
        usd: finalUSDPrice,
        pxl: finalPXLPrice,
      },
      tierDiscount: discountAmount,
      cashback: giftcard.cashback,
      imageUrl: giftcard.logo,
    };
    
    dispatch(cartActions.addItem(cartItem));
    
    // Only auto-open cart on mobile devices
    if (window.innerWidth < 768) {
      dispatch(cartActions.openCart());
    }
  };

  return (
    <div className="group relative overflow-hidden rounded-xl border border-gray-800 bg-gray-950 transition-all hover:border-gray-700 hover:bg-gray-900">
      {/* Card Header */}
      <div className="p-4">
        {/* Brand Logo and Stock Status */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-3">
            {/* Brand Logo */}
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-800 border border-gray-700 text-white font-bold text-lg">
              {giftcard.logo || giftcard.brand.charAt(0)}
            </div>
            
            {/* Brand Info */}
            <div>
              <h3 className="font-semibold text-white text-sm">
                {giftcard.brand}
              </h3>
              <p className="text-xs text-gray-400 capitalize">
                {giftcard.category.replace('-', ' ')}
              </p>
            </div>
          </div>

          {/* Stock Status */}
          <div className="flex items-center space-x-1">
            {giftcard.inStock ? (
              <>
                <div className="h-2 w-2 rounded-full bg-green-500"></div>
                <span className="text-xs text-green-400">In Stock</span>
              </>
            ) : (
              <>
                <div className="h-2 w-2 rounded-full bg-red-500"></div>
                <span className="text-xs text-red-400">Out of Stock</span>
              </>
            )}
          </div>
        </div>

        {/* Description */}
        <div className="mb-4 h-8 flex items-start">
          <p className="text-xs text-gray-400 line-clamp-2 leading-4">
            {giftcard.description}
          </p>
        </div>

        {/* Denomination Selector */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-300 mb-2">
            Amount
          </label>
          <select
            value={selectedDenomination}
            onChange={(e) => setSelectedDenomination(Number(e.target.value))}
            className="w-full rounded-lg border border-gray-700 bg-gray-900 py-2 px-3 pr-10 text-sm text-white focus:border-gray-600 focus:outline-none focus:ring-1 focus:ring-gray-600 appearance-none bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iOCIgdmlld0JveD0iMCAwIDEyIDgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxwYXRoIGQ9Ik0xIDFMNiA2TDExIDEiIHN0cm9rZT0iIzlDQTNBRiIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KPC9zdmc+')] bg-no-repeat bg-[position:calc(100%-16px)_center]"
            aria-label="Select gift card amount"
          >
            {giftcard.denominations.map((amount) => (
              <option key={amount} value={amount}>
                ${amount}
              </option>
            ))}
          </select>
        </div>

        {/* Pricing Section */}
        <div className="mb-4">
          {/* Header with Best Deal Badge */}
          <div className="flex items-center justify-between mb-3 min-h-[20px]">
            <span className="text-xs font-medium text-gray-300">Pricing</span>
            <div className="flex items-center">
              {giftcard.tierDiscount > 5 && (
                <span className="inline-flex items-center rounded-full bg-gray-800 px-2 py-0.5 text-xs text-gray-300 border border-gray-700">
                  <TrendingUp className="mr-1 h-3 w-3" />
                  Best Deal
                </span>
              )}
            </div>
          </div>

          {/* Dual Price Display */}
          <div className="space-y-3">
            {/* USD Pricing */}
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-white">
                  ${finalUSDPrice.toFixed(2)} USD
                </div>
                <div className="text-xs text-gray-400">
                  Standard pricing
                </div>
              </div>
            </div>

            {/* PXL Pricing */}
            <div className="flex items-center justify-between border-t border-gray-800 pt-3">
              <div>
                <div className="flex items-baseline space-x-2">
                  <span className="text-sm font-semibold text-white">
                    PXL {finalPXLPrice.toLocaleString()}
                  </span>
                  {giftcard.tierDiscount > 0 && (
                    <span className="text-xs text-gray-500 line-through">
                      PXL {pxlPrice.toLocaleString()}
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-400">
                  ≈ ${(finalPXLPrice / 100).toFixed(2)} USD
                </div>
              </div>
              {savings > 0 && (
                <div className="text-right">
                  <div className="text-xs font-medium text-white">
                    Save ${savings.toFixed(2)}
                  </div>
                  <div className="text-xs text-gray-400">
                    {((savings / basePrice) * 100).toFixed(1)}% off
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Tier Benefits */}
          {(giftcard.tierDiscount > 0 || giftcard.cashback > 0) && (
            <div className="mt-3 pt-3 border-t border-gray-800 space-y-1">
              {giftcard.tierDiscount > 0 && (
                <div className="flex items-center text-xs text-gray-300">
                  <Star className="mr-1 h-3 w-3" />
                  <span>{giftcard.tierDiscount}% tier discount applied</span>
                </div>
              )}
              {giftcard.cashback > 0 && (
                <div className="flex items-center text-xs text-gray-300">
                  <Zap className="mr-1 h-3 w-3" />
                  <span>{giftcard.cashback}% PXL cashback earned</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Purchase Button */}
        <Button
          className="w-full"
          disabled={!giftcard.inStock}
          size="sm"
          onClick={handleAddToCart}
        >
          <ShoppingCart className="mr-2 h-4 w-4" />
          {giftcard.inStock ? "Add to Cart" : "Out of Stock"}
        </Button>

        {/* Quick Info */}
        <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
          <span>Instant delivery</span>
          <div className="flex items-center space-x-1">
            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
            <span>{(giftcard.popularity / 20).toFixed(1)}</span>
          </div>
        </div>
      </div>

      {/* Hover Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-blue-500/10 to-transparent opacity-0 transition-opacity group-hover:opacity-100 pointer-events-none" />
    </div>
  );
}
