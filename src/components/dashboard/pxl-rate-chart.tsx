'use client';

import React, { useState, useMemo } from 'react';
import { usePXLCurrency } from '@/hooks/use-pxl-currency';
import { SparklineChart } from './sparkline-chart';

type TimePeriod = '1H' | '1D' | '7D' | '30D';

interface PXLRateChartProps {
  className?: string;
}

interface EnhancedSparklineChartProps {
  data: number[];
  previousData?: number[];
  currentValue: number;
  changePercent: number;
  height?: number;
  currency?: string;
  timeLabels?: string[];
  selectedPeriod: TimePeriod;
  onPeriodChange: (period: TimePeriod) => void;
}

const EnhancedSparklineChart: React.FC<EnhancedSparklineChartProps> = (props) => {
  const { selectedPeriod, onPeriodChange, timeLabels, ...sparklineProps } = props;
  
  return (
    <div className="relative">
      <SparklineChart {...sparklineProps} />
      
      {/* Custom time period selector */}
      <div className="absolute top-0 right-0">
        <div className="flex gap-1">
          {(['1H', '1D', '7D', '30D'] as TimePeriod[]).map((period) => (
            <button
              key={period}
              onClick={() => onPeriodChange(period)}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                period === selectedPeriod 
                  ? 'bg-gray-800 text-white' 
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              }`}
            >
              {period}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export const PXLRateChart: React.FC<PXLRateChartProps> = ({ className }) => {
  const { currencyData, loading } = usePXLCurrency();
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('1H');

  const { data, previousData, changePercent, timeLabels } = useMemo(() => {
    if (!currencyData?.marketData) {
      return { data: [], previousData: [], changePercent: 0, timeLabels: [] };
    }

    const now = new Date();
    let data: number[] = [];
    let previousData: number[] = [];
    let changePercent = 0;
    let timeLabels: string[] = [];

    switch (selectedPeriod) {
      case '1H':
        // Last hour - use hourly rates (last 60 minutes)
        const hourlyRates = currencyData.marketData.hourlyRates || [];
        if (hourlyRates.length > 0) {
          // Get last 60 data points (1 per minute)
          data = hourlyRates.slice(-60).map(point => point.rate);
          
          // Calculate change from 1 hour ago
          if (data.length >= 2) {
            const oldRate = data[0];
            const currentRate = data[data.length - 1];
            changePercent = ((currentRate - oldRate) / oldRate) * 100;
          }
          
          // Generate time labels for the last hour
          timeLabels = Array.from({ length: 7 }, (_, i) => {
            const time = new Date(now.getTime() - (60 - i * 10) * 60 * 1000);
            return time.toLocaleTimeString('en-US', { 
              hour: 'numeric', 
              minute: '2-digit',
              hour12: true 
            });
          });
        }
        break;

      case '1D':
        // Last 24 hours - use hourly rates
        const last24Hours = currencyData.marketData.hourlyRates?.slice(-24) || [];
        if (last24Hours.length > 0) {
          data = last24Hours.map(point => point.rate);
          
          // Previous period would be the 24 hours before that
          if (currencyData.marketData.hourlyRates.length > 24) {
            previousData = currencyData.marketData.hourlyRates
              .slice(-48, -24)
              .map(point => point.rate);
          }
          
          // Calculate 24h change
          if (data.length >= 2) {
            const oldRate = data[0];
            const currentRate = data[data.length - 1];
            changePercent = ((currentRate - oldRate) / oldRate) * 100;
          }
          
          // Time labels for 24 hours
          timeLabels = Array.from({ length: 7 }, (_, i) => {
            const time = new Date(now.getTime() - (24 - i * 4) * 60 * 60 * 1000);
            return time.toLocaleTimeString('en-US', { 
              hour: 'numeric',
              hour12: true 
            });
          });
        }
        break;

      case '7D':
        // Last 7 days - use daily rates
        const last7Days = currencyData.marketData.dailyRates?.slice(-7) || [];
        if (last7Days.length > 0) {
          // Interpolate to have more data points
          data = [];
          for (let i = 0; i < last7Days.length - 1; i++) {
            const current = last7Days[i].rate;
            const next = last7Days[i + 1].rate;
            // Add the actual point
            data.push(current);
            // Add 3 interpolated points between each day
            for (let j = 1; j <= 3; j++) {
              const ratio = j / 4;
              data.push(current + (next - current) * ratio);
            }
          }
          data.push(last7Days[last7Days.length - 1].rate);
          
          // Calculate 7d change
          if (last7Days.length >= 2) {
            const oldRate = last7Days[0].rate;
            const currentRate = last7Days[last7Days.length - 1].rate;
            changePercent = ((currentRate - oldRate) / oldRate) * 100;
          }
          
          // Day labels
          timeLabels = last7Days.map(point => {
            const date = new Date(point.timestamp);
            return date.toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric' 
            });
          });
        }
        break;

      case '30D':
        // Last 30 days - use daily rates
        const last30Days = currencyData.marketData.dailyRates || [];
        if (last30Days.length > 0) {
          data = last30Days.map(point => point.rate);
          
          // Calculate 30d change
          if (data.length >= 2) {
            const oldRate = data[0];
            const currentRate = data[data.length - 1];
            changePercent = ((currentRate - oldRate) / oldRate) * 100;
          }
          
          // Weekly labels for 30 days
          timeLabels = Array.from({ length: 5 }, (_, i) => {
            const daysAgo = 30 - (i * 7.5);
            const date = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
            return date.toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric' 
            });
          });
        }
        break;
    }

    // If we don't have enough data, generate some placeholder data
    if (data.length === 0) {
      const baseRate = currencyData.currentRate || 100;
      data = Array.from({ length: 60 }, (_, i) => {
        const variation = Math.sin(i / 10) * 2 + Math.random() * 0.5;
        return baseRate + variation;
      });
    }

    return { data, previousData, changePercent, timeLabels };
  }, [currencyData, selectedPeriod]);

  if (loading) {
    return (
      <div className={`bg-gray-900/50 border border-gray-800 rounded-lg p-6 animate-pulse ${className || ''}`}>
        <div className="h-8 w-48 bg-gray-800 rounded mb-4"></div>
        <div className="h-[180px] bg-gray-800 rounded"></div>
      </div>
    );
  }

  const currentRate = currencyData?.currentRate || 100;

  return (
    <div className={className}>
      <EnhancedSparklineChart
        data={data}
        previousData={previousData.length > 0 ? previousData : undefined}
        currentValue={currentRate}
        changePercent={changePercent}
        height={180}
        currency="PXL"
        timeLabels={timeLabels}
        selectedPeriod={selectedPeriod}
        onPeriodChange={setSelectedPeriod}
      />
    </div>
  );
};
