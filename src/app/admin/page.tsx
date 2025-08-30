"use client";

import React, { useState, useEffect } from "react";
import { 
  Users, 
  TrendingUp, 
  DollarSign, 
  ShoppingBag, 
  Activity,
  Settings,
  Package,
  Shield,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { usePXLCurrency } from "@/hooks/use-pxl-currency";
import { formatPXL } from "@/lib/pxl-currency";
import { db } from "@/lib/firebase-config";
import { collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import { FullPageLoader } from '@/components/ui/loader';

interface DashboardMetrics {
  totalUsers: number;
  activeUsers: number;
  totalRevenue: number;
  totalTransactions: number;
  pxlInCirculation: number;
  averageOrderValue: number;
  userGrowth: number;
  revenueGrowth: number;
}

interface TierDistribution {
  starter: number;
  rising: number;
  pro: number;
  pixlbeast: number;
  pixlionaire: number;
}

export default function AdminDashboardPage() {
  const { platformUser } = useAuth();
  const { currencyData, loading: rateLoading } = usePXLCurrency();
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalUsers: 0,
    activeUsers: 0,
    totalRevenue: 0,
    totalTransactions: 0,
    pxlInCirculation: 0,
    averageOrderValue: 0,
    userGrowth: 0,
    revenueGrowth: 0,
  });
  const [tierDistribution, setTierDistribution] = useState<TierDistribution>({
    starter: 0,
    rising: 0,
    pro: 0,
    pixlbeast: 0,
    pixlionaire: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // Load user metrics
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Calculate tier distribution
      const distribution: TierDistribution = {
        starter: 0,
        rising: 0,
        pro: 0,
        pixlbeast: 0,
        pixlionaire: 0,
      };
      
      let totalPXL = 0;
      users.forEach((user: any) => {
        const tier = user.tier?.current || 'starter';
        distribution[tier as keyof TierDistribution]++;
        totalPXL += user.wallets?.pxl?.balance || 0;
      });
      
      // Load transaction metrics
      const transactionsSnapshot = await getDocs(
        query(collection(db, 'transactions'), orderBy('timestamps.created', 'desc'), limit(100))
      );
      
      let totalRevenue = 0;
      let transactionCount = 0;
      
      transactionsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.type === 'giftcard-purchase' && data.status === 'completed') {
          totalRevenue += data.amounts?.usd || 0;
          transactionCount++;
        }
      });
      
      // Calculate active users (users who made transactions in last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const activeUsersQuery = query(
        collection(db, 'transactions'),
        where('timestamps.created', '>=', thirtyDaysAgo)
      );
      const activeUsersSnapshot = await getDocs(activeUsersQuery);
      const uniqueActiveUsers = new Set(activeUsersSnapshot.docs.map(doc => doc.data().userId));
      
      setMetrics({
        totalUsers: users.length,
        activeUsers: uniqueActiveUsers.size,
        totalRevenue,
        totalTransactions: transactionCount,
        pxlInCirculation: totalPXL,
        averageOrderValue: transactionCount > 0 ? totalRevenue / transactionCount : 0,
        userGrowth: 12.5, // Mock data - would calculate from historical data
        revenueGrowth: 18.3, // Mock data - would calculate from historical data
      });
      
      setTierDistribution(distribution);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const adminSections = [
    {
      title: "User Management",
      href: "/admin/users",
      icon: Users,
      description: "Manage users, verify KYC, and handle support",
      color: "text-blue-400"
    },
    {
      title: "Analytics",
      href: "/admin/analytics",
      icon: BarChart3,
      description: "Platform metrics, revenue reports, and insights",
      color: "text-green-400"
    },
    {
      title: "PXL Configuration",
      href: "/admin/pxl-config",
      icon: Settings,
      description: "Exchange rates, tier benefits, and currency settings",
      color: "text-yellow-400"
    },
    {
      title: "Supplier Management",
      href: "/admin/suppliers",
      icon: Package,
      description: "Manage giftcard suppliers and inventory",
      color: "text-purple-400"
    },
    {
      title: "Security & Compliance",
      href: "/admin/security",
      icon: Shield,
      description: "Security monitoring, fraud detection, and compliance",
      color: "text-red-400"
    },
    {
      title: "Platform Settings",
      href: "/admin/settings",
      icon: Settings,
      description: "Global settings, features, and configuration",
      color: "text-gray-400"
    }
  ];

  if (loading || rateLoading) return <FullPageLoader label="Loading admin dashboard" />;

  const currentRate = currencyData?.currentRate || 100;

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">
          Welcome back, {platformUser?.profile.firstName}
        </h2>
        <p className="text-gray-400">
          Here's an overview of your platform's performance
        </p>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Users */}
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <Users className="h-8 w-8 text-blue-400" />
            <span className={`flex items-center text-sm ${metrics.userGrowth >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {metrics.userGrowth >= 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
              {Math.abs(metrics.userGrowth)}%
            </span>
          </div>
          <p className="text-gray-400 text-sm mb-1">Total Users</p>
          <p className="text-2xl font-bold text-white">{metrics.totalUsers.toLocaleString()}</p>
          <p className="text-sm text-gray-500 mt-2">{metrics.activeUsers} active this month</p>
        </div>

        {/* Revenue */}
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <DollarSign className="h-8 w-8 text-green-400" />
            <span className={`flex items-center text-sm ${metrics.revenueGrowth >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {metrics.revenueGrowth >= 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
              {Math.abs(metrics.revenueGrowth)}%
            </span>
          </div>
          <p className="text-gray-400 text-sm mb-1">Total Revenue</p>
          <p className="text-2xl font-bold text-white">${metrics.totalRevenue.toLocaleString()}</p>
          <p className="text-sm text-gray-500 mt-2">Avg order: ${metrics.averageOrderValue.toFixed(2)}</p>
        </div>

        {/* PXL in Circulation */}
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <TrendingUp className="h-8 w-8 text-yellow-400" />
            <span className="text-sm text-gray-400">1 USD = {currentRate.toFixed(0)} PXL</span>
          </div>
          <p className="text-gray-400 text-sm mb-1">PXL in Circulation</p>
          <p className="text-2xl font-bold text-white flex items-center gap-2">
            <span>PXL</span>
            <span>{metrics.pxlInCirculation.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
          </p>
          <p className="text-sm text-gray-500 mt-2">≈ ${(metrics.pxlInCirculation / currentRate).toLocaleString('en-US', { maximumFractionDigits: 0 })} USD</p>
        </div>

        {/* Transactions */}
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <ShoppingBag className="h-8 w-8 text-purple-400" />
            <Activity className="h-4 w-4 text-gray-400" />
          </div>
          <p className="text-gray-400 text-sm mb-1">Total Transactions</p>
          <p className="text-2xl font-bold text-white">{metrics.totalTransactions.toLocaleString()}</p>
          <p className="text-sm text-gray-500 mt-2">Giftcard purchases</p>
        </div>
      </div>

      {/* Tier Distribution */}
      <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
        <h3 className="text-lg font-semibold text-white mb-4">User Tier Distribution</h3>
        <div className="space-y-3">
          {Object.entries(tierDistribution).map(([tier, count]) => {
            const percentage = metrics.totalUsers > 0 ? (count / metrics.totalUsers) * 100 : 0;
            return (
              <div key={tier} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${
                    tier === 'starter' ? 'bg-gray-400' :
                    tier === 'rising' ? 'bg-blue-400' :
                    tier === 'pro' ? 'bg-green-400' :
                    tier === 'pixlbeast' ? 'bg-amber-400' :
                    'bg-purple-400'
                  }`} />
                  <span className="text-sm text-gray-300 capitalize">{tier}</span>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="w-32 bg-gray-800 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        tier === 'starter' ? 'bg-gray-400' :
                        tier === 'rising' ? 'bg-blue-400' :
                        tier === 'pro' ? 'bg-green-400' :
                        tier === 'pixlbeast' ? 'bg-amber-400' :
                        'bg-purple-400'
                      } ${
                        percentage === 0 ? 'w-0' :
                        percentage <= 10 ? 'w-1/12' :
                        percentage <= 20 ? 'w-1/6' :
                        percentage <= 25 ? 'w-1/4' :
                        percentage <= 33 ? 'w-1/3' :
                        percentage <= 40 ? 'w-2/5' :
                        percentage <= 50 ? 'w-1/2' :
                        percentage <= 60 ? 'w-3/5' :
                        percentage <= 66 ? 'w-2/3' :
                        percentage <= 75 ? 'w-3/4' :
                        percentage <= 80 ? 'w-4/5' :
                        percentage <= 90 ? 'w-11/12' :
                        'w-full'
                      }`}
                    />
                  </div>
                  <span className="text-sm text-gray-400 w-16 text-right">{count} users</span>
                  <span className="text-sm text-gray-500 w-12 text-right">{percentage.toFixed(1)}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Admin Sections Grid */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Admin Tools</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {adminSections.map((section) => (
            <Link
              key={section.href}
              href={section.href}
              className="bg-gray-900 rounded-xl p-6 border border-gray-800 hover:border-gray-700 transition-all group"
            >
              <div className="flex items-start space-x-4">
                <section.icon className={`h-8 w-8 ${section.color} group-hover:scale-110 transition-transform`} />
                <div className="flex-1">
                  <h4 className="text-base font-medium text-white mb-1">{section.title}</h4>
                  <p className="text-sm text-gray-400">{section.description}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
