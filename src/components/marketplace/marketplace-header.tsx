"use client";

import * as React from "react";
import { TrendingUp, Shield, Zap } from "lucide-react";

/**
 * Marketplace header with value proposition and key benefits
 * Follows Vercel design patterns with compact layout
 */
export function MarketplaceHeader() {
  return (
    <section className="py-8 sm:py-12">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          {/* Main heading */}
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Gift Card Marketplace
          </h1>
          
          {/* Subtitle */}
          <p className="mt-4 text-lg leading-7 text-gray-400 max-w-2xl mx-auto">
            Shop premium gift cards from top brands. Pay with USD or PXL for exclusive savings.
            Instant digital delivery guaranteed.
          </p>

          {/* Key Benefits */}
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-6">
            <div className="flex items-center justify-center space-x-2 text-sm text-gray-300">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span>Up to 13% PXL Savings</span>
            </div>
            <div className="flex items-center justify-center space-x-2 text-sm text-gray-300">
              <Zap className="h-4 w-4 text-blue-500" />
              <span>Instant Delivery</span>
            </div>
            <div className="flex items-center justify-center space-x-2 text-sm text-gray-300">
              <Shield className="h-4 w-4 text-purple-500" />
              <span>Secure & Verified</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
