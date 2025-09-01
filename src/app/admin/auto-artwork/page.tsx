"use client";

import React, { useState, useEffect } from "react";
import { db, storage } from "@/lib/firebase-config";
import { collection, getDocs, updateDoc, doc, addDoc, query, where, Timestamp } from "firebase/firestore";
import { ref, uploadString, getDownloadURL } from "firebase/storage";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Palette, Upload, CheckCircle, XCircle, Loader2, Image as ImageIcon, Zap } from "lucide-react";

interface Product {
  id: string;
  name: string;
  brand: string;
  category: string;
  logo_url?: string;
  artwork_url?: string;
  bg_color?: string;
}

interface GenerationResult {
  productId: string;
  productName: string;
  success: boolean;
  artworkUrl?: string;
  error?: string;
}

export default function AutoArtworkPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState<GenerationResult[]>([]);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const snapshot = await getDocs(collection(db, "products"));
      const productList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Product));
      setProducts(productList);
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateArtworkForProduct = async (product: Product): Promise<string> => {
    // Create a canvas element for generating artwork
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) throw new Error('Could not get canvas context');

    // Generate background gradient based on product category
    const gradients: Record<string, string[]> = {
      'Gaming': ['#6366f1', '#a855f7'],
      'Entertainment': ['#ec4899', '#f43f5e'],
      'Shopping': ['#f59e0b', '#eab308'],
      'Food & Dining': ['#ef4444', '#f97316'],
      'Travel': ['#06b6d4', '#0ea5e9'],
      'Technology': ['#3b82f6', '#6366f1'],
      'Fashion': ['#d946ef', '#ec4899'],
      'Sports': ['#10b981', '#22c55e'],
      'Music': ['#8b5cf6', '#a855f7'],
      'Other': ['#64748b', '#94a3b8']
    };

    const categoryColors = gradients[product.category] || gradients['Other'];
    
    // Create gradient
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, categoryColors[0]);
    gradient.addColorStop(1, categoryColors[1]);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Add pattern overlay
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    for (let i = 0; i < 20; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const size = Math.random() * 100 + 50;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }

    // Add brand name
    ctx.fillStyle = 'white';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 10;
    ctx.fillText(product.brand.toUpperCase(), canvas.width / 2, canvas.height / 2 - 30);

    // Add product category
    ctx.font = '24px Arial';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fillText(product.category, canvas.width / 2, canvas.height / 2 + 30);

    // Add decorative elements
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2 - 100, canvas.height / 2 + 60);
    ctx.lineTo(canvas.width / 2 + 100, canvas.height / 2 + 60);
    ctx.stroke();

    // Convert canvas to base64
    return canvas.toDataURL('image/png');
  };

  const uploadArtworkToStorage = async (dataUrl: string, productId: string): Promise<string> => {
    const storageRef = ref(storage, `artwork/generated/${productId}_${Date.now()}.png`);
    await uploadString(storageRef, dataUrl, 'data_url');
    return await getDownloadURL(storageRef);
  };

  const generateArtworkForAll = async () => {
    setGenerating(true);
    setResults([]);
    setProgress({ current: 0, total: products.length });

    const newResults: GenerationResult[] = [];

    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      setProgress({ current: i + 1, total: products.length });

      try {
        // Check if product already has artwork
        if (product.artwork_url) {
          newResults.push({
            productId: product.id,
            productName: product.name,
            success: true,
            artworkUrl: product.artwork_url,
            error: 'Already has artwork'
          });
          continue;
        }

        // Generate artwork
        const artworkDataUrl = await generateArtworkForProduct(product);
        
        // Upload to Firebase Storage
        const downloadUrl = await uploadArtworkToStorage(artworkDataUrl, product.id);

        // Update product with artwork URL
        await updateDoc(doc(db, 'products', product.id), {
          artwork_url: downloadUrl,
          artwork_mode: 'generated',
          artwork_generated_at: Timestamp.now()
        });

        // Also add to artwork collection for future use
        await addDoc(collection(db, 'artwork'), {
          name: `${product.brand} ${product.name}`,
          url: downloadUrl,
          thumbnailUrl: downloadUrl,
          category: product.category.toLowerCase().replace(/\s+/g, '-'),
          tags: [
            product.brand.toLowerCase(),
            product.category.toLowerCase(),
            'generated',
            'giftcard'
          ],
          dimensions: { width: 600, height: 400 },
          fileSize: 0, // Approximate
          uploadedAt: Timestamp.now(),
          usageCount: 1,
          productId: product.id
        });

        newResults.push({
          productId: product.id,
          productName: product.name,
          success: true,
          artworkUrl: downloadUrl
        });

      } catch (error) {
        console.error(`Error generating artwork for ${product.name}:`, error);
        newResults.push({
          productId: product.id,
          productName: product.name,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    setResults(newResults);
    setGenerating(false);
    
    // Refresh products to show updated artwork
    await fetchProducts();
  };

  const productsWithoutArtwork = products.filter(p => !p.artwork_url);
  const productsWithArtwork = products.filter(p => p.artwork_url);

  return (
    <div className="min-h-screen bg-black p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">Auto Artwork Generator</h1>
          <p className="text-gray-400">Automatically generate and link artwork for all products</p>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-gray-900 border-gray-800 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Products</p>
                <p className="text-3xl font-bold text-white">{products.length}</p>
              </div>
              <Palette className="h-8 w-8 text-blue-500" />
            </div>
          </Card>

          <Card className="bg-gray-900 border-gray-800 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">With Artwork</p>
                <p className="text-3xl font-bold text-green-500">{productsWithArtwork.length}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </Card>

          <Card className="bg-gray-900 border-gray-800 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Need Artwork</p>
                <p className="text-3xl font-bold text-yellow-500">{productsWithoutArtwork.length}</p>
              </div>
              <ImageIcon className="h-8 w-8 text-yellow-500" />
            </div>
          </Card>
        </div>

        {/* Action Section */}
        <Card className="bg-gradient-to-r from-blue-600 to-purple-600 p-8 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Generate Artwork</h2>
              <p className="text-white/80">
                {productsWithoutArtwork.length > 0 
                  ? `Generate artwork for ${productsWithoutArtwork.length} products that don't have artwork yet`
                  : 'All products have artwork!'}
              </p>
            </div>
            <Button
              onClick={generateArtworkForAll}
              disabled={generating || loading || productsWithoutArtwork.length === 0}
              size="lg"
              className="bg-white text-blue-600 hover:bg-gray-100"
            >
              {generating ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Generating... ({progress.current}/{progress.total})
                </>
              ) : (
                <>
                  <Zap className="h-5 w-5 mr-2" />
                  Generate All Artwork
                </>
              )}
            </Button>
          </div>
        </Card>

        {/* Progress Bar */}
        {generating && (
          <Card className="bg-gray-900 border-gray-800 p-6 mb-8">
            <div className="mb-2 flex justify-between text-sm text-gray-400">
              <span>Progress</span>
              <span>{Math.round((progress.current / progress.total) * 100)}%</span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              />
            </div>
          </Card>
        )}

        {/* Results */}
        {results.length > 0 && (
          <Card className="bg-gray-900 border-gray-800 p-6">
            <h3 className="text-xl font-bold text-white mb-4">Generation Results</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {results.map((result, index) => (
                <div 
                  key={index}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    result.success ? 'bg-green-500/10' : 'bg-red-500/10'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {result.success ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                    <span className="text-white">{result.productName}</span>
                  </div>
                  {result.artworkUrl && (
                    <img 
                      src={result.artworkUrl} 
                      alt={result.productName}
                      className="h-12 w-18 object-cover rounded"
                    />
                  )}
                  {result.error && (
                    <span className="text-sm text-gray-400">{result.error}</span>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-800">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Success:</span>
                <span className="text-green-500 font-semibold">
                  {results.filter(r => r.success).length}
                </span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-gray-400">Failed:</span>
                <span className="text-red-500 font-semibold">
                  {results.filter(r => !r.success).length}
                </span>
              </div>
            </div>
          </Card>
        )}

        {/* Product List Preview */}
        {!generating && products.length > 0 && (
          <div className="mt-8">
            <h3 className="text-xl font-bold text-white mb-4">Products Preview</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {products.slice(0, 12).map((product) => (
                <Card key={product.id} className="bg-gray-900 border-gray-800 p-2">
                  {product.artwork_url ? (
                    <img 
                      src={product.artwork_url} 
                      alt={product.name}
                      className="w-full h-24 object-cover rounded mb-2"
                    />
                  ) : (
                    <div className="w-full h-24 bg-gray-800 rounded mb-2 flex items-center justify-center">
                      <ImageIcon className="h-8 w-8 text-gray-600" />
                    </div>
                  )}
                  <p className="text-xs text-white truncate">{product.brand}</p>
                  <p className="text-xs text-gray-400 truncate">{product.category}</p>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}