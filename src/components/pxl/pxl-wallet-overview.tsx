"use client";

import * as React from "react";
import { TrendingUp, TrendingDown, DollarSign, Coins } from "lucide-react";
import { formatBalance } from "@/lib/validation";
import { useAuth } from "@/contexts/auth-context";
import { usePXLCurrency } from "@/hooks/use-pxl-currency";

/**
 * PXL Wallet Overview component showing current balances and exchange rates
 */
export function PXLWalletOverview() {
  const { platformUser } = useAuth();
  const { currentRate, trend, currencyData } = usePXLCurrency();
  
  // Calculate rate change from hourly data
  const rateChange = React.useMemo(() => {
    if (!currencyData?.marketData?.hourlyRates || currencyData.marketData.hourlyRates.length < 2) {
      return 0;
    }
    const rates = currencyData.marketData.hourlyRates;
    const latestRate = rates[rates.length - 1].rate;
    const firstRate = rates[0].rate;
    return ((latestRate - firstRate) / firstRate) * 100;
  }, [currencyData]);

  const walletData = {
    pxlBalance: platformUser?.wallets?.pxl?.balance || 0,
    usdBalance: platformUser?.wallets?.usd?.balance || 0,
    currentExchangeRate: currentRate,
    rateChange: rateChange,
    totalEarned: platformUser?.wallets?.pxl?.totalEarned || 0,
    totalSpent: platformUser?.wallets?.pxl?.totalSpent || 0,
    totalSent: platformUser?.wallets?.pxl?.totalSent || 0,
    totalReceived: platformUser?.wallets?.pxl?.totalReceived || 0,
  };

  const usdEquivalent = walletData.pxlBalance / walletData.currentExchangeRate;
  const isRatePositive = walletData.rateChange >= 0;

  return (
    <section className="space-y-4">
      {/* Balance Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* PXL Balance Card */}
        <div className="rounded-xl border border-gray-800 bg-gray-950 p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-800 border border-gray-700">
                <Coins className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">PXL Balance</h3>
                <p className="text-sm text-gray-400">Primary currency</p>
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="text-3xl font-bold text-white">
              PXL {formatBalance(walletData.pxlBalance)}
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-400">
              <span>≈ ${formatBalance(usdEquivalent)} USD</span>
              <div className={`flex items-center space-x-1 ${
                isRatePositive ? 'text-green-400' : 'text-red-400'
              }`}>
                {isRatePositive ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
                <span>{isRatePositive ? '+' : ''}{walletData.rateChange}%</span>
              </div>
            </div>
          </div>

          {/* PXL Stats */}
          <div className="mt-4 grid grid-cols-2 gap-4 pt-3 border-t border-gray-800">
            <div>
              <p className="text-xs text-gray-400">Total Earned</p>
              <p className="text-sm font-medium text-white">
                PXL {formatBalance(walletData.totalEarned)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Total Spent</p>
              <p className="text-sm font-medium text-white">
                PXL {formatBalance(walletData.totalSpent)}
              </p>
            </div>
          </div>
        </div>

        {/* USD Balance Card */}
        <div className="rounded-xl border border-gray-800 bg-gray-950 p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-800 border border-gray-700">
                <DollarSign className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">USD Balance</h3>
                <p className="text-sm text-gray-400">Store credit</p>
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="text-3xl font-bold text-white">
              ${formatBalance(walletData.usdBalance)}
            </div>
            <div className="text-sm text-gray-400">
              Available for purchases
            </div>
          </div>

          {/* Exchange Rate Info */}
          <div className="mt-4 pt-3 border-t border-gray-800">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">Current Rate</span>
              <span className="text-sm font-medium text-white">
                1 USD = {walletData.currentExchangeRate} PXL
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Exchange Rate Summary */}
      <div className="rounded-xl border border-gray-800 bg-gray-950 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">Exchange Rate</h3>
            <p className="text-sm text-gray-400">
              1 USD = {walletData.currentExchangeRate} PXL
            </p>
          </div>
          <div className="text-right">
            <div className={`flex items-center space-x-1 ${
              isRatePositive ? 'text-green-400' : 'text-red-400'
            }`}>
              {isRatePositive ? (
                <TrendingUp className="h-5 w-5" />
              ) : (
                <TrendingDown className="h-5 w-5" />
              )}
              <span className="font-medium">
                {isRatePositive ? '+' : ''}{walletData.rateChange}% past 1h
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Rate updates every minute
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
