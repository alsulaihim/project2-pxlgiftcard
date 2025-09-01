"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useCart, cartActions } from "@/contexts/cart-context";
import { formatBalance } from "@/lib/validation";
import { db } from "@/lib/firebase-config";
import { collection, query, where, getDocs, orderBy, limit, Timestamp } from "firebase/firestore";

interface ProductDenomination {
  value: number;
  stock: number;
  artworkUrl?: string;
}

interface Product {
  id: string;
  brand: string;
  name: string;
  category: string;
  description: string;
  logo: string;
  logo_url?: string;
  defaultArtworkUrl?: string;
  artwork_url?: string;
  denominations: ProductDenomination[];
  featured: boolean;
  status: 'active' | 'inactive' | 'out_of_stock';
  bgColor: string;
  bg_color?: string;
  createdAt: Timestamp;
}

/**
 * Featured Giftcards section that fetches featured products from Firebase
 * Displays product artwork and links to product details
 */
export function FeaturedGiftcards() {
  const { dispatch } = useCart();
  const [featuredProducts, setFeaturedProducts] = React.useState<Product[]>([]);
  const [loading, setLoading] = React.useState(true);
  
  // Fetch featured products from Firebase
  React.useEffect(() => {
    const fetchFeaturedProducts = async () => {
      try {
        const q = query(
          collection(db, 'products'),
          where('featured', '==', true),
          where('status', '==', 'active'),
          orderBy('createdAt', 'desc'),
          limit(8)
        );
        
        const snapshot = await getDocs(q);
        const products: Product[] = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Product));
        
        setFeaturedProducts(products);
      } catch (error) {
        console.error('Error fetching featured products:', error);
        // Fallback to empty array if there's an error
        setFeaturedProducts([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchFeaturedProducts();
  }, []);
  
  // Add to cart function for featured cards
  const handleAddToCart = (product: Product, denomination: number) => {
    const cartItem = {
      id: `featured-${product.id}-${denomination}`,
      giftcardId: product.id,
      brand: product.brand,
      productName: product.name,
      denomination: denomination,
      pricing: {
        usd: denomination,
        pxl: denomination * 100.85, // Using approximate exchange rate
      },
      tierDiscount: 0,
      cashback: 0,
      imageUrl: product.artwork_url || product.defaultArtworkUrl || product.logo_url || product.logo,
    };
    
    dispatch(cartActions.addItem(cartItem));
    
    // Only auto-open cart on mobile devices
    if (window.innerWidth < 768) {
      dispatch(cartActions.openCart());
    }
  };

  // Get the artwork URL for the product
  const getProductArtwork = (product: Product) => {
    // First try artwork_url (from generated artwork)
    if (product.artwork_url) return product.artwork_url;
    // Then try default artwork
    if (product.defaultArtworkUrl) return product.defaultArtworkUrl;
    // Then try first denomination with artwork
    const denomWithArtwork = product.denominations.find(d => d.artworkUrl);
    if (denomWithArtwork?.artworkUrl) return denomWithArtwork.artworkUrl;
    // Fall back to logo or placeholder
    return product.logo_url || product.logo || null;
  };

  // Get the first available denomination for pricing
  const getFirstDenomination = (product: Product) => {
    const availableDenom = product.denominations.find(d => d.stock > 0);
    return availableDenom || product.denominations[0];
  };

  if (loading) {
    return (
      <section className="py-8 sm:py-10">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold text-white">Featured Products</h2>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-gray-800 rounded-xl h-64"></div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (featuredProducts.length === 0) {
    return (
      <section className="py-8 sm:py-10">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold text-white">Featured Products</h2>
          </div>
          <div className="text-center py-12">
            <p className="text-gray-400">No featured products available at the moment.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-8 sm:py-10">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold text-white">Featured Products</h2>
          <Link href="/marketplace" className="text-sm text-gray-400 hover:text-white transition-colors">
            View all →
          </Link>
        </div>

        {/* Gift Cards Grid */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:gap-6">
          {featuredProducts.map((product) => {
            const artwork = getProductArtwork(product);
            const firstDenom = getFirstDenomination(product);
            const hasStock = product.denominations.some(d => d.stock > 0);
            
            return (
              <div
                key={product.id}
                className="group relative overflow-hidden rounded-xl bg-[#111111] border border-[#262626] transition-all hover:bg-[#1a1a1a] hover:border-[#333333] hover:shadow-xl"
              >
                {/* Product Artwork */}
                {artwork ? (
                  <div className="relative h-40 bg-gray-900 overflow-hidden">
                    <Image
                      src={artwork}
                      alt={`${product.brand} ${product.name}`}
                      fill
                      className="object-cover hover:scale-105 transition-transform duration-300"
                    />
                    {/* Featured Badge */}
                    <div className="absolute top-2 right-2 bg-yellow-500 text-black px-2 py-1 rounded text-xs font-semibold">
                      Featured
                    </div>
                  </div>
                ) : (
                  <div className="relative h-40 bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                    <span className="text-4xl font-bold text-gray-700">{product.brand.charAt(0)}</span>
                    {/* Featured Badge */}
                    <div className="absolute top-2 right-2 bg-yellow-500 text-black px-2 py-1 rounded text-xs font-semibold">
                      Featured
                    </div>
                  </div>
                )}

                {/* Brand Bar */}
                <div className="px-4 py-3 border-b border-[#262626] bg-[#0a0a0a]">
                  <div className="flex items-center gap-2">
                    <div 
                      className="flex h-6 w-6 items-center justify-center rounded text-white font-semibold text-xs"
                      style={{ backgroundColor: product.bg_color || product.bgColor || '#333' }}
                      aria-label={`${product.brand} badge`}
                    >
                      {product.brand.substring(0, 2).toUpperCase()}
                    </div>
                    <span className="text-xs text-gray-400">{product.brand}</span>
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-4">
                  {/* Product Name */}
                  <h3 className="text-sm font-medium text-white mb-3 truncate">
                    {product.name}
                  </h3>

                  {/* Pricing */}
                  {firstDenom && (
                    <div className="space-y-2 mb-4">
                      <div className="inline-flex items-center gap-2">
                        <span className="text-lg font-semibold text-white tracking-[-0.01em]">
                          ${firstDenom.value.toFixed(2)}
                        </span>
                        <span className="inline-flex items-center rounded-md border border-[#333333] px-2 py-0.5 text-[11px] text-gray-300 bg-transparent">
                          PXL {(firstDenom.value * 100.85).toFixed(0)}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Available Denominations */}
                  <div className="flex flex-wrap gap-1 mb-3">
                    {product.denominations.slice(0, 3).map((denom, idx) => (
                      <span key={idx} className="text-xs bg-gray-800 px-1.5 py-0.5 rounded">
                        ${denom.value}
                      </span>
                    ))}
                    {product.denominations.length > 3 && (
                      <span className="text-xs text-gray-500">
                        +{product.denominations.length - 3}
                      </span>
                    )}
                  </div>

                  {/* Stock Status */}
                  <div className="flex items-center">
                    {hasStock ? (
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

                {/* Bottom Action Bar */}
                <div className="p-3 border-t border-[#262626]">
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      className="bg-[#0070f3] text-white hover:bg-[#0059c9]"
                      disabled={!hasStock}
                      onClick={() => firstDenom && handleAddToCart(product, firstDenom.value)}
                      aria-label={hasStock ? `Add ${product.name} to cart` : `Notify me ${product.name}`}
                    >
                      {hasStock ? "Add to Cart" : "Notify Me"}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}