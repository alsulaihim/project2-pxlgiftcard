"use client";

import * as React from "react";
import { GiftcardCard } from "./giftcard-card";

/**
 * Main giftcard grid displaying all available giftcards
 * Includes pagination and responsive layout
 */
export function GiftcardGrid() {
  // Mock giftcard data - in real app this would come from API/database
  const giftcards = [
    {
      id: "amazon-25",
      brand: "Amazon",
      logo: "A",
      category: "retail",
      denominations: [10, 15, 25, 50, 100, 250],
      selectedDenomination: 25,
      usdPrice: 25.00,
      pxlPrice: 2475,
      tierDiscount: 5,
      cashback: 3,
      inStock: true,
      popularity: 95,
      bgColor: "bg-orange-500",
      description: "Shop everything on Amazon with instant digital delivery"
    },
    {
      id: "apple-50",
      brand: "Apple",
      logo: "",
      category: "retail",
      denominations: [10, 25, 50, 100],
      selectedDenomination: 50,
      usdPrice: 50.00,
      pxlPrice: 4900,
      tierDiscount: 8,
      cashback: 3,
      inStock: true,
      popularity: 92,
      bgColor: "bg-gray-800",
      description: "Perfect for App Store, iTunes, and Apple services"
    },
    {
      id: "netflix-15",
      brand: "Netflix",
      logo: "N",
      category: "entertainment",
      denominations: [15, 30, 50],
      selectedDenomination: 15,
      usdPrice: 15.00,
      pxlPrice: 1470,
      tierDiscount: 3,
      cashback: 2,
      inStock: true,
      popularity: 88,
      bgColor: "bg-red-600",
      description: "Stream unlimited movies and TV shows"
    },
    {
      id: "spotify-10",
      brand: "Spotify",
      logo: "♪",
      category: "entertainment",
      denominations: [10, 30, 60],
      selectedDenomination: 10,
      usdPrice: 10.00,
      pxlPrice: 980,
      tierDiscount: 2,
      cashback: 1,
      inStock: true,
      popularity: 85,
      bgColor: "bg-green-500",
      description: "Premium music streaming service"
    },
    {
      id: "google-play-25",
      brand: "Google Play",
      logo: "G",
      category: "gaming",
      denominations: [10, 25, 50, 100],
      selectedDenomination: 25,
      usdPrice: 25.00,
      pxlPrice: 2450,
      tierDiscount: 4,
      cashback: 2,
      inStock: true,
      popularity: 82,
      bgColor: "bg-blue-600",
      description: "Apps, games, movies, and more on Google Play"
    },
    {
      id: "steam-20",
      brand: "Steam",
      logo: "S",
      category: "gaming",
      denominations: [5, 10, 20, 50, 100],
      selectedDenomination: 20,
      usdPrice: 20.00,
      pxlPrice: 1960,
      tierDiscount: 3,
      cashback: 2,
      inStock: true,
      popularity: 90,
      bgColor: "bg-slate-700",
      description: "The ultimate gaming platform"
    },
    {
      id: "starbucks-15",
      brand: "Starbucks",
      logo: "☕",
      category: "dining",
      denominations: [5, 10, 15, 25, 50],
      selectedDenomination: 15,
      usdPrice: 15.00,
      pxlPrice: 1470,
      tierDiscount: 2,
      cashback: 1,
      inStock: true,
      popularity: 78,
      bgColor: "bg-green-700",
      description: "Your favorite coffee and treats"
    },
    {
      id: "target-50",
      brand: "Target",
      logo: "🎯",
      category: "retail",
      denominations: [10, 25, 50, 100],
      selectedDenomination: 50,
      usdPrice: 50.00,
      pxlPrice: 4900,
      tierDiscount: 6,
      cashback: 3,
      inStock: true,
      popularity: 75,
      bgColor: "bg-red-500",
      description: "Everything you need, all in one place"
    },
    {
      id: "uber-25",
      brand: "Uber",
      logo: "U",
      category: "travel",
      denominations: [15, 25, 50, 100],
      selectedDenomination: 25,
      usdPrice: 25.00,
      pxlPrice: 2450,
      tierDiscount: 4,
      cashback: 2,
      inStock: true,
      popularity: 80,
      bgColor: "bg-black",
      description: "Rides and food delivery made easy"
    },
    {
      id: "airbnb-100",
      brand: "Airbnb",
      logo: "🏠",
      category: "travel",
      denominations: [25, 50, 100, 200],
      selectedDenomination: 100,
      usdPrice: 100.00,
      pxlPrice: 9800,
      tierDiscount: 10,
      cashback: 5,
      inStock: true,
      popularity: 85,
      bgColor: "bg-pink-500",
      description: "Unique stays and experiences worldwide"
    },
    {
      id: "xbox-25",
      brand: "Xbox",
      logo: "X",
      category: "gaming",
      denominations: [10, 25, 50, 100],
      selectedDenomination: 25,
      usdPrice: 25.00,
      pxlPrice: 2450,
      tierDiscount: 4,
      cashback: 2,
      inStock: true,
      popularity: 87,
      bgColor: "bg-green-600",
      description: "Games, add-ons, and Xbox Live Gold"
    },
    {
      id: "disney-plus-30",
      brand: "Disney+",
      logo: "D+",
      category: "entertainment",
      denominations: [25, 50, 100],
      selectedDenomination: 30,
      usdPrice: 30.00,
      pxlPrice: 2940,
      tierDiscount: 3,
      cashback: 2,
      inStock: true,
      popularity: 83,
      bgColor: "bg-blue-700",
      description: "Disney, Pixar, Marvel, Star Wars & more"
    }
  ];

  // Sort by popularity (most popular first)
  const sortedGiftcards = [...giftcards].sort((a, b) => b.popularity - a.popularity);

  return (
    <section className="py-8">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Results Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-white">
              All Gift Cards
            </h2>
            <p className="text-sm text-gray-400 mt-1">
              {giftcards.length} cards available
            </p>
          </div>
          
          {/* Sort Options */}
          <div className="flex items-center space-x-4">
            <label className="text-sm text-gray-400">Sort by:</label>
            <select 
              className="rounded-lg border border-gray-700 bg-gray-900 py-1.5 px-3 pr-10 text-sm text-white focus:border-gray-600 focus:outline-none focus:ring-1 focus:ring-gray-600 appearance-none bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iOCIgdmlld0JveD0iMCAwIDEyIDgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxwYXRoIGQ9Ik0xIDFMNiA2TDExIDEiIHN0cm9rZT0iIzlDQTNBRiIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KPC9zdmc+')] bg-no-repeat bg-[position:calc(100%-16px)_center]"
              aria-label="Sort gift cards"
              title="Sort gift cards"
            >
              <option value="popularity">Most Popular</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="discount">Best Discount</option>
              <option value="brand">Brand A-Z</option>
            </select>
          </div>
        </div>

        {/* Giftcard Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {sortedGiftcards.map((giftcard) => (
            <GiftcardCard key={giftcard.id} giftcard={giftcard} />
          ))}
        </div>

        {/* Load More / Pagination */}
        <div className="mt-12 text-center">
          <button className="rounded-lg border border-gray-700 bg-gray-900 px-6 py-3 text-white hover:bg-gray-800 hover:border-gray-600 transition-colors">
            Load More Cards
          </button>
          <p className="text-sm text-gray-400 mt-2">
            Showing 12 of 156 gift cards
          </p>
        </div>
      </div>
    </section>
  );
}
