"use client";

import * as React from "react";
import { ArrowRight, TrendingUp, Shield, Zap, Wallet, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { formatPXL } from "@/lib/pxl-currency";

/**
 * Hero section matching Vercel's landing page design
 * Clean, minimal, focused on the main value proposition
 */
export function HeroSection() {
  const { user, platformUser, loading } = useAuth();
  const router = useRouter();
  
  const handleGetStarted = () => {
    router.push('/auth/signup');
  };
  
  const handleExploreMarketplace = () => {
    router.push('/marketplace');
  };
  
  const handleBuyPXL = () => {
    router.push('/pxl');
  };
  
  const handleViewDashboard = () => {
    router.push('/dashboard');
  };

  return (
    <section className="relative">
      {/* Vercel-style background pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#262626_1px,transparent_1px),linear-gradient(to_bottom,#262626_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)]" />
      
      <div className="relative">
        <div className="mx-auto max-w-7xl px-6 py-8 sm:py-10 lg:px-8 lg:py-12">
          <div className="mx-auto max-w-4xl text-center">
            {/* Vercel-style badge */}
            <div className="mb-4 inline-flex items-center rounded-full border border-gray-800 bg-gray-950 px-4 py-1.5 text-sm">
              <TrendingUp className="mr-2 h-4 w-4 text-success" />
              <span className="text-gray-400">
                PXL Currency • Up to 13% Savings + 3% Cashback
              </span>
            </div>

            {/* Main heading - Vercel style */}
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-6xl">
              Premium Gift Cards
            </h1>

            {/* Subtitle - Vercel style */}
            <p className="mt-3 text-lg leading-7 text-gray-400 max-w-2xl mx-auto">
              Shop top brands. Pay in USD or PXL. Instant delivery.
              Unlock tier-based savings and join a community of smart shoppers.
            </p>

            {/* CTA Buttons - Different for logged in users */}
            <div className="mt-6 flex items-center justify-center gap-x-6">
              {loading ? (
                // Loading state
                <div className="animate-pulse">
                  <div className="h-12 w-40 bg-gray-800 rounded-lg"></div>
                </div>
              ) : user ? (
                // Logged in user CTAs
                <>
                  <Button 
                    size="lg" 
                    className="bg-white text-black hover:bg-gray-200"
                    onClick={handleExploreMarketplace}
                  >
                    <ShoppingBag className="mr-2 h-4 w-4" />
                    Shop Gift Cards
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="lg" 
                    className="text-white"
                    onClick={handleBuyPXL}
                  >
                    <Wallet className="mr-2 h-4 w-4" />
                    Buy PXL
                  </Button>
                </>
              ) : (
                // Guest user CTAs
                <>
                  <Button 
                    size="lg" 
                    className="bg-white text-black hover:bg-gray-200"
                    onClick={handleGetStarted}
                  >
                    Get Started Free
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="lg" 
                    className="text-white"
                    onClick={handleExploreMarketplace}
                  >
                    Explore Marketplace
                  </Button>
                </>
              )}
            </div>
            
            {/* Show user's balance if logged in */}
            {user && platformUser && (
              <div className="mt-6 flex items-center justify-center gap-4 text-sm text-gray-400">
                <div className="flex items-center gap-2">
                  <span>Your Balance:</span>
                  <span className="font-semibold text-white">{formatPXL(platformUser.wallets?.pxl?.balance || 0)}</span>
                </div>
                <div className="w-px h-4 bg-gray-700"></div>
                <div className="flex items-center gap-2">
                  <span>Tier:</span>
                  <span className="font-semibold text-white capitalize">{platformUser.tier?.current || 'starter'}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
