"use client";

import * as React from "react";
import { TrendingUp, DollarSign, ArrowRight, Calculator } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/**
 * PXL Currency explanation section
 * Shows the value proposition of PXL vs USD with interactive examples
 */
export function PXLExplanation() {
  const [selectedAmount, setSelectedAmount] = React.useState(100);
  const exchangeRate = 100; // 1 USD = 100 PXL baseline
  const currentRate = 99.9; // Slightly appreciated rate for demo

  const amounts = [50, 100, 250, 500];

  const calculateSavings = (usdAmount: number, tier: string) => {
    const discounts = {
      starter: 0,
      rising: 0.03,
      pro: 0.08,
      pixlbeast: 0.11,
      pixlionaire: 0.13,
    };
    
    const cashbacks = {
      starter: 0,
      rising: 0.01,
      pro: 0.02,
      pixlbeast: 0.025,
      pixlionaire: 0.03,
    };

    const discount = discounts[tier as keyof typeof discounts] || 0;
    const cashback = cashbacks[tier as keyof typeof cashbacks] || 0;
    
    const discountAmount = usdAmount * discount;
    const cashbackAmount = usdAmount * cashback;
    
    return {
      discount: discountAmount,
      cashback: cashbackAmount,
      total: discountAmount + cashbackAmount,
    };
  };

  const proSavings = calculateSavings(selectedAmount, 'pro');

  return (
    <section className="py-24 bg-background-secondary">
      <div className="container mx-auto px-4 md:px-6">
        {/* Section Header */}
        <div className="mx-auto max-w-3xl text-center mb-16">
          <h2 className="mb-4 text-h1 font-bold text-heading-primary">
            Understanding PXL Currency
          </h2>
          <p className="text-body-large text-text-secondary">
            PXL is our platform's digital currency that appreciates over time and unlocks 
            tier-based savings. Here's how it works and why it's beneficial.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
          {/* Left Column - Explanation */}
          <div className="space-y-8">
            {/* How PXL Works */}
            <Card variant="surface">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="mr-2 h-5 w-5 text-accent-blue" />
                  How PXL Works
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <div className="mt-1 h-2 w-2 rounded-full bg-accent-blue" />
                    <div>
                      <p className="text-body font-medium text-text-primary">Purchase PXL with USD</p>
                      <p className="text-body-small text-text-secondary">
                        Convert USD to PXL at current exchange rates (baseline: 1 USD = 100 PXL)
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="mt-1 h-2 w-2 rounded-full bg-tier-pro" />
                    <div>
                      <p className="text-body font-medium text-text-primary">PXL Appreciates Over Time</p>
                      <p className="text-body-small text-text-secondary">
                        Dynamic exchange rates mean your PXL becomes more valuable as the platform grows
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="mt-1 h-2 w-2 rounded-full bg-accent-green" />
                    <div>
                      <p className="text-body font-medium text-text-primary">Unlock Tier Benefits</p>
                      <p className="text-body-small text-text-secondary">
                        Higher PXL balances unlock better discounts and cashback rewards
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Key Benefits */}
            <Card variant="surface">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <DollarSign className="mr-2 h-5 w-5 text-accent-green" />
                  Key Benefits
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="text-center p-4 rounded-md bg-background-primary">
                    <div className="text-h3 font-bold text-accent-green">13%</div>
                    <div className="text-body-small text-text-secondary">Max Discount</div>
                  </div>
                  <div className="text-center p-4 rounded-md bg-background-primary">
                    <div className="text-h3 font-bold text-accent-blue">3%</div>
                    <div className="text-body-small text-text-secondary">Max Cashback</div>
                  </div>
                  <div className="text-center p-4 rounded-md bg-background-primary">
                    <div className="text-h3 font-bold text-tier-pro">One-Way</div>
                    <div className="text-body-small text-text-secondary">USD → PXL Only</div>
                  </div>
                  <div className="text-center p-4 rounded-md bg-background-primary">
                    <div className="text-h3 font-bold text-tier-pixlbeast">P2P</div>
                    <div className="text-body-small text-text-secondary">Transfer to Users</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Interactive Calculator */}
          <div className="space-y-6">
            <Card variant="surface">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calculator className="mr-2 h-5 w-5 text-tier-pro" />
                  Savings Calculator
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Amount Selection */}
                <div>
                  <label className="text-body-small font-medium text-text-primary mb-3 block">
                    Select Purchase Amount (USD)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {amounts.map((amount) => (
                      <Button
                        key={amount}
                        variant={selectedAmount === amount ? "primary" : "secondary"}
                        size="sm"
                        onClick={() => setSelectedAmount(amount)}
                      >
                        ${amount}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Current Exchange Rate */}
                <div className="p-4 rounded-md bg-background-primary border border-border-default">
                  <div className="text-body-small text-text-secondary mb-1">Current Exchange Rate</div>
                  <div className="text-h3 font-bold text-heading-primary">
                    1 USD = {currentRate} PXL
                  </div>
                  <div className="text-caption text-accent-green">
                    ↑ 0.1% appreciation from baseline
                  </div>
                </div>

                {/* Comparison */}
                <div className="space-y-4">
                  {/* USD Payment */}
                  <div className="p-4 rounded-md bg-background-primary border border-border-default">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-body font-medium text-text-primary">USD Payment</span>
                      <span className="text-h4 font-bold text-heading-primary">${selectedAmount}</span>
                    </div>
                    <div className="text-body-small text-text-secondary">
                      Standard pricing • No additional benefits
                    </div>
                  </div>

                  {/* PXL Payment (Pro Tier) */}
                  <div className="p-4 rounded-md bg-tier-pro/10 border border-tier-pro/20">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-body font-medium text-text-primary">PXL Payment (Pro Tier)</span>
                      <span className="text-h4 font-bold text-tier-pro">
                        ${(selectedAmount - proSavings.total).toFixed(2)}
                      </span>
                    </div>
                    <div className="space-y-1 text-body-small">
                      <div className="flex justify-between text-text-secondary">
                        <span>8% Discount:</span>
                        <span className="text-accent-green">-${proSavings.discount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-text-secondary">
                        <span>2% Cashback:</span>
                        <span className="text-accent-green">+${proSavings.cashback.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-medium text-tier-pro border-t border-tier-pro/20 pt-1">
                        <span>Total Savings:</span>
                        <span>${proSavings.total.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* CTA */}
                <Button size="lg" className="w-full">
                  Start Saving with PXL
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}
