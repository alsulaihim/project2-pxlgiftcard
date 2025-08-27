'use client';

import { useAuth } from '@/contexts/auth-context';
import { useCart } from '@/contexts/cart-context';
import { usePXLCurrency } from '@/hooks/use-pxl-currency';
import { Card } from '@/components/ui/card';
import Link from 'next/link';
import { 
  TrendingUp, 
  TrendingDown,
  Package,
  Wallet,
  ArrowRight,
  Clock,
  DollarSign,
  Coins,
  ShoppingBag,
  Star,
  ChevronRight
} from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';
import { PXLRateChart } from '@/components/dashboard/pxl-rate-chart';
import { TierProgressCard } from '@/components/dashboard/tier-progress-card';
import { FullPageLoader } from '@/components/ui/loader';

// Mock data for user's previously ordered giftcards
const previousOrders = [
  { 
    id: 1, 
    brand: 'Amazon', 
    name: 'Amazon Gift Card', 
    lastPurchased: '$25',
    denominations: [10, 25, 50, 100],
    selectedDenomination: 50,
    timesOrdered: 12,
    lastOrderDate: '2 days ago'
  },
  { 
    id: 2, 
    brand: 'Starbucks', 
    name: 'Starbucks Card', 
    lastPurchased: '$15',
    denominations: [10, 15, 25, 50],
    selectedDenomination: 25,
    timesOrdered: 8,
    lastOrderDate: '1 week ago'
  },
  { 
    id: 3, 
    brand: 'Apple', 
    name: 'Apple Store Card', 
    lastPurchased: '$50',
    denominations: [25, 50, 100, 200],
    selectedDenomination: 100,
    timesOrdered: 3,
    lastOrderDate: '2 weeks ago'
  },
  { 
    id: 4, 
    brand: 'Netflix', 
    name: 'Netflix Gift Card', 
    lastPurchased: '$30',
    denominations: [15, 30, 60, 100],
    selectedDenomination: 60,
    timesOrdered: 5,
    lastOrderDate: '3 weeks ago'
  }
];

// Tier color mapping
const tierColors = {
  starter: { bg: 'rgb(226, 223, 223)', text: 'text-gray-700' },
  rising: { bg: '#0070f3', text: 'text-white' },
  pro: { bg: 'rgb(8, 205, 1)', text: 'text-white' },
  pixlbeast: { bg: '#f59e0b', text: 'text-black' },
  pixlionaire: { bg: 'rgb(185, 43, 228)', text: 'text-white' }
};



export default function DashboardPage() {
  const { user, platformUser, loading } = useAuth();
  const { state: cartState, dispatch: cartDispatch } = useCart();
  const { 
    currencyData, 
    currentRate, 
    trend,
    loading: currencyLoading 
  } = usePXLCurrency();
  const [selectedDenominations, setSelectedDenominations] = useState<{[key: number]: number}>({});
  
  // Calculate rate change from currency data
  const rateChange = useMemo(() => {
    if (!currencyData?.marketData?.hourlyRates || currencyData.marketData.hourlyRates.length < 2) {
      return 0;
    }
    const rates = currencyData.marketData.hourlyRates;
    const currentRate = rates[rates.length - 1].rate;
    const hourAgoRate = rates[Math.max(0, rates.length - 60)]?.rate || currentRate;
    return ((currentRate - hourAgoRate) / hourAgoRate) * 100;
  }, [currencyData]);
  


  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      window.location.href = '/auth/signin';
    }
  }, [loading, user]);

  if (loading) return <FullPageLoader label="Loading dashboard" />;

  if (!user || !platformUser) {
    return null;
  }

  const tierColor = tierColors[platformUser.tier.current as keyof typeof tierColors] || tierColors.starter;
  const nextTierThreshold = platformUser.tier.nextTierThreshold || 1000;
  const tierProgress = (platformUser.wallets.pxl.balance / nextTierThreshold) * 100;
  const pxlNeeded = Math.max(nextTierThreshold - platformUser.wallets.pxl.balance, 0);

  const handleAddToCart = (order: typeof previousOrders[0]) => {
    const denomination = selectedDenominations[order.id] || order.selectedDenomination;
    const pxlPrice = denomination * currentRate;
    
    cartDispatch({
      type: 'ADD_ITEM',
      payload: {
        id: `${order.id}-${denomination}`,
        giftcardId: order.id.toString(),
        brand: order.brand,
        productName: order.name,
        denomination: denomination,
        pricing: {
          usd: denomination,
          pxl: pxlPrice
        },
        tierDiscount: 13, // Mock tier discount
        cashback: 3 // Mock cashback
      }
    });
    
    cartDispatch({ type: 'OPEN_CART' });
  };

  return (
    <div className="min-h-screen bg-black">
      <div className="mx-auto max-w-7xl px-4 lg:px-6 py-6">
        {/* Compact Welcome Section */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-white">
            Welcome back, {platformUser.profile.firstName}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Dashboard overview • {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* Compact Stats Overview */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
          {/* PXL Balance Card */}
          <Card className="bg-gray-900/30 border-gray-800 p-4">
            <div className="flex items-center justify-between mb-2">
              <Coins className="h-4 w-4 text-gray-400" />
              <span className="text-xs text-gray-500">PXL Balance</span>
            </div>
            <p className="text-lg font-semibold text-white">
              {platformUser.wallets.pxl.balance.toLocaleString()}
            </p>
            <p className="text-xs text-gray-500">
              ≈ ${(platformUser.wallets.pxl.balance / currentRate).toFixed(2)}
            </p>
          </Card>

          {/* Current Tier Card */}
          <Card className="bg-gray-900/30 border-gray-800 p-4">
            <div className="flex items-center justify-between mb-2">
              <Star className="h-4 w-4 text-gray-400" />
              <span className="text-xs text-gray-500">Current Tier</span>
            </div>
            <p className="text-lg font-semibold text-white capitalize">
              {platformUser.tier.current}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex-1 h-1 bg-gray-800 rounded-full overflow-hidden">
                <div 
                  className={`h-full bg-gray-400 transition-all duration-500 ${
                    tierProgress === 0 ? 'w-0' :
                    tierProgress <= 10 ? 'w-[10%]' :
                    tierProgress <= 20 ? 'w-[20%]' :
                    tierProgress <= 30 ? 'w-[30%]' :
                    tierProgress <= 40 ? 'w-[40%]' :
                    tierProgress <= 50 ? 'w-[50%]' :
                    tierProgress <= 60 ? 'w-[60%]' :
                    tierProgress <= 70 ? 'w-[70%]' :
                    tierProgress <= 80 ? 'w-[80%]' :
                    tierProgress <= 90 ? 'w-[90%]' :
                    'w-full'
                  }`}
                />
              </div>
              <span className="text-xs text-gray-500">{tierProgress.toFixed(0)}%</span>
            </div>
          </Card>

          {/* Total Saved Card */}
          <Card className="bg-gray-900/30 border-gray-800 p-4">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="h-4 w-4 text-gray-400" />
              <span className="text-xs text-gray-500">Total Saved</span>
            </div>
            <p className="text-lg font-semibold text-white">$0.00</p>
            <p className="text-xs text-gray-500">This month</p>
          </Card>

          {/* Recent Orders Card */}
          <Card className="bg-gray-900/30 border-gray-800 p-4">
            <div className="flex items-center justify-between mb-2">
              <ShoppingBag className="h-4 w-4 text-gray-400" />
              <span className="text-xs text-gray-500">Total Orders</span>
            </div>
            <p className="text-lg font-semibold text-white">0</p>
            <p className="text-xs text-gray-500">Last 30 days</p>
          </Card>
        </div>

        {/* PXL Exchange Rate Chart */}
        <div className="mb-8">
          <PXLRateChart />
        </div>

        {/* Quick Stats Overview */}
        <Card className="bg-gray-900/30 border-gray-800 p-6 mb-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-white">Exchange Rate Summary</h3>
                <p className="text-sm text-gray-400">Track PXL performance and market trends in the detailed chart above.</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-500">Current Rate</p>
                <p className="text-xl font-semibold text-white">1 USD = {currentRate} PXL</p>
                <div className="flex items-center gap-1 mt-1">
                  {rateChange < 0 ? (
                    <TrendingDown className="h-3 w-3 text-gray-400" />
                  ) : (
                    <TrendingUp className="h-3 w-3 text-gray-400" />
                  )}
                  <span className="text-xs text-gray-500">
                    {Math.abs(rateChange)}% past 1h
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-gray-800">
                <p className="text-xs text-gray-500 mb-1">Your Benefits</p>
                <p className="text-xs text-gray-400">
                  <span className="text-white">13%</span> discount • <span className="text-white">3%</span> cashback
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Buy Again Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-white">Buy Again</h2>
            <Link 
              href="/orders" 
              className="text-xs text-gray-400 hover:text-white transition-colors"
            >
              View order history
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {previousOrders.map((order) => (
              <Card 
                key={order.id}
                className="bg-gray-900/30 border-gray-800 p-4 hover:bg-gray-900/50 transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex gap-3">
                    <div className="flex items-center justify-center h-10 w-10 bg-gray-800 rounded-lg flex-shrink-0">
                      <span className="text-sm font-semibold text-gray-400">
                        {order.brand[0]}
                      </span>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-white">{order.name}</h3>
                      <p className="text-xs text-gray-500">
                        Last: {order.lastPurchased} • {order.lastOrderDate}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <select 
                          className="bg-gray-800 border border-gray-700 text-xs text-white rounded px-2 py-1 focus:outline-none focus:border-gray-600"
                          value={selectedDenominations[order.id] || order.selectedDenomination}
                          onChange={(e) => setSelectedDenominations(prev => ({
                            ...prev,
                            [order.id]: parseInt(e.target.value)
                          }))}
                          aria-label={`Select denomination for ${order.name}`}
                        >
                          {order.denominations.map(denom => (
                            <option key={denom} value={denom}>${denom}</option>
                          ))}
                        </select>
                        <button 
                          className="text-xs bg-gray-800 hover:bg-gray-700 text-white px-3 py-1 rounded transition-colors"
                          onClick={() => handleAddToCart(order)}
                        >
                          Add to Cart
                        </button>
                      </div>
                    </div>
                  </div>
                  <span className="text-xs text-gray-500">
                    {order.timesOrdered}x
                  </span>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Compact Tier Progress and Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Tier Progress - Simplified */}
          <Card className="bg-gray-900/30 border-gray-800 p-6">
            <h3 className="text-base font-medium text-white mb-4">Tier Progress</h3>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-2xl font-semibold text-white capitalize">{platformUser.tier.current}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {pxlNeeded.toLocaleString()} PXL to next tier
                </p>
              </div>
              <div className="relative w-16 h-16">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="32"
                    cy="32"
                    r="28"
                    stroke="#262626"
                    strokeWidth="4"
                    fill="none"
                  />
                  <circle
                    cx="32"
                    cy="32"
                    r="28"
                    stroke="#666666"
                    strokeWidth="4"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 28}`}
                    strokeDashoffset={`${2 * Math.PI * 28 * (1 - tierProgress / 100)}`}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-medium text-white">{tierProgress.toFixed(0)}%</span>
                </div>
              </div>
            </div>
            <div className="border-t border-gray-800 pt-3">
              <p className="text-xs text-gray-500 mb-2">Current Benefits</p>
              <p className="text-sm text-gray-300">
                <span className="text-white">13%</span> discount • <span className="text-white">3%</span> cashback
              </p>
            </div>
          </Card>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 gap-3">
            <Link href="/pxl">
              <Card className="bg-gray-900/30 border-gray-800 p-4 hover:bg-gray-900/50 transition-all cursor-pointer">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-white">Buy PXL</h3>
                    <p className="text-xs text-gray-500">Convert USD to PXL</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </div>
              </Card>
            </Link>

            <Link href="/marketplace">
              <Card className="bg-gray-900/30 border-gray-800 p-4 hover:bg-gray-900/50 transition-all cursor-pointer">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-white">Browse Marketplace</h3>
                    <p className="text-xs text-gray-500">Discover gift cards</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </div>
              </Card>
            </Link>

            <Link href="/orders">
              <Card className="bg-gray-900/30 border-gray-800 p-4 hover:bg-gray-900/50 transition-all cursor-pointer">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-white">Order History</h3>
                    <p className="text-xs text-gray-500">View past purchases</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </div>
              </Card>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}