"use client";

import React, { useEffect, useState } from 'react';
import { db } from '@/lib/firebase-config';
import { collection, getDocs, query, where, limit } from 'firebase/firestore';

export default function TestMarketplace() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProducts() {
      try {
        const q = query(
          collection(db, 'products'),
          where('status', '==', 'active'),
          limit(5)
        );
        
        const snapshot = await getDocs(q);
        const prods = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        console.log('Fetched products:', prods);
        setProducts(prods);
      } catch (error) {
        console.error('Error fetching:', error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchProducts();
  }, []);

  if (loading) return <div className="p-8 text-white">Loading...</div>;

  return (
    <div className="min-h-screen bg-black p-8">
      <h1 className="text-2xl font-bold text-white mb-8">Test Marketplace - Raw Data</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map(product => (
          <div key={product.id} className="bg-gray-900 rounded-lg overflow-hidden">
            {/* Always try to show artwork */}
            <div className="h-48 bg-gray-800 relative">
              {product.artwork_url ? (
                <>
                  <img 
                    src={product.artwork_url}
                    alt={product.brand}
                    className="w-full h-full object-cover"
                    onLoad={() => console.log(`✓ Loaded artwork for ${product.brand}`)}
                    onError={(e) => {
                      console.error(`✗ Failed to load artwork for ${product.brand}:`, product.artwork_url);
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-black/50 p-2">
                    <p className="text-xs text-green-400">Has artwork_url</p>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <p className="text-4xl text-gray-600 mb-2">{product.brand?.charAt(0)}</p>
                    <p className="text-xs text-red-400">No artwork_url</p>
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-4">
              <h3 className="text-white font-bold">{product.brand}</h3>
              <p className="text-gray-400 text-sm">{product.name}</p>
              
              {/* Debug info */}
              <div className="mt-4 p-2 bg-gray-800 rounded text-xs font-mono">
                <p className="text-gray-400">Debug Info:</p>
                <p className="text-white">artwork_url: {product.artwork_url ? '✓' : '✗'}</p>
                <p className="text-white">status: {product.status}</p>
                <p className="text-white">category: {product.category}</p>
                {product.artwork_url && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-blue-400">Show URL</summary>
                    <p className="text-gray-300 break-all mt-1">{product.artwork_url}</p>
                  </details>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Raw JSON for debugging */}
      <details className="mt-8">
        <summary className="cursor-pointer text-white bg-gray-800 p-4 rounded">Show Raw JSON</summary>
        <pre className="mt-4 p-4 bg-gray-900 text-gray-300 rounded overflow-auto text-xs">
          {JSON.stringify(products, null, 2)}
        </pre>
      </details>
    </div>
  );
}