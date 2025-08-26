import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ClientLayout } from "@/components/layout/client-layout";

// Optimize font loading with variable font
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "GiftCard + PXL Platform | Premium Gift Cards with PXL Currency",
  description: "Shop premium gift cards from top brands. Pay in USD or PXL currency. Unlock tier-based savings up to 13% discount + 3% cashback. Join the community of smart shoppers.",
  keywords: [
    "gift cards",
    "PXL currency",
    "digital currency",
    "tier system",
    "cashback rewards",
    "discount shopping",
    "premium brands",
    "instant delivery"
  ],
  authors: [{ name: "GiftCard + PXL Platform Team" }],
  creator: "GiftCard + PXL Platform",
  publisher: "GiftCard + PXL Platform",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://pxlgiftcard.com",
    siteName: "GiftCard + PXL Platform",
    title: "Premium Gift Cards with PXL Currency | Up to 13% Savings",
    description: "Revolutionary gift card platform with PXL digital currency, tier-based rewards, and community features. Start saving today!",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "GiftCard + PXL Platform - Premium Gift Cards with PXL Currency",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "GiftCard + PXL Platform | Premium Gift Cards with PXL Currency",
    description: "Shop premium gift cards with PXL currency. Unlock tier-based savings up to 13% discount + 3% cashback.",
    images: ["/twitter-image.jpg"],
    creator: "@pxlgiftcard",
  },

  manifest: "/site.webmanifest",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon-16x16.png",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        {/* Preconnect to external domains for performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        
        {/* Security headers via meta tags */}
        <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
        <meta httpEquiv="Referrer-Policy" content="origin-when-cross-origin" />
        
        {/* Performance hints */}
        <link rel="dns-prefetch" href="//fonts.googleapis.com" />
        <link rel="dns-prefetch" href="//fonts.gstatic.com" />
      </head>
      <body className={`${inter.className} antialiased`}>
        {/* Skip to main content for accessibility */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-accent-blue text-white px-4 py-2 rounded-md z-50"
        >
          Skip to main content
        </a>
        
        <ClientLayout>
          {children}
        </ClientLayout>
        
        {/* Analytics and monitoring scripts would go here */}
        {process.env.NODE_ENV === "production" && (
          <>
            {/* Vercel Analytics */}
            <script
              defer
              src="https://cdn.vercel-insights.com/v1/script.debug.js"
            />
            
            {/* Performance monitoring */}
            <script
              dangerouslySetInnerHTML={{
                __html: `
                  // Core Web Vitals monitoring
                  if ('PerformanceObserver' in window) {
                    const observer = new PerformanceObserver((list) => {
                      for (const entry of list.getEntries()) {
                        console.log('Performance metric:', entry.name, entry.value);
                      }
                    });
                    observer.observe({ entryTypes: ['largest-contentful-paint', 'first-input', 'cumulative-layout-shift'] });
                  }
                `,
              }}
            />
          </>
        )}
      </body>
    </html>
  );
}
