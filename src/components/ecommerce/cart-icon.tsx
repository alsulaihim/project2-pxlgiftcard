/**
 * Cart Icon Component with Badge
 * Shows cart item count and opens cart drawer
 */

"use client";

import React from 'react';
import { useCart, cartActions } from '@/contexts/cart-context';
import { ShoppingBag } from 'lucide-react';

/**
 * Cart icon with item count badge for navigation
 */
export function CartIcon() {
  const { state, dispatch } = useCart();

  return (
    <button
      onClick={() => dispatch(cartActions.toggleCart())}
      className="relative p-2 text-gray-400 hover:text-white transition-colors"
      aria-label={`Shopping cart with ${state.totalItems} items`}
    >
      <ShoppingBag className="h-6 w-6" />
      
      {/* Item Count Badge */}
      {state.totalItems > 0 && (
        <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs font-medium rounded-full h-5 w-5 flex items-center justify-center min-w-[20px]">
          {state.totalItems > 99 ? '99+' : state.totalItems}
        </span>
      )}
    </button>
  );
}
