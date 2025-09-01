"use client";

import * as React from "react";
import { GiftcardCard } from "./giftcard-card";
import { db } from '@/lib/firebase-config';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { useState, useEffect } from 'react';

/**
 * Main giftcard grid displaying all available giftcards
 * Includes pagination and responsive layout
 */
interface Product {
  id: string;
  brand: string;
  name: string;
  category: string;
  denominations: Array<{
    value: number;
    stock: number;
    serials: Array<{ status: string; }>;
  }>;
  defaultArtworkUrl?: string;
  artwork_url?: string;
  logo_url?: string;
  status: string;
  featured?: boolean;
  description?: string;
  totalSold?: number;
  createdAt: any;
}

export function GiftcardGrid() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('featured');

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      
      // Query only active products
      const productsQuery = query(
        collection(db, 'products'),
        where('status', '==', 'active')
      );
      
      const snapshot = await getDocs(productsQuery);
      console.log(`Found ${snapshot.size} active products`);
      
      const fetchedProducts: Product[] = [];
      
      snapshot.forEach((doc) => {
        const data = doc.data() as Product;
        console.log(`Checking product: ${data.brand} - ${data.name}`);
        console.log('Product data:', {
          brand: data.brand,
          artwork_url: data.artwork_url,
          hasArtwork: !!data.artwork_url
        });
        
        // Check if denominations exist and have serials
        if (!data.denominations || data.denominations.length === 0) {
          console.log(`  - No denominations found`);
          return;
        }
        
        // Only include products that have at least one denomination with stock
        const hasStock = data.denominations?.some(denom => {
          // Check if serials array exists
          if (!denom.serials || !Array.isArray(denom.serials)) {
            console.log(`  - Denomination $${denom.value} has no serials array`);
            return false;
          }
          
          // Check if there are available serials
          const availableCount = denom.serials.filter(
            (serial: any) => serial.status === 'available'
          ).length;
          
          console.log(`  - Denomination $${denom.value}: ${availableCount} available out of ${denom.serials.length} total`);
          return availableCount > 0;
        });
        
        if (hasStock) {
          console.log(`  ✓ Product has stock, adding to list`);
          fetchedProducts.push({
            id: doc.id,
            ...data
          });
        } else {
          console.log(`  ✗ Product has no available stock`);
        }
      });
      
      console.log(`Total products with stock: ${fetchedProducts.length}`);
      
      // Sort products
      const sortedProducts = sortProducts(fetchedProducts, sortBy);
      setProducts(sortedProducts);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const sortProducts = (products: Product[], sortType: string) => {
    const sorted = [...products];
    
    switch (sortType) {
      case 'featured':
        return sorted.sort((a, b) => {
          if (a.featured && !b.featured) return -1;
          if (!a.featured && b.featured) return 1;
          return (b.totalSold || 0) - (a.totalSold || 0);
        });
      case 'popular':
        return sorted.sort((a, b) => (b.totalSold || 0) - (a.totalSold || 0));
      case 'newest':
        return sorted.sort((a, b) => {
          const aTime = a.createdAt?.toMillis() || 0;
          const bTime = b.createdAt?.toMillis() || 0;
          return bTime - aTime;
        });
      case 'brand':
        return sorted.sort((a, b) => a.brand.localeCompare(b.brand));
      case 'price-low':
        return sorted.sort((a, b) => {
          const aMin = Math.min(...a.denominations.map(d => d.value));
          const bMin = Math.min(...b.denominations.map(d => d.value));
          return aMin - bMin;
        });
      case 'price-high':
        return sorted.sort((a, b) => {
          const aMax = Math.max(...a.denominations.map(d => d.value));
          const bMax = Math.max(...b.denominations.map(d => d.value));
          return bMax - aMax;
        });
      default:
        return sorted;
    }
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSortBy = e.target.value;
    setSortBy(newSortBy);
    const sortedProducts = sortProducts(products, newSortBy);
    setProducts(sortedProducts);
  };

  // Convert products to giftcard format for the card component
  const giftcards = products.map(product => {
    // Get available denominations with stock
    const availableDenoms = product.denominations
      .filter(denom => {
        const availableCount = denom.serials?.filter(
          (serial: any) => serial.status === 'available'
        ).length || 0;
        return availableCount > 0;
      })
      .map(d => d.value)
      .sort((a, b) => a - b);
    
    const minDenom = availableDenoms[0] || 25;
    
    // Generate a consistent color based on brand
    const brandColors: { [key: string]: string } = {
      'Amazon': 'bg-orange-500',
      'Apple': 'bg-gray-800',
      'Netflix': 'bg-red-600',
      'Spotify': 'bg-green-500',
      'Google': 'bg-blue-600',
      'Steam': 'bg-slate-700',
      'Starbucks': 'bg-green-700',
      'Target': 'bg-red-500',
      'Uber': 'bg-black',
      'Airbnb': 'bg-pink-500',
      'Xbox': 'bg-green-600',
      'Disney': 'bg-blue-700',
      'PlayStation': 'bg-blue-800',
      'Nintendo': 'bg-red-500'
    };
    
    const bgColor = brandColors[product.brand] || 'bg-gray-700';
    const logo = product.brand.charAt(0).toUpperCase();
    
    const artworkUrl = product.artwork_url || product.defaultArtworkUrl;
    
    // Debug: Log the mapping
    if (product.brand === 'Target' || product.brand === 'Amazon') {
      console.log(`Mapping ${product.brand}:`, {
        input_artwork_url: product.artwork_url,
        output_artworkUrl: artworkUrl,
        will_pass: !!artworkUrl
      });
    }
    
    return {
      id: product.id,
      brand: product.brand,
      logo: product.logo_url || logo,
      category: product.category || 'retail',
      denominations: availableDenoms,
      selectedDenomination: minDenom,
      usdPrice: minDenom,
      pxlPrice: Math.floor(minDenom * 98), // 2% discount for PXL
      tierDiscount: product.featured ? 5 : 2,
      cashback: product.featured ? 3 : 1,
      inStock: true,
      popularity: product.totalSold || 0,
      bgColor: bgColor,
      description: product.description || `Get ${product.brand} gift cards with instant delivery`,
      artworkUrl: artworkUrl
    };
  });

  if (loading) {
    return (
      <section className="py-8">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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

  if (products.length === 0) {
    return (
      <section className="py-8">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold text-white mb-2">
              No Products Available
            </h2>
            <p className="text-gray-400">
              Please check back later for available gift cards.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-8">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Results Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-white">
              Available Gift Cards
            </h2>
            <p className="text-sm text-gray-400 mt-1">
              {giftcards.length} cards in stock
            </p>
          </div>
          
          {/* Sort Options */}
          <div className="flex items-center space-x-4">
            <label className="text-sm text-gray-400">Sort by:</label>
            <select 
              value={sortBy}
              onChange={handleSortChange}
              className="rounded-lg border border-gray-700 bg-gray-900 py-1.5 px-3 pr-10 text-sm text-white focus:border-gray-600 focus:outline-none focus:ring-1 focus:ring-gray-600 appearance-none bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iOCIgdmlld0JveD0iMCAwIDEyIDgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxwYXRoIGQ9Ik0xIDFMNiA2TDExIDEiIHN0cm9rZT0iIzlDQTNBRiIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KPC9zdmc+')] bg-no-repeat bg-[position:calc(100%-16px)_center]"
              aria-label="Sort gift cards"
              title="Sort gift cards"
            >
              <option value="featured">Featured</option>
              <option value="popular">Most Popular</option>
              <option value="newest">Newest</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="brand">Brand A-Z</option>
            </select>
          </div>
        </div>

        {/* Giftcard Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {giftcards.map((giftcard) => (
            <GiftcardCard key={giftcard.id} giftcard={giftcard} />
          ))}
        </div>

        {/* Refresh Button */}
        <div className="mt-12 text-center">
          <button 
            onClick={fetchProducts}
            className="rounded-lg border border-gray-700 bg-gray-900 px-6 py-3 text-white hover:bg-gray-800 hover:border-gray-600 transition-colors"
          >
            Refresh Products
          </button>
          <p className="text-sm text-gray-400 mt-2">
            Showing {giftcards.length} available gift cards
          </p>
        </div>
      </div>
    </section>
  );
}
