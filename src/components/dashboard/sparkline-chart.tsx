'use client';

import React, { useState, useRef, useCallback, useMemo } from 'react';

// BUG FIX: 2025-08-27 - Sparkline hook order and stability
// Problem: Hooks (useMemo/useCallback) were called conditionally due to early return when data was empty; tooltip and path generation could crash on <2 points; linter flagged unstable deps and inline styles.
// Solution: Introduced noData flag and moved early return after hook declarations; memoized padding and allData; guarded path generation for short datasets; stabilized getX with useCallback; minimized inline styles for tooltip positioning.
// Impact: Component compiles cleanly, avoids runtime crashes, tooltip works, and lint errors about hook order are resolved (one non-blocking inline-style warning remains for dynamic left positioning).

interface SparklineChartProps {
  data: number[];
  previousData?: number[];
  currentValue: number;
  changePercent: number;
  height?: number;
  currency?: string;
}

export const SparklineChart: React.FC<SparklineChartProps> = ({
  data,
  previousData,
  currentValue,
  changePercent,
  height = 180,
  currency = 'PXL',
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);
  const noData = data.length === 0;

  const padding = useMemo(() => ({ top: 20, right: 60, bottom: 40, left: 20 }), []);
  const width = 960; // Internal coordinate system width for 48:9 ratio
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Calculate min/max for scaling with some padding
  const allData = useMemo(() => [...data, ...(previousData || [])], [data, previousData]);
  const dataMin = allData.length ? Math.min(...allData) : 0;
  const dataMax = allData.length ? Math.max(...allData) : 1;
  const padding_percent = 0.1;
  const range = dataMax - dataMin;
  const min = dataMin - range * padding_percent;
  const max = dataMax + range * padding_percent;
  const adjustedRange = max - min || 1;

  // Helper functions for coordinates
  const getX = useCallback((index: number) => {
    return padding.left + (index / (data.length - 1)) * chartWidth;
  }, [padding.left, chartWidth, data.length]);

  const getY = (value: number) => {
    return padding.top + chartHeight - ((value - min) / adjustedRange) * chartHeight;
  };

  // Generate smooth path using bezier curves
  const generateSmoothPath = (values: number[]) => {
    if (values.length < 2) return '';
    
    let path = `M ${getX(0)} ${getY(values[0])}`;
    
    for (let i = 0; i < values.length - 1; i++) {
      const x0 = getX(i);
      const y0 = getY(values[i]);
      const x1 = getX(i + 1);
      const y1 = getY(values[i + 1]);
      
      const mx = (x0 + x1) / 2;
      const my = (y0 + y1) / 2;
      const cp1x = (x0 + mx) / 2;
      const cp2x = (mx + x1) / 2;
      
      path += ` Q ${cp1x} ${y0}, ${mx} ${my} Q ${cp2x} ${y1}, ${x1} ${y1}`;
    }
    
    return path;
  };

  // Generate gradient area path
  const generateAreaPath = (values: number[]) => {
    const linePath = generateSmoothPath(values);
    return `${linePath} L ${getX(values.length - 1)} ${height - padding.bottom} L ${getX(0)} ${height - padding.bottom} Z`;
  };

  const hasLine = data.length >= 2;
  const currentPath = hasLine ? generateSmoothPath(data) : '';
  const currentAreaPath = hasLine ? generateAreaPath(data) : '';
  const previousPath = previousData ? generateSmoothPath(previousData) : '';

  // Calculate Y-axis labels (5 points)
  const yAxisLabels = useMemo(() => {
    const step = adjustedRange / 4;
    return Array.from({ length: 5 }, (_, i) => {
      const value = min + (step * i);
      return {
        value,
        y: padding.top + chartHeight - (i * chartHeight / 4),
        label: value.toFixed(0)
      };
    });
  }, [min, adjustedRange, chartHeight, padding]);

  // Handle mouse events
  const handleMouseMove = useCallback((event: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;

    const rect = svg.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const scaleX = width / rect.width;
    const scaledX = x * scaleX;

    // Find closest data point
    let closestIndex = 0;
    let minDistance = Infinity;

    data.forEach((_, index) => {
      const pointX = getX(index);
      const distance = Math.abs(pointX - scaledX);
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = index;
      }
    });

    setHoveredPoint(closestIndex);
  }, [data, getX]);

  const handleMouseLeave = useCallback(() => {
    setHoveredPoint(null);
  }, []);

  // Time labels
  const timeLabels = ['0:59PM', '11:59PM', '10:59AM', '1:59AM', '2:59AM', '3:59AM', '4:59AM'];

  if (noData) {
    return <div className="flex items-center justify-center h-full text-gray-500">No data available</div>;
  }

  return (
    <div className="relative bg-gray-900/50 border border-gray-800 rounded-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-medium text-white">PXL to USD Exchange Rate</h3>
          <div className="flex items-baseline gap-3 mt-1">
            <span className="text-3xl font-bold text-white">{currentValue.toFixed(2)}</span>
            <span className={`text-sm font-medium ${changePercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {changePercent >= 0 ? '+' : ''}{changePercent.toFixed(2)}% past 1h
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">1 USD = {currentValue.toFixed(2)} PXL</p>
        </div>
        

      </div>

      {/* Chart */}
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        className="w-full cursor-crosshair"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <defs>
          {/* Gradient for area fill */}
          <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
            <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
          </linearGradient>
          

          

        </defs>

        {/* Grid lines */}
        {yAxisLabels.map(({ y }, index) => (
          <line
            key={index}
            x1={padding.left}
            y1={y}
            x2={width - padding.right}
            y2={y}
            stroke="#1f1f1f"
            strokeWidth="1"
            strokeDasharray={index === 0 ? "0" : "4 4"}
            opacity="0.5"
          />
        ))}

        {/* Y-axis labels */}
        {yAxisLabels.map(({ y, label }, index) => (
          <text
            key={index}
            x={width - padding.right + 10}
            y={y + 4}
            fill="#666"
            fontSize="12"
            textAnchor="start"
          >
            {label}
          </text>
        ))}

        {/* Area fill */}
        <path
          d={currentAreaPath}
          fill="url(#areaGradient)"
        />

        {/* Previous period line */}
        {previousPath && (
          <path
            d={previousPath}
            fill="none"
            stroke="#f59e0b"
            strokeWidth="2"
            opacity="0.3"
            strokeDasharray="5 5"
          />
        )}

        {/* Current period line */}
        <path
          d={currentPath}
          fill="none"
          stroke="#0070f3"
          strokeWidth="2"
        />

        {/* Hover indicator */}
        {hoveredPoint !== null && (
          <>
            {/* Vertical line */}
            <line
              x1={getX(hoveredPoint)}
              y1={padding.top}
              x2={getX(hoveredPoint)}
              y2={height - padding.bottom}
              stroke="#666"
              strokeWidth="1"
              strokeDasharray="4 4"
              opacity="0.5"
            />
            {/* Marker circles */}
            <circle cx={getX(hoveredPoint)} cy={getY(data[hoveredPoint])} r="8" fill="#3b82f6" stroke="#fff" strokeWidth="3" />
            <circle cx={getX(hoveredPoint)} cy={getY(data[hoveredPoint])} r="4" fill="#fff" />

            {/* SVG Tooltip */}
            {(() => {
              const tipWidth = 180;
              const tipHeight = 58;
              const x = Math.min(Math.max(getX(hoveredPoint) - tipWidth / 2, padding.left), width - padding.right - tipWidth);
              const y = Math.max(padding.top + 10, getY(data[hoveredPoint]) - tipHeight - 10);
              const label = timeLabels[Math.floor(hoveredPoint / data.length * timeLabels.length)];
              return (
                <g>
                  <rect x={x} y={y} rx={12} ry={12} width={tipWidth} height={tipHeight} fill="#0b0b0b" stroke="#374151" strokeWidth={1} opacity={0.95} />
                  <circle cx={x + 14} cy={y + 16} r={4} fill="#3b82f6" />
                  <text x={x + 24} y={y + 20} fill="#ffffff" fontSize={12} fontWeight={600}>
                    {`${data[hoveredPoint].toFixed(2)} ${currency}`}
                  </text>
                  <text x={x + 14} y={y + 36} fill="#9ca3af" fontSize={11}>
                    {`≈ $${(data[hoveredPoint] / currentValue).toFixed(2)} USD`}
                  </text>
                  <text x={x + 14} y={y + 50} fill="#6b7280" fontSize={10}>
                    {label}
                  </text>
                </g>
              );
            })()}
          </>
        )}

        {/* X-axis labels */}
        {timeLabels.map((label, index) => {
          const x = padding.left + (index / (timeLabels.length - 1)) * chartWidth;
          return (
            <text
              key={index}
              x={x}
              y={height - 20}
              fill="#666"
              fontSize="11"
              textAnchor="middle"
            >
              {label}
            </text>
          );
        })}
      </svg>

      {/* Legend and USD Conversion Info */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-800">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-blue-500"></div>
            <span className="text-xs text-gray-400">Current Period</span>
          </div>
          {previousData && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-0.5 bg-orange-500 opacity-50"></div>
              <span className="text-xs text-gray-400">Previous Period</span>
            </div>
          )}
        </div>
        <div className="text-xs text-gray-500">
          USD Equivalent: ${(1 / currentValue * 1000).toFixed(2)} per 1000 PXL
        </div>
      </div>
    </div>
  );
};