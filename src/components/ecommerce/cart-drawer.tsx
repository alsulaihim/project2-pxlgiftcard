/**
 * Shopping Cart Drawer Component
 * Slide-out cart with item management and checkout options
 */

"use client";

import React from 'react';
import Image from 'next/image';
import { useCart, cartActions } from '@/contexts/cart-context';
import { Button } from '@/components/ui/button';
import { formatBalance } from '@/lib/validation';
import { 
  X, 
  Plus, 
  Minus, 
  ShoppingBag, 
  CreditCard, 
  Coins,
  Trash2,
  ArrowRight
} from 'lucide-react';
import { useRouter } from 'next/navigation';

/**
 * Shopping cart drawer with Vercel-inspired design
 */
export function CartDrawer() {
  const { state, dispatch } = useCart();
  const router = useRouter();

  const handleQuantityChange = (id: string, newQuantity: number) => {
    dispatch(cartActions.updateQuantity(id, newQuantity));
  };

  const handleRemoveItem = (id: string) => {
    dispatch(cartActions.removeItem(id));
  };

  const handleCheckout = () => {
    // Navigate to checkout page
    router.push('/checkout');
  };

  if (!state.isOpen) return null;

  return (
    <>
      {/* Backdrop - Only on mobile */}
      <div 
        className="fixed inset-0 bg-black/50 z-40 md:hidden"
        onClick={() => dispatch(cartActions.closeCart())}
      />
      
      {/* Cart Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-black border-l border-gray-800 z-50 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <div className="flex items-center space-x-2">
            <ShoppingBag className="h-5 w-5 text-white" />
            <h2 className="text-lg font-semibold text-white">
              Shopping Cart ({state.totalItems})
            </h2>
          </div>
          <button
            onClick={() => dispatch(cartActions.closeCart())}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            aria-label="Close cart"
          >
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4">
          {state.items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <ShoppingBag className="h-12 w-12 text-gray-600 mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">Your cart is empty</h3>
              <p className="text-gray-400 mb-6">Add some gift cards to get started</p>
              <Button 
                onClick={() => {
                  dispatch(cartActions.closeCart());
                  router.push('/marketplace');
                }}
                className="bg-white text-black hover:bg-gray-200"
              >
                Continue Shopping
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {state.items.map((item) => (
                <div key={item.id} className="bg-gray-950 border border-gray-800 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    {/* Product Image */}
                    <div className="w-16 h-16 bg-gray-800 rounded-lg flex items-center justify-center flex-shrink-0">
                      {item.imageUrl && item.imageUrl.startsWith('http') ? (
                        <Image 
                          src={item.imageUrl} 
                          alt={item.productName}
                          width={64}
                          height={64}
                          className="w-full h-full object-cover rounded-lg"
                          onError={() => {
                            // Fallback handled by the else condition below
                          }}
                        />
                      ) : (
                        <span className="text-lg font-bold text-white">
                          {item.imageUrl || item.brand.charAt(0)}
                        </span>
                      )}
                    </div>

                    {/* Product Details */}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-white truncate">
                        {item.productName}
                      </h4>
                      <p className="text-xs text-gray-400 mb-2">
                        {item.brand} • ${item.denomination}
                      </p>

                      {/* Pricing */}
                      <div className="space-y-1 mb-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-400">USD:</span>
                          <span className="text-white font-medium">
                            ${formatBalance(item.pricing.usd * item.quantity)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-400">PXL:</span>
                          <span className="text-green-400 font-medium">
                            PXL {formatBalance(item.pricing.pxl * item.quantity)}
                          </span>
                        </div>
                        {item.tierDiscount && item.tierDiscount > 0 && (
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-400">Savings:</span>
                            <span className="text-blue-400 font-medium">
                              -${formatBalance(item.tierDiscount * item.quantity)}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                            className="w-8 h-8 rounded-lg border border-gray-700 bg-gray-800 hover:bg-gray-700 flex items-center justify-center transition-colors"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="h-3 w-3 text-white" />
                          </button>
                          <span className="text-sm font-medium text-white min-w-[2rem] text-center">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                            className="w-8 h-8 rounded-lg border border-gray-700 bg-gray-800 hover:bg-gray-700 flex items-center justify-center transition-colors"
                            aria-label="Increase quantity"
                          >
                            <Plus className="h-3 w-3 text-white" />
                          </button>
                        </div>

                        <button
                          onClick={() => handleRemoveItem(item.id)}
                          className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                          aria-label="Remove item"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cart Summary & Checkout */}
        {state.items.length > 0 && (
          <div className="border-t border-gray-800 p-4 space-y-4">
            {/* Totals */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">USD Total:</span>
                <span className="text-white font-medium">
                  ${formatBalance(state.totals.usd)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">PXL Total:</span>
                <span className="text-green-400 font-medium">
                  PXL {formatBalance(state.totals.pxl)}
                </span>
              </div>
              {state.totals.savings > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Total Savings:</span>
                  <span className="text-blue-400 font-medium">
                    -${formatBalance(state.totals.savings)}
                  </span>
                </div>
              )}
              {state.totals.cashback > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Cashback:</span>
                  <span className="text-green-400 font-medium">
                    +PXL {formatBalance(state.totals.cashback)}
                  </span>
                </div>
              )}
            </div>

            {/* Checkout Button */}
            <Button
              onClick={handleCheckout}
              className="w-full bg-white text-black hover:bg-gray-200 flex items-center justify-center space-x-2"
            >
              <span>Proceed to Checkout</span>
              <ArrowRight className="h-4 w-4" />
            </Button>

            {/* Clear Cart */}
            <button
              onClick={() => dispatch(cartActions.clearCart())}
              className="w-full text-sm text-gray-400 hover:text-white transition-colors"
            >
              Clear Cart
            </button>
          </div>
        )}
      </div>
    </>
  );
}
