"use client";

import React, { useState, useEffect } from "react";
import { 
  TrendingUp, 
  Save, 
  RefreshCw,
  AlertTriangle,
  Info,
  DollarSign,
  Percent,
  Users
} from "lucide-react";
import { doc, updateDoc, Timestamp } from "firebase/firestore";
import { usePXLCurrency } from "@/hooks/use-pxl-currency";
import { db } from "@/lib/firebase-config";
import { formatPXL } from "@/lib/pxl-currency";

interface TierConfig {
  threshold: number;
  discountPercentage: number;
  cashbackPercentage: number;
}

interface TierConfigs {
  starter: TierConfig;
  rising: TierConfig;
  pro: TierConfig;
  pixlbeast: TierConfig;
  pixlionaire: TierConfig;
}

export default function PXLConfigPage() {
  const { currencyData, loading: rateLoading } = usePXLCurrency();
  const [exchangeRate, setExchangeRate] = useState(100);
  const [tierConfigs, setTierConfigs] = useState<TierConfigs>({
    starter: { threshold: 0, discountPercentage: 0, cashbackPercentage: 0 },
    rising: { threshold: 1000, discountPercentage: 5, cashbackPercentage: 1 },
    pro: { threshold: 5000, discountPercentage: 8, cashbackPercentage: 2 },
    pixlbeast: { threshold: 10000, discountPercentage: 10, cashbackPercentage: 3 },
    pixlionaire: { threshold: 50000, discountPercentage: 13, cashbackPercentage: 3 },
  });
  const [saving, setSaving] = useState(false);
  const [rateHistory, setRateHistory] = useState<number[]>([]);
  const [showImpactSimulation, setShowImpactSimulation] = useState(false);
  const [simulatedRate, setSimulatedRate] = useState(100);

  useEffect(() => {
    if (currencyData) {
      setExchangeRate(currencyData.currentRate);
      
      // Set tier configs from currency data if available
      if (currencyData.tierMultipliers) {
        const configs: TierConfigs = {
          starter: {
            threshold: 0,
            discountPercentage: (currencyData.tierMultipliers.starter?.discountPercentage || 0) * 100,
            cashbackPercentage: (currencyData.tierMultipliers.starter?.cashbackPercentage || 0) * 100,
          },
          rising: {
            threshold: 1000,
            discountPercentage: (currencyData.tierMultipliers.rising?.discountPercentage || 0.05) * 100,
            cashbackPercentage: (currencyData.tierMultipliers.rising?.cashbackPercentage || 0.01) * 100,
          },
          pro: {
            threshold: 5000,
            discountPercentage: (currencyData.tierMultipliers.pro?.discountPercentage || 0.08) * 100,
            cashbackPercentage: (currencyData.tierMultipliers.pro?.cashbackPercentage || 0.02) * 100,
          },
          pixlbeast: {
            threshold: 10000,
            discountPercentage: (currencyData.tierMultipliers.pixlbeast?.discountPercentage || 0.10) * 100,
            cashbackPercentage: (currencyData.tierMultipliers.pixlbeast?.cashbackPercentage || 0.03) * 100,
          },
          pixlionaire: {
            threshold: 50000,
            discountPercentage: (currencyData.tierMultipliers.pixlionaire?.discountPercentage || 0.13) * 100,
            cashbackPercentage: (currencyData.tierMultipliers.pixlionaire?.cashbackPercentage || 0.03) * 100,
          },
        };
        setTierConfigs(configs);
      }

      // Generate rate history
      const history = currencyData.marketData?.hourlyRates?.map(r => r.rate) || [];
      setRateHistory(history);
    }
  }, [currencyData]);

  const handleRateUpdate = async () => {
    if (!confirm('Are you sure you want to update the exchange rate? This will affect all users immediately.')) {
      return;
    }

    setSaving(true);
    try {
      await updateDoc(doc(db, 'pxl-currency', 'main'), {
        currentRate: exchangeRate,
        lastUpdated: Timestamp.now(),
      });
      
      alert('Exchange rate updated successfully! Changes will reflect shortly.');
    } catch (error) {
      console.error('Error updating exchange rate:', error);
      alert('Failed to update exchange rate');
    } finally {
      setSaving(false);
    }
  };

  const handleTierConfigUpdate = async () => {
    if (!confirm('Are you sure you want to update tier configurations? This will affect all users immediately.')) {
      return;
    }

    setSaving(true);
    try {
      const tierMultipliers = {
        starter: {
          discountPercentage: tierConfigs.starter.discountPercentage / 100,
          cashbackPercentage: tierConfigs.starter.cashbackPercentage / 100,
        },
        rising: {
          discountPercentage: tierConfigs.rising.discountPercentage / 100,
          cashbackPercentage: tierConfigs.rising.cashbackPercentage / 100,
        },
        pro: {
          discountPercentage: tierConfigs.pro.discountPercentage / 100,
          cashbackPercentage: tierConfigs.pro.cashbackPercentage / 100,
        },
        pixlbeast: {
          discountPercentage: tierConfigs.pixlbeast.discountPercentage / 100,
          cashbackPercentage: tierConfigs.pixlbeast.cashbackPercentage / 100,
        },
        pixlionaire: {
          discountPercentage: tierConfigs.pixlionaire.discountPercentage / 100,
          cashbackPercentage: tierConfigs.pixlionaire.cashbackPercentage / 100,
        },
      };

      await updateDoc(doc(db, 'pxl-currency', 'main'), {
        tierMultipliers,
        lastUpdated: Timestamp.now(),
      });
      
      alert('Tier configurations updated successfully! Changes will reflect shortly.');
    } catch (error) {
      console.error('Error updating tier configs:', error);
      alert('Failed to update tier configurations');
    } finally {
      setSaving(false);
    }
  };

  const calculateImpact = (rate: number) => {
    const usdAmount = 100;
    const pxlAmount = usdAmount * rate;
    return {
      rate,
      pxlAmount,
      percentChange: ((rate - (currencyData?.currentRate || 100)) / (currencyData?.currentRate || 100)) * 100,
    };
  };

  if (rateLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">PXL Configuration</h2>
        <p className="text-gray-400">
          Manage exchange rates, tier benefits, and currency settings
        </p>
      </div>

      {/* Exchange Rate Configuration */}
      <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <TrendingUp className="h-6 w-6 text-yellow-400" />
            <h3 className="text-lg font-semibold text-white">Exchange Rate</h3>
          </div>
          <button
            onClick={() => setShowImpactSimulation(!showImpactSimulation)}
            className="text-sm text-gray-400 hover:text-white flex items-center space-x-1"
          >
            <Info className="h-4 w-4" />
            <span>Impact Simulation</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Current Rate */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Current Exchange Rate
            </label>
            <div className="flex items-center space-x-3">
              <div className="flex-1">
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <input
                    type="number"
                    value={exchangeRate}
                    onChange={(e) => setExchangeRate(Number(e.target.value))}
                    className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-gray-600"
                    min="1"
                    step="0.1"
                    aria-label="Exchange rate value"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">1 USD = {exchangeRate} PXL</p>
              </div>
              <button
                onClick={handleRateUpdate}
                disabled={saving}
                className="px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 rounded-lg transition-colors flex items-center space-x-2"
              >
                {saving ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                <span className="text-sm font-medium">Update</span>
              </button>
            </div>
          </div>

          {/* Rate Statistics */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Rate Statistics
            </label>
            <div className="bg-gray-800 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">24h High</span>
                <span className="text-white">{Math.max(...(rateHistory.slice(-24) || [exchangeRate]))}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">24h Low</span>
                <span className="text-white">{Math.min(...(rateHistory.slice(-24) || [exchangeRate]))}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Volatility</span>
                <span className="text-white">{currencyData?.marketData?.volatility?.toFixed(2) || 0}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Impact Simulation */}
        {showImpactSimulation && (
          <div className="mt-6 p-4 bg-gray-800 rounded-lg">
            <h4 className="text-sm font-medium text-gray-300 mb-3">Rate Change Impact Simulation</h4>
            <div className="space-y-2">
              <input
                type="range"
                min="50"
                max="200"
                value={simulatedRate}
                onChange={(e) => setSimulatedRate(Number(e.target.value))}
                className="w-full"
                aria-label="Simulated exchange rate"
              />
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Simulated Rate: 1 USD = {simulatedRate} PXL</span>
                <span className={`font-medium ${calculateImpact(simulatedRate).percentChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {calculateImpact(simulatedRate).percentChange >= 0 ? '+' : ''}{calculateImpact(simulatedRate).percentChange.toFixed(2)}%
                </span>
              </div>
              <div className="text-xs text-gray-500">
                $100 would buy {formatPXL(calculateImpact(simulatedRate).pxlAmount)} instead of {formatPXL(100 * (currencyData?.currentRate || 100))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tier Configuration */}
      <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Users className="h-6 w-6 text-purple-400" />
            <h3 className="text-lg font-semibold text-white">Tier Benefits Configuration</h3>
          </div>
          <button
            onClick={handleTierConfigUpdate}
            disabled={saving}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 rounded-lg transition-colors flex items-center space-x-2"
          >
            {saving ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            <span className="text-sm font-medium">Save All Changes</span>
          </button>
        </div>

        <div className="space-y-4">
          {Object.entries(tierConfigs).map(([tier, config]) => (
            <div key={tier} className="border border-gray-800 rounded-lg p-4">
              <h4 className="text-base font-medium text-white capitalize mb-3">{tier} Tier</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Balance Threshold */}
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">
                    Balance Threshold
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={config.threshold}
                      onChange={(e) => setTierConfigs({
                        ...tierConfigs,
                        [tier]: { ...config, threshold: Number(e.target.value) }
                      })}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-gray-600"
                      min="0"
                      disabled={tier === 'starter'}
                      aria-label={`${tier} tier balance threshold`}
                    />
                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-gray-500">PXL</span>
                  </div>
                </div>

                {/* Discount Percentage */}
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">
                    Discount %
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={config.discountPercentage}
                      onChange={(e) => setTierConfigs({
                        ...tierConfigs,
                        [tier]: { ...config, discountPercentage: Number(e.target.value) }
                      })}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-gray-600"
                      min="0"
                      max="100"
                      step="0.1"
                      aria-label={`${tier} tier discount percentage`}
                    />
                    <Percent className="absolute right-3 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-500" />
                  </div>
                </div>

                {/* Cashback Percentage */}
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">
                    Cashback %
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={config.cashbackPercentage}
                      onChange={(e) => setTierConfigs({
                        ...tierConfigs,
                        [tier]: { ...config, cashbackPercentage: Number(e.target.value) }
                      })}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-gray-600"
                      min="0"
                      max="100"
                      step="0.1"
                      aria-label={`${tier} tier cashback percentage`}
                    />
                    <Percent className="absolute right-3 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-500" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Warning */}
        <div className="mt-6 p-4 bg-yellow-900/20 border border-yellow-800 rounded-lg">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="text-yellow-300 font-medium">Important Notice</p>
              <p className="text-yellow-200/80 mt-1">
                Changes to tier benefits will take effect immediately for all users. This may impact revenue and user satisfaction. 
                Consider running A/B tests before making significant changes.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
