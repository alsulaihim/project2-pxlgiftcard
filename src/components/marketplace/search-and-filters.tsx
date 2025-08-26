"use client";

import * as React from "react";
import { Search, Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Search and filter interface for the marketplace
 * Includes search bar, category filters, and price range
 */
export function SearchAndFilters() {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedCategory, setSelectedCategory] = React.useState("all");
  const [selectedPriceRange, setSelectedPriceRange] = React.useState("all");
  const [showFilters, setShowFilters] = React.useState(false);

  const categories = [
    { id: "all", label: "All Categories", count: 156 },
    { id: "retail", label: "Retail", count: 45 },
    { id: "dining", label: "Food & Dining", count: 32 },
    { id: "entertainment", label: "Entertainment", count: 28 },
    { id: "travel", label: "Travel", count: 21 },
    { id: "gaming", label: "Gaming", count: 18 },
    { id: "streaming", label: "Streaming", count: 12 },
  ];

  const priceRanges = [
    { id: "all", label: "All Prices" },
    { id: "10-25", label: "$10 - $25" },
    { id: "25-50", label: "$25 - $50" },
    { id: "50-100", label: "$50 - $100" },
    { id: "100+", label: "$100+" },
  ];

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedCategory("all");
    setSelectedPriceRange("all");
  };

  const hasActiveFilters = searchQuery || selectedCategory !== "all" || selectedPriceRange !== "all";

  return (
    <section className="py-6">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Search Bar */}
        <div className="relative mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search gift cards by brand or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-900 py-3 pl-10 pr-4 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                title="Clear search"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Filter Toggle (Mobile) */}
        <div className="flex items-center justify-between mb-4 lg:hidden">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-2"
          >
            <Filter className="h-4 w-4" />
            <span>Filters</span>
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
            <label className="block text-sm font-medium text-gray-300 mb-3 lg:hidden">
              Category
            </label>
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
            <label className="block text-sm font-medium text-gray-300 mb-2 lg:hidden">
              Price Range
            </label>
            <select
              value={selectedPriceRange}
              onChange={(e) => setSelectedPriceRange(e.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-900 py-2 px-3 pr-10 text-white focus:border-gray-600 focus:outline-none focus:ring-1 focus:ring-gray-600 appearance-none bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iOCIgdmlld0JveD0iMCAwIDEyIDgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxwYXRoIGQ9Ik0xIDFMNiA2TDExIDEiIHN0cm9rZT0iIzlDQTNBRiIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KPC9zdmc+')] bg-no-repeat bg-[position:calc(100%-16px)_center]"
              aria-label="Select price range"
              title="Select price range"
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

        {/* Active Filters Summary */}
        {hasActiveFilters && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-sm text-gray-400">Active filters:</span>
            {searchQuery && (
              <span className="inline-flex items-center rounded-lg bg-gray-800 border border-gray-700 px-2 py-1 text-xs text-gray-300">
                Search: "{searchQuery}"
                <button
                  onClick={() => setSearchQuery("")}
                  className="ml-1 hover:text-white"
                  title="Remove search filter"
                  aria-label="Remove search filter"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {selectedCategory !== "all" && (
              <span className="inline-flex items-center rounded-lg bg-gray-800 border border-gray-700 px-2 py-1 text-xs text-gray-300">
                {categories.find(c => c.id === selectedCategory)?.label}
                <button
                  onClick={() => setSelectedCategory("all")}
                  className="ml-1 hover:text-white"
                  title="Remove category filter"
                  aria-label="Remove category filter"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {selectedPriceRange !== "all" && (
              <span className="inline-flex items-center rounded-lg bg-gray-800 border border-gray-700 px-2 py-1 text-xs text-gray-300">
                {priceRanges.find(r => r.id === selectedPriceRange)?.label}
                <button
                  onClick={() => setSelectedPriceRange("all")}
                  className="ml-1 hover:text-white"
                  title="Remove price range filter"
                  aria-label="Remove price range filter"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
