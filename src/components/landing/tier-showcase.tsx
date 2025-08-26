import * as React from "react";
import { Crown, Star, Zap, Gem, Trophy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Tier showcase section displaying the 5-tier progression system
 * Shows benefits and visual hierarchy of each tier
 */
export function TierShowcase() {
  const tiers = [
    {
      name: "Starter",
      icon: Star,
      color: "tier-starter",
      bgColor: "bg-gray-500/10",
      borderColor: "border-gray-500/20",
      discount: "0%",
      cashback: "0%",
      description: "Begin your journey with basic platform access",
      features: ["Browse marketplace", "Basic chat access", "Standard pricing"],
      pxlThreshold: "0 PXL",
    },
    {
      name: "Rising",
      icon: Zap,
      color: "tier-rising",
      bgColor: "bg-blue-500/10",
      borderColor: "border-blue-500/20",
      discount: "3%",
      cashback: "1%",
      description: "Unlock your first tier benefits and savings",
      features: ["3% PXL discounts", "1% cashback", "Rising tier channel"],
      pxlThreshold: "1,000 PXL",
      popular: false,
    },
    {
      name: "Pro",
      icon: Crown,
      color: "tier-pro",
      bgColor: "bg-green-500/10",
      borderColor: "border-green-500/20",
      discount: "8%",
      cashback: "2%",
      description: "Professional tier with substantial savings",
      features: ["8% PXL discounts", "2% cashback", "Pro tier channel", "Priority support"],
      pxlThreshold: "10,000 PXL",
      popular: true,
    },
    {
      name: "Pixlbeast",
      icon: Gem,
      color: "tier-pixlbeast",
      bgColor: "bg-amber-500/10",
      borderColor: "border-amber-500/20",
      discount: "11%",
      cashback: "2.5%",
      description: "Elite status with premium benefits",
      features: ["11% PXL discounts", "2.5% cashback", "Pixlbeast channel", "VIP support", "Early access"],
      pxlThreshold: "50,000 PXL",
    },
    {
      name: "Pixlionaire",
      icon: Trophy,
      color: "tier-pixlionaire",
      bgColor: "bg-purple-500/10",
      borderColor: "border-purple-500/20",
      discount: "13%",
      cashback: "3%",
      description: "Ultimate tier with maximum benefits",
      features: ["13% PXL discounts", "3% cashback", "Pixlionaire lounge", "Dedicated support", "Exclusive events"],
      pxlThreshold: "100,000 PXL",
    },
  ];

  return (
    <section className="py-24 bg-background-primary">
      <div className="container mx-auto px-4 md:px-6">
        {/* Section Header */}
        <div className="mx-auto max-w-3xl text-center mb-16">
          <h2 className="mb-4 text-h1 font-bold text-heading-primary">
            5-Tier Progression System
          </h2>
          <p className="text-body-large text-text-secondary">
            Advance through tiers based on your PXL balance and unlock increasing benefits, 
            exclusive channels, and premium perks.
          </p>
        </div>

        {/* Tiers Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {tiers.map((tier, index) => (
            <Card
              key={tier.name}
              variant="surface"
              className={cn(
                "relative h-full transition-all duration-300 hover:scale-105",
                tier.bgColor,
                tier.borderColor,
                tier.popular && "ring-2 ring-accent-blue"
              )}
            >
              {tier.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-accent-blue text-white px-3 py-1 rounded-full text-caption font-medium">
                    Most Popular
                  </span>
                </div>
              )}

              <CardHeader className="text-center">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-surface mx-auto">
                  <tier.icon className={`h-6 w-6 text-${tier.color}`} />
                </div>
                <CardTitle className="text-h3">{tier.name}</CardTitle>
                <div className="space-y-1">
                  <div className="text-h2 font-bold text-accent-green">
                    {tier.discount}
                  </div>
                  <div className="text-body-small text-text-secondary">
                    Discount + {tier.cashback} Cashback
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <p className="text-body-small text-text-secondary text-center">
                  {tier.description}
                </p>

                <div className="space-y-2">
                  {tier.features.map((feature, featureIndex) => (
                    <div key={featureIndex} className="flex items-center text-body-small">
                      <div className={`mr-2 h-1.5 w-1.5 rounded-full bg-${tier.color}`} />
                      <span className="text-text-secondary">{feature}</span>
                    </div>
                  ))}
                </div>

                <div className="pt-4 border-t border-border-default">
                  <div className="text-caption text-text-tertiary text-center">
                    Requires: {tier.pxlThreshold}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="mt-16 text-center">
          <h3 className="mb-4 text-h3 font-semibold text-heading-primary">
            Start Your Tier Journey Today
          </h3>
          <p className="mb-6 text-body text-text-secondary">
            Begin at Starter tier and work your way up to Pixlionaire status with exclusive benefits.
          </p>
          <Button size="lg">
            Join Now - It's Free
          </Button>
        </div>
      </div>
    </section>
  );
}
