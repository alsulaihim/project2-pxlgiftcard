"use client";

import * as React from "react";
import { GiftcardCard } from "./giftcard-card";
import { db } from '@/lib/firebase-config';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useState, useEffect } from 'react';

interface Product {
  id: string;
  brand: string;
  name: string;
  category: string;
  denominations: Array<{
    value: number;
    stock: number;
    serials?: Array<{ status: string; }>;
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

/**
 * Simplified giftcard grid that shows all active products
 * regardless of stock status (for testing)
 */
export function GiftcardGridSimple() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      
      // Get ALL products first for debugging
      const allProductsSnapshot = await getDocs(collection(db, 'products'));
      console.log(`Total products in database: ${allProductsSnapshot.size}`);
      
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
        fetchedProducts.push({
          id: doc.id,
          ...data
        });
        console.log(`Added product: ${data.brand} - ${data.name} (Status: ${data.status})`);
      });
      
      setProducts(fetchedProducts);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  // Convert products to giftcard format for the card component
  const giftcards = products.map(product => {
    // Get first available denomination or default to 25
    const denomValues = product.denominations?.map(d => d.value) || [25];
    const minDenom = Math.min(...denomValues);
    
    // Generate a consistent color based on brand
    const brandColors: { [key: string]: string } = {
      'Amazon': 'bg-orange-500',
      'Apple': 'bg-gray-800',
      'Netflix': 'bg-red-600',
      'Spotify': 'bg-green-500',
      'Google': 'bg-blue-600',
      'Steam': 'bg-slate-700',
      'Starbucks': 'bg-green-700',
      'Target': 'bg-red-500'
    };
    
    const bgColor = brandColors[product.brand] || 'bg-gray-700';
    const logo = product.brand.charAt(0).toUpperCase();
    
    return {
      id: product.id,
      brand: product.brand,
      logo: logo,
      category: product.category || 'retail',
      denominations: denomValues,
      selectedDenomination: minDenom,
      usdPrice: minDenom,
      pxlPrice: Math.floor(minDenom * 98),
      tierDiscount: product.featured ? 5 : 2,
      cashback: product.featured ? 3 : 1,
      inStock: true, // Show as in stock for testing
      popularity: product.totalSold || 0,
      bgColor: bgColor,
      description: product.description || `Get ${product.brand} gift cards with instant delivery`,
      artworkUrl: product.artwork_url || product.defaultArtworkUrl || ''
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
              No Active Products Found
            </h2>
            <p className="text-gray-400 mb-4">
              Please ensure products are marked as "active" in the admin panel.
            </p>
            <p className="text-sm text-gray-500">
              Check the browser console for debugging information.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-8">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-white">
              All Active Products (Test Mode)
            </h2>
            <p className="text-sm text-gray-400 mt-1">
              {giftcards.length} products shown (stock check disabled)
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {giftcards.map((giftcard) => (
            <GiftcardCard key={giftcard.id} giftcard={giftcard} />
          ))}
        </div>
      </div>
    </section>
  );
}