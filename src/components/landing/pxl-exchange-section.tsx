"use client";

import * as React from "react";
import { TrendingUp, TrendingDown } from "lucide-react";

/**
 * PXL Exchange Rate section with interactive chart
 * Matches the screenshot layout exactly
 */
export function PXLExchangeSection() {
  const [selectedPeriod, setSelectedPeriod] = React.useState("1H");
  const periods = ["1H", "1D", "7D", "30D"];

  // Realistic chart data with proper market movement
  const chartData = {
    current: [
      { x: 0, y: 0.01002, time: "6:09 PM" },
      { x: 8.33, y: 0.01001, time: "6:14 PM" },
      { x: 16.67, y: 0.01003, time: "6:19 PM" },
      { x: 25, y: 0.01004, time: "6:24 PM" },
      { x: 33.33, y: 0.01002, time: "6:29 PM" },
      { x: 41.67, y: 0.01001, time: "6:34 PM" },
      { x: 50, y: 0.00999, time: "6:39 PM" },
      { x: 58.33, y: 0.00998, time: "6:44 PM" },
      { x: 66.67, y: 0.00997, time: "6:49 PM" },
      { x: 75, y: 0.00999, time: "6:54 PM" },
      { x: 83.33, y: 0.01000, time: "6:59 PM" },
      { x: 91.67, y: 0.00999, time: "7:04 PM" },
      { x: 100, y: 0.01000, time: "7:09 PM" },
    ],
    previous: [
      { x: 0, y: 0.01005, time: "5:09 PM" },
      { x: 8.33, y: 0.01007, time: "5:14 PM" },
      { x: 16.67, y: 0.01009, time: "5:19 PM" },
      { x: 25, y: 0.01008, time: "5:24 PM" },
      { x: 33.33, y: 0.01006, time: "5:29 PM" },
      { x: 41.67, y: 0.01004, time: "5:34 PM" },
      { x: 50, y: 0.01003, time: "5:39 PM" },
      { x: 58.33, y: 0.01005, time: "5:44 PM" },
      { x: 66.67, y: 0.01007, time: "5:49 PM" },
      { x: 75, y: 0.01006, time: "5:54 PM" },
      { x: 83.33, y: 0.01004, time: "5:59 PM" },
      { x: 91.67, y: 0.01003, time: "6:04 PM" },
      { x: 100, y: 0.01002, time: "6:09 PM" },
    ]
  };

  // Convert data points to smooth SVG path with proper scaling
  const createPath = (data: typeof chartData.current) => {
    const width = 800;
    const height = 160;
    const padding = 0; // Remove padding so lines extend to edges
    
    // Calculate dynamic Y range based on actual data
    const allYValues = [...chartData.current, ...chartData.previous].map(d => d.y);
    const minY = Math.min(...allYValues) - 0.00005;
    const maxY = Math.max(...allYValues) + 0.00005;
    
    // Create smooth curve using quadratic bezier curves
    let path = '';
    
    data.forEach((point, index) => {
      const x = (point.x / 100) * width;
      const y = height - ((point.y - minY) / (maxY - minY)) * height;
      
      if (index === 0) {
        path += `M ${x} ${y}`;
      } else {
        // Create smooth curve to next point
        const prevPoint = data[index - 1];
        const prevX = (prevPoint.x / 100) * width;
        const prevY = height - ((prevPoint.y - minY) / (maxY - minY)) * height;
        
        const cpX = (prevX + x) / 2;
        path += ` Q ${cpX} ${prevY} ${x} ${y}`;
      }
    });
    
    return path;
  };

  return (
    <section className="py-1 sm:py-2">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Integrated Chart Container with All Info */}
        <div className="relative bg-gray-950 rounded-lg border border-gray-800 p-4 mb-6">
          {/* Header Section */}
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">
                PXL to USD Exchange Rate
              </h2>
              <div className="flex items-center space-x-4 mb-4 lg:mb-0">
                <div className="flex items-center">
                  <span className="text-sm text-gray-400 mr-2">Current Rate:</span>
                  <span className="text-white font-semibold text-lg">1 PXL = $0.01000 USD</span>
                </div>
                <div className="flex items-center text-red-400 text-sm">
                  <TrendingDown className="h-4 w-4 mr-1" />
                  <span>-0.10% past 1h</span>
                </div>
              </div>
            </div>
            
            {/* Time Period Selector */}
            <div className="flex rounded-lg border border-gray-700 bg-gray-900 p-1">
              {periods.map((period) => (
                <button
                  key={period}
                  onClick={() => setSelectedPeriod(period)}
                  className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                    selectedPeriod === period
                      ? "bg-white text-black font-medium"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  {period}
                </button>
              ))}
            </div>
          </div>

          {/* Chart Legend */}
          <div className="flex flex-wrap items-center gap-6 mb-4">
            <div className="flex items-center">
              <div className="w-4 h-0.5 bg-blue-400 mr-2"></div>
              <span className="text-sm text-gray-400">Current Rate</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-0.5 bg-orange-400 mr-2 border-dashed border-t-2 border-orange-400"></div>
              <span className="text-sm text-gray-400">Previous Period</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-3 bg-blue-500/20 rounded-sm mr-2"></div>
              <span className="text-sm text-gray-400">Price Area</span>
            </div>
            <div className="flex items-center ml-auto">
              <TrendingUp className="h-4 w-4 mr-1 text-gray-500" />
              <span className="text-sm text-gray-400">1 USD = 100.00 PXL</span>
            </div>
          </div>
          {/* Enhanced Chart Area */}
          <div className="relative">
            {/* Y-axis labels - Compact with proper spacing */}
            <div className="absolute left-0 top-2 bottom-2 flex flex-col justify-between text-xs text-gray-500 w-12">
              <span>$0.01010</span>
              <span>$0.01005</span>
              <span>$0.01000</span>
              <span>$0.00995</span>
              <span>$0.00990</span>
            </div>

            {/* Chart SVG - Wide but with small left margin */}
            <div className="ml-12 mr-2">
              <svg
                width="100%"
                height="160"
                viewBox="0 0 800 160"
                className="overflow-visible"
              >
                {/* Enhanced Grid */}
                <defs>
                  <pattern id="grid" width="100" height="48" patternUnits="userSpaceOnUse">
                    <path d="M 100 0 L 0 0 0 48" fill="none" stroke="#374151" strokeWidth="0.5" opacity="0.2"/>
                  </pattern>
                  <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.15"/>
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.02"/>
                  </linearGradient>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />

                {/* Enhanced Price area fill */}
                <path
                  d={`${createPath(chartData.current)} L 800 160 L 0 160 Z`}
                  fill="url(#areaGradient)"
                  stroke="none"
                />

                {/* Previous period line with better styling */}
                <path
                  d={createPath(chartData.previous)}
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="2.5"
                  strokeDasharray="5,5"
                  opacity="0.8"
                />

                {/* Current rate line with glow effect */}
                <path
                  d={createPath(chartData.current)}
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="3"
                  filter="drop-shadow(0 0 4px rgba(59, 130, 246, 0.5))"
                />

                {/* Data points */}
                {chartData.current.map((point, index) => {
                  const width = 800;
                  const height = 160;
                  const allYValues = [...chartData.current, ...chartData.previous].map(d => d.y);
                  const minY = Math.min(...allYValues) - 0.00005;
                  const maxY = Math.max(...allYValues) + 0.00005;
                  
                  const x = (point.x / 100) * width;
                  const y = height - ((point.y - minY) / (maxY - minY)) * height;
                  
                  return (
                    <circle
                      key={index}
                      cx={x}
                      cy={y}
                      r="3"
                      fill="#3b82f6"
                      opacity="0.8"
                      className="hover:opacity-100 hover:r-4 transition-all cursor-pointer"
                    />
                  );
                })}
              </svg>
            </div>

            {/* X-axis labels */}
            <div className="ml-12 mr-2 flex justify-between text-xs text-gray-500 mt-3 px-2">
              <span>6:09 PM</span>
              <span>6:39 PM</span>
              <span>7:09 PM</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
