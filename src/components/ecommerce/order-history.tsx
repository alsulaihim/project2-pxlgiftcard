/**
 * Order History Component
 * Displays user's past orders with status and download links
 */

"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { formatBalance } from '@/lib/validation';
import { 
  Download, 
  Eye, 
  CheckCircle, 
  Clock, 
  XCircle,
  Gift,
  Calendar,
  CreditCard,
  Coins
} from 'lucide-react';

// Mock order data
const mockOrders = [
  {
    id: 'ORD-2024-001',
    date: '2024-01-15',
    status: 'completed',
    paymentMethod: 'pxl',
    total: {
      usd: 75.00,
      pxl: 7425,
    },
    items: [
      {
        id: '1',
        brand: 'Amazon',
        productName: 'Amazon Gift Card',
        denomination: 25,
        quantity: 3,
        code: 'AMZN-XXXX-XXXX-1234',
      }
    ],
    cashbackEarned: 222.75,
  },
  {
    id: 'ORD-2024-002',
    date: '2024-01-14',
    status: 'completed',
    paymentMethod: 'stripe',
    total: {
      usd: 100.00,
      pxl: 0,
    },
    items: [
      {
        id: '2',
        brand: 'Apple',
        productName: 'Apple Gift Card',
        denomination: 50,
        quantity: 2,
        code: 'APPL-XXXX-XXXX-5678',
      }
    ],
  },
  {
    id: 'ORD-2024-003',
    date: '2024-01-13',
    status: 'processing',
    paymentMethod: 'paypal',
    total: {
      usd: 200.00,
      pxl: 0,
    },
    items: [
      {
        id: '3',
        brand: 'Google Play',
        productName: 'Google Play Gift Card',
        denomination: 100,
        quantity: 2,
        code: null, // Not yet delivered
      }
    ],
  },
];

type OrderStatus = 'completed' | 'processing' | 'failed' | 'refunded';

/**
 * Order history component with filtering and detailed view
 */
export function OrderHistory() {
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');

  const filteredOrders = mockOrders.filter(order => 
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
        {filteredOrders.length === 0 ? (
          <div className="text-center py-12">
            <Gift className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No orders found</h3>
            <p className="text-gray-400 mb-6">
              {statusFilter === 'all' 
                ? "You haven't made any purchases yet" 
                : `No ${statusFilter} orders found`
              }
            </p>
            <Button onClick={() => window.location.href = '/marketplace'}>
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
                      <span>{new Date(order.date).toLocaleDateString()}</span>
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
                    {order.paymentMethod === 'pxl' 
                      ? `PXL ${formatBalance(order.total.pxl)}`
                      : `$${formatBalance(order.total.usd)}`
                    }
                  </div>
                  <div className="flex items-center space-x-1 text-sm text-gray-400">
                    {order.paymentMethod === 'pxl' ? (
                      <Coins className="h-4 w-4" />
                    ) : (
                      <CreditCard className="h-4 w-4" />
                    )}
                    <span className="capitalize">{order.paymentMethod}</span>
                  </div>
                </div>
              </div>

              {/* Order Items */}
              <div className="space-y-3 mb-4">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-gray-900 rounded-lg">
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
                            onClick={() => setSelectedOrder(selectedOrder === order.id ? null : order.id)}
                            className="border-gray-700 text-gray-300 hover:bg-gray-800"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View Code
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleDownloadGiftcard(order.id, item.id)}
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
                  {order.items.map((item) => (
                    item.code && (
                      <div key={item.id} className="bg-gray-900 rounded-lg p-3">
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
              {order.cashbackEarned && (
                <div className="border-t border-gray-800 pt-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">PXL Cashback Earned:</span>
                    <span className="text-green-400 font-medium">
                      +PXL {formatBalance(order.cashbackEarned)}
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
