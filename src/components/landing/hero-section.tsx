"use client";

import * as React from "react";
import { ArrowRight, TrendingUp, Shield, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Hero section matching Vercel's landing page design
 * Clean, minimal, focused on the main value proposition
 */
export function HeroSection() {
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

            {/* CTA Buttons - Vercel style */}
            <div className="mt-6 flex items-center justify-center gap-x-6">
              <Button size="lg" className="bg-white text-black hover:bg-gray-200">
                Get Started Free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button variant="ghost" size="lg" className="text-white">
                Explore Marketplace
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
