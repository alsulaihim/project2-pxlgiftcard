"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  CheckCircle, 
  Copy, 
  Share2, 
  Download,
  Home,
  ShoppingBag,
  AlertCircle,
  Package
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context';
import { db } from '@/lib/firebase-config';
import { doc, getDoc } from 'firebase/firestore';
import { formatPXL, formatUSD } from '@/lib/pxl-currency';
import GiftCardReveal from '@/components/ecommerce/gift-card-reveal';

interface OrderData {
  id: string;
  userId: string;
  items: Array<{
    productId: string;
    brand: string;
    productName: string;
    denomination: number;
    quantity: number;
    serials?: string[];
    codes?: string[];
  }>;
  payment: {
    method: 'pxl' | 'stripe' | 'paypal';
    amount: number;
    currency: 'USD' | 'PXL';
  };
  totals: {
    subtotal: number;
    discount: number;
    cashback?: number;
    total: number;
  };
  status: 'completed' | 'processing' | 'failed';
  createdAt: any;
  reservations?: Array<{
    productId: string;
    serials: string[];
  }>;
}

export default function OrderConfirmationPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadOrder = async () => {
      if (!user || !params.orderId) {
        setLoading(false);
        return;
      }

      try {
        const orderDoc = await getDoc(doc(db, 'orders', params.orderId as string));
        
        if (orderDoc.exists() && orderDoc.data().userId === user.uid) {
          setOrder({ id: orderDoc.id, ...orderDoc.data() } as OrderData);
        }
      } catch (error) {
        console.error('Error loading order:', error);
      } finally {
        setLoading(false);
      }
    };

    loadOrder();
  }, [user, params.orderId]);


  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Order Not Found</h1>
          <p className="text-gray-400 mb-6">This order doesn't exist or you don't have access to it.</p>
          <Button onClick={() => router.push('/dashboard')}>
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Success Header */}
        <div className="text-center mb-8">
          <CheckCircle className="h-20 w-20 text-green-500 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-white mb-2">Order Confirmed!</h1>
          <p className="text-gray-400">
            Thank you for your purchase. Your gift cards are ready to use.
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Order ID: {order.id}
          </p>
        </div>

        {/* Gift Cards */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-6">
            <Package className="h-5 w-5 text-purple-400" />
            <h2 className="text-xl font-semibold text-white">Your Gift Cards</h2>
          </div>
          
          <div className="space-y-4">
            {order.items.map((item, itemIndex) => {
              // If item has multiple serials/codes, show each separately
              if (item.codes && item.codes.length > 0) {
                return item.codes.map((code, codeIndex) => (
                  <GiftCardReveal
                    key={`${itemIndex}-${codeIndex}`}
                    brand={item.brand}
                    productName={item.productName}
                    denomination={item.denomination}
                    code={code}
                    serialNumber={item.serials?.[codeIndex]}
                    orderId={order.id}
                    index={codeIndex}
                  />
                ));
              }
              
              // Fallback for items without codes (shouldn't happen for completed orders)
              return (
                <div key={itemIndex} className="bg-gray-950 border border-gray-800 rounded-xl p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-white">{item.brand}</h3>
                      <p className="text-gray-400">{item.productName}</p>
                      <p className="text-sm text-gray-500">Value: ${item.denomination}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-400">Quantity</p>
                      <p className="text-lg font-semibold text-white">{item.quantity}</p>
                    </div>
                  </div>
                  <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                    <p className="text-sm text-yellow-400">
                      Processing... Your gift card codes will appear here shortly.
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Order Summary */}
        <div className="bg-gray-950 border border-gray-800 rounded-xl p-6 mb-8">
          <h3 className="text-lg font-semibold text-white mb-4">Order Summary</h3>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Subtotal</span>
              <span className="text-white">
                {order.payment.currency === 'PXL' 
                  ? formatPXL(order.totals.subtotal)
                  : formatUSD(order.totals.subtotal)
                }
              </span>
            </div>
            
            {order.totals.discount > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-400">Tier Discount</span>
                <span className="text-green-400">
                  -{order.payment.currency === 'PXL' 
                    ? formatPXL(order.totals.discount)
                    : formatUSD(order.totals.discount)
                  }
                </span>
              </div>
            )}
            
            {order.totals.cashback && order.totals.cashback > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-400">Cashback Earned</span>
                <span className="text-blue-400">
                  +{formatPXL(order.totals.cashback)}
                </span>
              </div>
            )}
            
            <div className="border-t border-gray-800 pt-2 mt-2">
              <div className="flex justify-between font-semibold">
                <span className="text-white">Total Paid</span>
                <span className="text-white">
                  {order.payment.currency === 'PXL' 
                    ? formatPXL(order.totals.total)
                    : formatUSD(order.totals.total)
                  }
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Button 
            onClick={() => router.push('/orders')}
            variant="outline"
            className="flex-1"
          >
            <ShoppingBag className="h-4 w-4 mr-2" />
            View All Orders
          </Button>
          
          <Button 
            onClick={() => router.push('/marketplace')}
            className="flex-1"
          >
            <ShoppingBag className="h-4 w-4 mr-2" />
            Continue Shopping
          </Button>
          
          <Button 
            onClick={() => router.push('/dashboard')}
            variant="outline"
            className="flex-1"
          >
            <Home className="h-4 w-4 mr-2" />
            Dashboard
          </Button>
        </div>

        {/* Help Text */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Gift card codes have been sent to your email as well.</p>
          <p>Need help? Contact support@pxlgiftcard.com</p>
        </div>
      </main>
    </div>
  );
}
