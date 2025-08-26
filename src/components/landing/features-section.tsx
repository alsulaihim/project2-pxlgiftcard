import * as React from "react";
import { 
  CreditCard, 
  Users, 
  MessageCircle, 
  BarChart3, 
  Gift, 
  Smartphone,
  ArrowUpRight,
  CheckCircle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/**
 * Features section showcasing platform capabilities
 * Highlights dual-currency system, tier benefits, and community features
 */
export function FeaturesSection() {
  const features = [
    {
      icon: CreditCard,
      title: "Dual Payment System",
      description: "Pay with traditional USD or innovative PXL currency. Choose the best option for maximum savings.",
      benefits: ["Stripe & PayPal integration", "Apple Pay & Google Pay", "Secure PCI compliance"],
    },
    {
      icon: BarChart3,
      title: "5-Tier Progression",
      description: "Advance through Starter, Rising, Pro, Pixlbeast, and Pixlionaire tiers with increasing benefits.",
      benefits: ["Up to 13% discounts", "3% cashback rewards", "Exclusive tier channels"],
    },
    {
      icon: MessageCircle,
      title: "Community Chat",
      description: "Connect with fellow shoppers in tier-based channels powered by Rocket.Chat integration.",
      benefits: ["Real-time messaging", "File & image sharing", "Tier-exclusive access"],
    },
    {
      icon: Gift,
      title: "Premium Brands",
      description: "Access gift cards from top retailers with instant digital delivery and QR codes.",
      benefits: ["Major brand catalog", "Instant delivery", "Mobile-optimized"],
    },
    {
      icon: Users,
      title: "PXL Transfers",
      description: "Send PXL currency to other platform users via username or email address.",
      benefits: ["Peer-to-peer transfers", "Personal messages", "Fraud protection"],
    },
    {
      icon: Smartphone,
      title: "Mobile-First Design",
      description: "Optimized for smartphone usage with responsive design and touch-friendly interfaces.",
      benefits: ["Dark theme UI", "Offline browsing", "Push notifications"],
    },
  ];

  return (
    <section className="py-24 bg-background-secondary">
      <div className="container mx-auto px-4 md:px-6">
        {/* Section Header */}
        <div className="mx-auto max-w-3xl text-center mb-16">
          <h2 className="mb-4 text-h1 font-bold text-heading-primary">
            Everything You Need for Smart Gift Card Shopping
          </h2>
          <p className="text-body-large text-text-secondary">
            Our platform combines traditional gift card shopping with innovative PXL currency, 
            tier-based rewards, and community features for the ultimate experience.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <Card key={index} variant="surface" hover className="h-full">
              <CardHeader>
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-md bg-accent-blue/10">
                  <feature.icon className="h-6 w-6 text-accent-blue" />
                </div>
                <CardTitle className="text-h3">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-6 text-body text-text-secondary">
                  {feature.description}
                </p>
                <ul className="space-y-2">
                  {feature.benefits.map((benefit, benefitIndex) => (
                    <li key={benefitIndex} className="flex items-center text-body-small text-text-secondary">
                      <CheckCircle className="mr-2 h-4 w-4 text-accent-green" />
                      {benefit}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* CTA Section */}
        <div className="mt-16 text-center">
          <Card variant="surface" className="mx-auto max-w-2xl p-8">
            <h3 className="mb-4 text-h2 font-bold text-heading-primary">
              Ready to Start Saving?
            </h3>
            <p className="mb-6 text-body text-text-secondary">
              Join thousands of smart shoppers who are already saving with PXL currency 
              and tier-based benefits.
            </p>
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Button size="lg">
                Create Free Account
                <ArrowUpRight className="ml-2 h-4 w-4" />
              </Button>
              <Button variant="secondary" size="lg">
                View Demo
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}
