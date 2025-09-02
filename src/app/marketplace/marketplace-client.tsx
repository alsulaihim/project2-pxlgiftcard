"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Search, Filter, X, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GiftcardCard } from "@/components/marketplace/giftcard-card";
import { db } from '@/lib/firebase-config';
import { collection, query, where, getDocs } from 'firebase/firestore';

interface Product {
  id: string;
  brand: string;
  name: string;
  category: string;
  denominations: Array<{
    value: number;
    stock: number;
  }>;
  artwork_url?: string;
  status: string;
  featured?: boolean;
  description?: string;
  totalSold?: number;
}

export default function MarketplaceClient() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedPriceRange, setSelectedPriceRange] = useState("all");
  const [sortBy, setSortBy] = useState("popular");
  const [showFilters, setShowFilters] = useState(false);

  // Fetch products
  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const productsQuery = query(
        collection(db, 'products'),
        where('status', '==', 'active')
      );
      
      const snapshot = await getDocs(productsQuery);
      const fetchedProducts: Product[] = [];
      
      snapshot.forEach((doc) => {
        const data = doc.data() as Product;
        fetchedProducts.push({
          ...data,
          id: doc.id
        });
      });
      
      setProducts(fetchedProducts);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get unique categories from products
  const categories = useMemo(() => {
    const cats = new Set(products.map(p => p.category));
    const categoryList = [
      { id: "all", label: "All Categories", count: products.length },
      ...Array.from(cats).map(cat => ({
        id: cat.toLowerCase().replace(/\s+/g, '-'),
        label: cat,
        count: products.filter(p => p.category === cat).length
      }))
    ];
    return categoryList;
  }, [products]);

  const priceRanges = [
    { id: "all", label: "All Prices" },
    { id: "10-25", label: "$10 - $25" },
    { id: "25-50", label: "$25 - $50" },
    { id: "50-100", label: "$50 - $100" },
    { id: "100-200", label: "$100 - $200" },
    { id: "200+", label: "$200+" },
  ];

  const sortOptions = [
    { id: "popular", label: "Most Popular" },
    { id: "name-asc", label: "Name (A-Z)" },
    { id: "name-desc", label: "Name (Z-A)" },
    { id: "price-low", label: "Price: Low to High" },
    { id: "price-high", label: "Price: High to Low" },
  ];

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    let filtered = [...products];

    // Search filter - search in brand, name, and category
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(product => 
        product.brand.toLowerCase().includes(query) ||
        product.name.toLowerCase().includes(query) ||
        product.category.toLowerCase().includes(query) ||
        product.description?.toLowerCase().includes(query)
      );
    }

    // Category filter
    if (selectedCategory !== "all") {
      filtered = filtered.filter(product => 
        product.category.toLowerCase().replace(/\s+/g, '-') === selectedCategory
      );
    }

    // Price range filter
    if (selectedPriceRange !== "all") {
      filtered = filtered.filter(product => {
        const minDenom = Math.min(...(product.denominations?.map(d => d.value) || [25]));
        const maxDenom = Math.max(...(product.denominations?.map(d => d.value) || [25]));
        
        switch(selectedPriceRange) {
          case "10-25":
            return minDenom >= 10 && minDenom <= 25;
          case "25-50":
            return minDenom >= 25 && minDenom <= 50;
          case "50-100":
            return minDenom >= 50 && minDenom <= 100;
          case "100-200":
            return minDenom >= 100 && minDenom <= 200;
          case "200+":
            return maxDenom >= 200;
          default:
            return true;
        }
      });
    }

    // Sorting
    filtered.sort((a, b) => {
      switch(sortBy) {
        case "name-asc":
          return a.brand.localeCompare(b.brand);
        case "name-desc":
          return b.brand.localeCompare(a.brand);
        case "price-low":
          const aMin = Math.min(...(a.denominations?.map(d => d.value) || [25]));
          const bMin = Math.min(...(b.denominations?.map(d => d.value) || [25]));
          return aMin - bMin;
        case "price-high":
          const aMax = Math.max(...(a.denominations?.map(d => d.value) || [25]));
          const bMax = Math.max(...(b.denominations?.map(d => d.value) || [25]));
          return bMax - aMax;
        case "popular":
        default:
          return (b.totalSold || 0) - (a.totalSold || 0);
      }
    });

    return filtered;
  }, [products, searchQuery, selectedCategory, selectedPriceRange, sortBy]);

  // Convert products to giftcard format
  const giftcards = filteredProducts.map(product => {
    const denomValues = product.denominations?.map(d => d.value) || [25];
    const minDenom = Math.min(...denomValues);
    
    const brandColors: { [key: string]: string } = {
      'Amazon': 'bg-orange-500',
      'Apple': 'bg-gray-800',
      'Netflix': 'bg-red-600',
      'Spotify': 'bg-green-500',
      'Steam': 'bg-slate-700',
      'Starbucks': 'bg-green-700',
    };
    
    const bgColor = brandColors[product.brand] || 'bg-gray-700';
    
    return {
      id: product.id,
      brand: product.brand,
      logo: product.brand.charAt(0).toUpperCase(),
      category: product.category || 'retail',
      denominations: denomValues,
      selectedDenomination: minDenom,
      usdPrice: minDenom,
      pxlPrice: Math.floor(minDenom * 98),
      tierDiscount: product.featured ? 5 : 2,
      cashback: product.featured ? 3 : 1,
      inStock: true,
      popularity: product.totalSold || 0,
      bgColor: bgColor,
      description: product.description || `Get ${product.brand} gift cards with instant delivery`,
      artworkUrl: product.artwork_url || ''
    };
  });

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedCategory("all");
    setSelectedPriceRange("all");
    setSortBy("popular");
  };

  const hasActiveFilters = searchQuery || selectedCategory !== "all" || selectedPriceRange !== "all";

  if (loading) {
    return (
      <div className="min-h-screen bg-black">
        <div className="mx-auto max-w-7xl px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-12 bg-gray-800 rounded-lg mb-6"></div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-gray-800 rounded-xl h-64"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <main className="flex-1">
        {/* Search and Filters Section */}
        <section className="py-6">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            {/* Search Bar with Sort */}
            <div className="flex flex-col lg:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search gift cards by brand, category, or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-gray-700 bg-gray-900 py-3 pl-10 pr-4 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              
              {/* Sort Dropdown */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="rounded-lg border border-gray-700 bg-gray-900 py-3 px-4 text-white focus:border-gray-600 focus:outline-none focus:ring-1 focus:ring-gray-600"
              >
                {sortOptions.map(option => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter Toggle (Mobile) */}
            <div className="flex items-center justify-between mb-4 lg:hidden">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center space-x-2"
              >
                <SlidersHorizontal className="h-4 w-4" />
                <span>Filters</span>
                {hasActiveFilters && (
                  <span className="ml-1 px-1.5 py-0.5 text-xs bg-blue-600 rounded-full">
                    {[searchQuery ? 1 : 0, selectedCategory !== "all" ? 1 : 0, selectedPriceRange !== "all" ? 1 : 0].reduce((a, b) => a + b, 0)}
                  </span>
                )}
              </Button>
              
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="text-gray-400 hover:text-white"
                >
                  Clear All
                </Button>
              )}
            </div>

            {/* Filters */}
            <div className={`space-y-4 lg:space-y-0 lg:flex lg:items-center lg:space-x-8 ${showFilters ? 'block' : 'hidden lg:flex'}`}>
              {/* Categories */}
              <div className="flex-1">
                <div className="flex flex-wrap gap-2">
                  {categories.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all border ${
                        selectedCategory === category.id
                          ? "bg-white text-black border-white"
                          : "bg-gray-900 text-gray-300 border-gray-700 hover:bg-gray-800 hover:border-gray-600 hover:text-white"
                      }`}
                    >
                      {category.label}
                      <span className="ml-1.5 text-xs opacity-60">({category.count})</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Price Range */}
              <div className="lg:w-48">
                <select
                  value={selectedPriceRange}
                  onChange={(e) => setSelectedPriceRange(e.target.value)}
                  className="w-full rounded-lg border border-gray-700 bg-gray-900 py-2 px-3 text-white focus:border-gray-600 focus:outline-none focus:ring-1 focus:ring-gray-600"
                >
                  {priceRanges.map((range) => (
                    <option key={range.id} value={range.id}>
                      {range.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Clear Filters (Desktop) */}
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="hidden lg:flex text-gray-400 hover:text-white"
                >
                  Clear All
                </Button>
              )}
            </div>

            {/* Results Summary */}
            <div className="mt-6 flex items-center justify-between">
              <p className="text-sm text-gray-400">
                Showing {giftcards.length} of {products.length} products
                {searchQuery && ` for "${searchQuery}"`}
              </p>
            </div>
          </div>
        </section>

        {/* Products Grid */}
        <section className="py-8">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            {giftcards.length === 0 ? (
              <div className="text-center py-12">
                <h2 className="text-xl font-semibold text-white mb-2">
                  No products found
                </h2>
                <p className="text-gray-400 mb-4">
                  Try adjusting your search or filters
                </p>
                <Button
                  onClick={clearFilters}
                  variant="secondary"
                  size="sm"
                >
                  Clear Filters
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {giftcards.map((giftcard) => (
                  <GiftcardCard key={giftcard.id} giftcard={giftcard} />
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}