// BUG FIX: 2025-01-27 - Add navigation component to client layout
// Problem: Navigation component not included in layout, causing dead-end dashboard
// Solution: Include Navigation component in ClientLayout for all pages
// Impact: Users can navigate between pages, consistent navigation experience

/**
 * Client Layout Wrapper
 * Wraps the application with client-side providers and navigation
 */

"use client";

import React from 'react';
import { CartProvider } from '@/contexts/cart-context';
import { AuthProvider } from '@/contexts/auth-context';
import { CartDrawer } from '@/components/ecommerce/cart-drawer';
import { Navigation } from '@/components/layout/navigation';
import ChatWidget from '@/components/chat/chat-widget';

interface ClientLayoutProps {
  children: React.ReactNode;
}

/**
 * Client-side layout wrapper with navigation and cart functionality
 */
export function ClientLayout({ children }: ClientLayoutProps) {
  return (
    <AuthProvider>
      <CartProvider>
        <Navigation />
        {children}
        <CartDrawer />
        <ChatWidget />
      </CartProvider>
    </AuthProvider>
  );
}
