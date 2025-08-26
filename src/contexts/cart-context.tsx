/**
 * Shopping Cart Context for managing cart state across the application
 */

"use client";

import React, { createContext, useContext, useReducer, ReactNode, useEffect } from 'react';

// Cart item interface
export interface CartItem {
  id: string;
  giftcardId: string;
  brand: string;
  productName: string;
  denomination: number;
  quantity: number;
  pricing: {
    usd: number;
    pxl: number;
  };
  tierDiscount?: number;
  cashback?: number;
  imageUrl?: string;
}

// Cart state interface
interface CartState {
  items: CartItem[];
  isOpen: boolean;
  totalItems: number;
  totals: {
    usd: number;
    pxl: number;
    savings: number;
    cashback: number;
  };
  isHydrated: boolean; // BUG FIX: Track hydration status to prevent flash
}

// Cart actions
type CartAction =
  | { type: 'ADD_ITEM'; payload: Omit<CartItem, 'quantity'> }
  | { type: 'REMOVE_ITEM'; payload: string }
  | { type: 'UPDATE_QUANTITY'; payload: { id: string; quantity: number } }
  | { type: 'CLEAR_CART' }
  | { type: 'TOGGLE_CART' }
  | { type: 'OPEN_CART' }
  | { type: 'CLOSE_CART' }
  | { type: 'SET_HYDRATED'; payload: CartState }; // BUG FIX: Action to set hydrated state

// BUG FIX: Add localStorage persistence to prevent cart clearing on refresh
// localStorage helpers
const CART_STORAGE_KEY = 'giftcard-cart';

const loadCartFromStorage = (): CartState => {
  if (typeof window === 'undefined') return getInitialState();
  
  try {
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    if (stored) {
      const parsedState = JSON.parse(stored);
      // Recalculate totals to ensure consistency
      const recalculatedState = {
        ...parsedState,
        totals: calculateTotals(parsedState.items),
        totalItems: parsedState.items.reduce((sum: number, item: CartItem) => sum + item.quantity, 0),
      };
      return recalculatedState;
    }
  } catch (error) {
    console.error('Error loading cart from localStorage:', error);
  }
  
  return getInitialState();
};

const saveCartToStorage = (state: CartState) => {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('Error saving cart to localStorage:', error);
  }
};

const getInitialState = (): CartState => ({
  items: [],
  isOpen: false,
  totalItems: 0,
  totals: {
    usd: 0,
    pxl: 0,
    savings: 0,
    cashback: 0,
  },
  isHydrated: false, // BUG FIX: Start as not hydrated
});

// Initial state
const initialState: CartState = getInitialState();

// Calculate totals helper
const calculateTotals = (items: CartItem[]) => {
  return items.reduce(
    (acc, item) => {
      const itemUsdTotal = item.pricing.usd * item.quantity;
      const itemPxlTotal = item.pricing.pxl * item.quantity;
      const itemSavings = (item.tierDiscount || 0) * item.quantity;
      const itemCashback = (item.cashback || 0) * item.quantity;

      return {
        usd: acc.usd + itemUsdTotal,
        pxl: acc.pxl + itemPxlTotal,
        savings: acc.savings + itemSavings,
        cashback: acc.cashback + itemCashback,
      };
    },
    { usd: 0, pxl: 0, savings: 0, cashback: 0 }
  );
};

// Cart reducer
const cartReducer = (state: CartState, action: CartAction): CartState => {
  switch (action.type) {
    case 'ADD_ITEM': {
      const existingItemIndex = state.items.findIndex(
        (item) => item.id === action.payload.id
      );

      let newItems: CartItem[];
      if (existingItemIndex >= 0) {
        // Update quantity if item exists
        newItems = state.items.map((item, index) =>
          index === existingItemIndex
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        // Add new item
        newItems = [...state.items, { ...action.payload, quantity: 1 }];
      }

      const totals = calculateTotals(newItems);
      const totalItems = newItems.reduce((sum, item) => sum + item.quantity, 0);

      return {
        ...state,
        items: newItems,
        totalItems,
        totals,
      };
    }

    case 'REMOVE_ITEM': {
      const newItems = state.items.filter((item) => item.id !== action.payload);
      const totals = calculateTotals(newItems);
      const totalItems = newItems.reduce((sum, item) => sum + item.quantity, 0);

      return {
        ...state,
        items: newItems,
        totalItems,
        totals,
      };
    }

    case 'UPDATE_QUANTITY': {
      const { id, quantity } = action.payload;
      
      if (quantity <= 0) {
        // Remove item if quantity is 0 or less
        return cartReducer(state, { type: 'REMOVE_ITEM', payload: id });
      }

      const newItems = state.items.map((item) =>
        item.id === id ? { ...item, quantity } : item
      );

      const totals = calculateTotals(newItems);
      const totalItems = newItems.reduce((sum, item) => sum + item.quantity, 0);

      return {
        ...state,
        items: newItems,
        totalItems,
        totals,
      };
    }

    case 'CLEAR_CART':
      return {
        ...state,
        items: [],
        totalItems: 0,
        totals: {
          usd: 0,
          pxl: 0,
          savings: 0,
          cashback: 0,
        },
      };

    case 'TOGGLE_CART':
      return {
        ...state,
        isOpen: !state.isOpen,
      };

    case 'OPEN_CART':
      return {
        ...state,
        isOpen: true,
      };

    case 'CLOSE_CART':
      return {
        ...state,
        isOpen: false,
      };

    case 'SET_HYDRATED':
      // BUG FIX: Set hydrated state with loaded cart data
      return {
        ...action.payload,
        isHydrated: true,
      };

    default:
      return state;
  }
};

// Context
const CartContext = createContext<{
  state: CartState;
  dispatch: React.Dispatch<CartAction>;
} | null>(null);

// Provider component
export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, initialState);

  // BUG FIX: Load cart from localStorage on mount without flash
  useEffect(() => {
    const savedCart = loadCartFromStorage();
    // Always set hydrated state, even if cart is empty
    dispatch({ type: 'SET_HYDRATED', payload: savedCart });
  }, []);

  // BUG FIX: Save cart to localStorage whenever state changes (but only after hydration)
  useEffect(() => {
    if (state.isHydrated) {
      saveCartToStorage(state);
    }
  }, [state]);

  return (
    <CartContext.Provider value={{ state, dispatch }}>
      {children}
    </CartContext.Provider>
  );
}

// Custom hook to use cart context
export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}

// Helper functions for cart operations
export const cartActions = {
  addItem: (item: Omit<CartItem, 'quantity'>) => ({
    type: 'ADD_ITEM' as const,
    payload: item,
  }),
  
  removeItem: (id: string) => ({
    type: 'REMOVE_ITEM' as const,
    payload: id,
  }),
  
  updateQuantity: (id: string, quantity: number) => ({
    type: 'UPDATE_QUANTITY' as const,
    payload: { id, quantity },
  }),
  
  clearCart: () => ({
    type: 'CLEAR_CART' as const,
  }),
  
  toggleCart: () => ({
    type: 'TOGGLE_CART' as const,
  }),
  
  openCart: () => ({
    type: 'OPEN_CART' as const,
  }),
  
  closeCart: () => ({
    type: 'CLOSE_CART' as const,
  }),
};
