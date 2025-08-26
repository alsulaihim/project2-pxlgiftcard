/**
 * Order History Component
 * Displays user's past orders with status and download links
 */

"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { formatBalance } from '@/lib/validation';
import { formatPXL, formatUSD } from '@/lib/pxl-currency';
import { 
  Download, 
  Eye, 
  CheckCircle, 
  Clock, 
  XCircle,
  Gift,
  Calendar,
  CreditCard,
  Coins,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { db } from '@/lib/firebase-config';
import { collection, query, where, orderBy, limit, onSnapshot, Timestamp } from 'firebase/firestore';

type OrderStatus = 'completed' | 'processing' | 'failed' | 'refunded';

interface Order {
  id: string;
  userId: string;
  items: Array<{
    giftcardId: string;
    brand: string;
    productName: string;
    denomination: number;
    quantity: number;
    code?: string;
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
  status: OrderStatus;
  createdAt: Timestamp;
}

/**
 * Order history component with filtering and detailed view
 */
export function OrderHistory() {
  const router = useRouter();
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');

  // Load orders from Firestore
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const ordersQuery = query(
      collection(db, 'orders'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(
      ordersQuery,
      (snapshot) => {
        const orderList: Order[] = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Order));
        
        setOrders(orderList);
        setLoading(false);
      },
      (error) => {
        console.error('Error loading orders:', error);
        setLoading(false);
        
        if (error.code === 'failed-precondition' && error.message.includes('index')) {
          console.log('Order indexes are being built. Orders will appear once indexes are ready.');
        }
      }
    );

    return () => unsubscribe();
  }, [user]);

  const filteredOrders = orders.filter(order => 
    statusFilter === 'all' || order.status === statusFilter
  );

  const getStatusIcon = (status: OrderStatus) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-400" />;
      case 'processing':
        return <Clock className="h-4 w-4 text-yellow-400" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-400" />;
      case 'refunded':
        return <XCircle className="h-4 w-4 text-gray-400" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case 'completed':
        return 'text-green-400';
      case 'processing':
        return 'text-yellow-400';
      case 'failed':
        return 'text-red-400';
      case 'refunded':
        return 'text-gray-400';
      default:
        return 'text-gray-400';
    }
  };

  const handleDownloadGiftcard = (orderId: string, itemId: string) => {
    // Mock download functionality
    console.log(`Downloading giftcard for order ${orderId}, item ${itemId}`);
    // In real implementation, this would generate a PDF or redirect to download
  };

  return (
    <div className="space-y-6">
      {/* Filter Bar */}
      <div className="flex items-center space-x-4">
        <span className="text-sm font-medium text-gray-300">Filter by status:</span>
        <div className="flex space-x-2">
          {(['all', 'completed', 'processing', 'failed', 'refunded'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === status
                  ? 'bg-white text-black'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
            <p className="text-gray-400 mt-4">Loading your orders...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-12">
            <Gift className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No orders found</h3>
            <p className="text-gray-400 mb-6">
              {statusFilter === 'all' 
                ? "You haven't made any purchases yet" 
                : `No ${statusFilter} orders found`
              }
            </p>
            <Button onClick={() => router.push('/marketplace')}>
              Start Shopping
            </Button>
          </div>
        ) : (
          filteredOrders.map((order) => (
            <div
              key={order.id}
              className="bg-gray-950 border border-gray-800 rounded-xl p-6 hover:border-gray-700 transition-colors"
            >
              {/* Order Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white">{order.id}</h3>
                    <div className="flex items-center space-x-2 text-sm text-gray-400">
                      <Calendar className="h-4 w-4" />
                      <span>{order.createdAt.toDate().toLocaleDateString('en-US')}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(order.status)}
                    <span className={`text-sm font-medium capitalize ${getStatusColor(order.status)}`}>
                      {order.status}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-lg font-semibold text-white">
                    {order.payment.currency === 'PXL' 
                      ? formatPXL(order.totals.total)
                      : formatUSD(order.totals.total)
                    }
                  </div>
                  <div className="flex items-center space-x-1 text-sm text-gray-400">
                    {order.payment.method === 'pxl' ? (
                      <Coins className="h-4 w-4" />
                    ) : (
                      <CreditCard className="h-4 w-4" />
                    )}
                    <span className="capitalize">{order.payment.method}</span>
                  </div>
                </div>
              </div>

              {/* Order Items */}
              <div className="space-y-3 mb-4">
                {order.items.map((item, itemIndex) => (
                  <div key={`${order.id}-item-${itemIndex}`} className="flex items-center justify-between p-3 bg-gray-900 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gray-800 rounded-lg flex items-center justify-center">
                        <span className="text-xs font-medium text-gray-400">
                          {item.brand.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-white">{item.productName}</p>
                        <p className="text-sm text-gray-400">
                          ${item.denomination} × {item.quantity}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      {order.status === 'completed' && item.code ? (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => router.push(`/order-confirmation/${order.id}`)}
                            className="border-gray-700 text-gray-300 hover:bg-gray-800"
                          >
                            <ExternalLink className="h-4 w-4 mr-1" />
                            View Order
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleDownloadGiftcard(order.id, item.giftcardId)}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Download
                          </Button>
                        </>
                      ) : (
                        <span className="text-sm text-gray-500">
                          {order.status === 'processing' ? 'Processing...' : 'Not available'}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Expanded Order Details */}
              {selectedOrder === order.id && (
                <div className="border-t border-gray-800 pt-4 space-y-3">
                  <h4 className="font-medium text-white mb-2">Gift Card Codes</h4>
                  {order.items.map((item, codeIndex) => (
                    item.code && (
                      <div key={`${order.id}-code-${codeIndex}`} className="bg-gray-900 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-400">{item.productName}</span>
                          <code className="bg-gray-800 px-2 py-1 rounded text-sm font-mono text-green-400">
                            {item.code}
                          </code>
                        </div>
                      </div>
                    )
                  ))}
                </div>
              )}

              {/* Cashback Info */}
              {order.totals.cashback && order.totals.cashback > 0 && (
                <div className="border-t border-gray-800 pt-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">PXL Cashback Earned:</span>
                    <span className="text-green-400 font-medium">
                      +{formatPXL(order.totals.cashback)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Load More (for pagination) */}
      {filteredOrders.length > 0 && (
        <div className="text-center">
          <Button variant="outline" className="border-gray-700 text-gray-300 hover:bg-gray-800">
            Load More Orders
          </Button>
        </div>
      )}
    </div>
  );
}
