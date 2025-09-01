"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function TestLogoDevPage() {
  const [results, setResults] = useState<any[]>([]);
  const [testing, setTesting] = useState(false);
  
  const API_KEY = 'sk_Zu-9DX46SHyeZNnOLDBcRw';
  
  const testBrands = [
    { brand: 'Amazon', domain: 'amazon.com' },
    { brand: 'Apple', domain: 'apple.com' },
    { brand: 'Netflix', domain: 'netflix.com' },
    { brand: 'Spotify', domain: 'spotify.com' },
    { brand: 'Starbucks', domain: 'starbucks.com' }
  ];

  const testLogoUrls = async () => {
    setTesting(true);
    const newResults = [];
    
    for (const { brand, domain } of testBrands) {
      const url = `https://img.logo.dev/${domain}?token=${API_KEY}&size=200&format=png`;
      
      try {
        // Test if URL works
        const response = await fetch(url);
        const success = response.ok;
        
        newResults.push({
          brand,
          domain,
          url,
          status: response.status,
          success,
          message: success ? 'Logo available' : `Error: ${response.status}`
        });
      } catch (error) {
        newResults.push({
          brand,
          domain,
          url,
          success: false,
          message: `Network error: ${error}`
        });
      }
    }
    
    setResults(newResults);
    setTesting(false);
  };

  return (
    <div className="min-h-screen bg-black p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-4">Logo.dev API Test</h1>
        <p className="text-gray-400 mb-8">Testing API key: {API_KEY}</p>
        
        <Button 
          onClick={testLogoUrls}
          disabled={testing}
          className="mb-8"
        >
          {testing ? 'Testing...' : 'Test Logo URLs'}
        </Button>
        
        {results.length > 0 && (
          <Card className="bg-gray-900 border-gray-800 p-6">
            <h2 className="text-xl font-bold text-white mb-4">Test Results</h2>
            <div className="space-y-4">
              {results.map((result, index) => (
                <div key={index} className="border border-gray-700 p-4 rounded">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white font-semibold">{result.brand}</span>
                    <span className={result.success ? 'text-green-400' : 'text-red-400'}>
                      {result.message}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mb-2">{result.url}</div>
                  {result.success && (
                    <div className="mt-2">
                      <img 
                        src={result.url} 
                        alt={result.brand}
                        className="h-20 bg-white p-2 rounded"
                        crossOrigin="anonymous"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}
        
        <Card className="bg-gray-900 border-gray-800 p-6 mt-8">
          <h2 className="text-xl font-bold text-white mb-4">Direct Logo Test</h2>
          <p className="text-gray-400 mb-4">Testing Amazon logo directly:</p>
          <div className="bg-white p-4 rounded">
            <img 
              src={`https://img.logo.dev/amazon.com?token=${API_KEY}&size=200&format=png`}
              alt="Amazon Logo Test"
              className="h-20"
              crossOrigin="anonymous"
              onError={(e) => {
                console.error('Image failed to load:', e);
                (e.target as HTMLImageElement).alt = 'Failed to load';
              }}
              onLoad={() => console.log('Amazon logo loaded successfully')}
            />
          </div>
        </Card>
      </div>
    </div>
  );
}