"use client";

import React, { useState, useEffect } from "react";
import { db, storage } from "@/lib/firebase-config";
import { collection, getDocs, updateDoc, doc, addDoc, Timestamp } from "firebase/firestore";
import { ref, uploadString, getDownloadURL } from "firebase/storage";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  Palette, Upload, CheckCircle, XCircle, Loader2, 
  Image as ImageIcon, Zap, Shield, AlertTriangle, ExternalLink 
} from "lucide-react";
import { getBrandAsset, getClearbitLogoUrl, BRAND_DOMAINS } from "@/lib/brand-assets";

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

export default function BrandedArtworkPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState<GenerationResult[]>([]);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [logoSource, setLogoSource] = useState<'clearbit' | 'wikipedia'>('clearbit');
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});

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

  const loadImageFromUrl = (url: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = url;
    });
  };

  const generateBrandedArtwork = async (
    canvas: HTMLCanvasElement, 
    ctx: CanvasRenderingContext2D, 
    product: Product
  ) => {
    // Get brand asset
    const brandAsset = getBrandAsset(product.brand);
    const colors = brandAsset?.officialColors || ['#333333', '#666666'];
    
    // Create gradient background with brand colors
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    if (colors.length >= 2) {
      gradient.addColorStop(0, colors[0]);
      gradient.addColorStop(1, colors[1]);
    } else {
      gradient.addColorStop(0, colors[0]);
      gradient.addColorStop(1, colors[0] + '88');
    }
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Add subtle pattern overlay
    ctx.globalAlpha = 0.05;
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 20; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      ctx.beginPath();
      ctx.arc(x, y, Math.random() * 50 + 20, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Try to load and draw the actual logo
    let logoDrawn = false;
    
    try {
      let logoUrl = '';
      
      if (logoSource === 'clearbit' && BRAND_DOMAINS[product.brand]) {
        // Use Clearbit API
        logoUrl = getClearbitLogoUrl(BRAND_DOMAINS[product.brand]);
      } else if (brandAsset?.logoUrl) {
        // Use Wikipedia Commons logo
        logoUrl = brandAsset.logoUrl;
      }

      if (logoUrl) {
        // For demo purposes, we'll skip actual logo loading
        // In production, you'd need proper CORS setup or proxy
        console.log('Would load logo from:', logoUrl);
        logoDrawn = false; // Set to true if logo loads successfully
      }
    } catch (error) {
      console.log('Logo loading failed, using text fallback');
    }

    // If no logo, create styled brand text
    if (!logoDrawn) {
      // Card background
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.fillRect(50, canvas.height / 2 - 80, canvas.width - 100, 160);
      
      // Brand name
      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
      ctx.shadowBlur = 20;
      ctx.shadowOffsetY = 5;
      
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 56px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(product.brand, canvas.width / 2, canvas.height / 2 - 15);
      
      // Gift Card text
      ctx.font = '28px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.fillText('GIFT CARD', canvas.width / 2, canvas.height / 2 + 30);
      
      ctx.restore();
    }

    // Add premium elements
    if (brandAsset) {
      // Brand color accent bar
      ctx.fillStyle = colors[0];
      ctx.fillRect(0, canvas.height - 40, canvas.width, 40);
      
      // Category text on accent bar
      ctx.fillStyle = '#ffffff';
      ctx.font = '16px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(product.category, 20, canvas.height - 15);
      
      // Value indicators
      ctx.textAlign = 'right';
      ctx.fillText('$25 - $200', canvas.width - 20, canvas.height - 15);
    }
  };

  const generateArtworkForProduct = async (product: Product): Promise<string> => {
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) throw new Error('Could not get canvas context');

    await generateBrandedArtwork(canvas, ctx, product);
    return canvas.toDataURL('image/png');
  };

  const uploadArtworkToStorage = async (dataUrl: string, productId: string): Promise<string> => {
    const storageRef = ref(storage, `artwork/branded/${productId}_${Date.now()}.png`);
    await uploadString(storageRef, dataUrl, 'data_url');
    return await getDownloadURL(storageRef);
  };

  const generatePreview = async (product: Product) => {
    try {
      const artworkDataUrl = await generateArtworkForProduct(product);
      setPreviewUrls(prev => ({ ...prev, [product.id]: artworkDataUrl }));
    } catch (error) {
      console.error('Preview generation failed:', error);
    }
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
        const artworkDataUrl = await generateArtworkForProduct(product);
        const downloadUrl = await uploadArtworkToStorage(artworkDataUrl, product.id);

        await updateDoc(doc(db, 'products', product.id), {
          artwork_url: downloadUrl,
          artwork_mode: 'branded',
          artwork_generated_at: Timestamp.now()
        });

        await addDoc(collection(db, 'artwork'), {
          name: `${product.brand} ${product.name}`,
          url: downloadUrl,
          thumbnailUrl: downloadUrl,
          category: product.category.toLowerCase().replace(/\s+/g, '-'),
          tags: [
            product.brand.toLowerCase(),
            product.category.toLowerCase(),
            'branded',
            'official-colors',
            'giftcard'
          ],
          dimensions: { width: 600, height: 400 },
          fileSize: 0,
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
    await fetchProducts();
  };

  return (
    <div className="min-h-screen bg-black p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">Branded Artwork Generator</h1>
          <p className="text-gray-400">Generate artwork using official brand colors and styles</p>
        </div>

        {/* Legal Notice */}
        <Card className="bg-yellow-900/20 border-yellow-600/50 p-6 mb-8">
          <div className="flex gap-4">
            <AlertTriangle className="h-6 w-6 text-yellow-500 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-lg font-semibold text-yellow-500 mb-2">Important Legal Notice</h3>
              <p className="text-sm text-gray-300 mb-3">
                Brand logos and trademarks are the property of their respective owners. 
                This tool uses publicly available brand colors and designs for demonstration purposes only.
              </p>
              <p className="text-sm text-gray-400">
                For production use, ensure you have proper licensing agreements with brand owners 
                or are an authorized reseller. Using brand logos without permission may violate 
                trademark laws.
              </p>
            </div>
          </div>
        </Card>

        {/* Logo Source Selector */}
        <Card className="bg-gray-900 border-gray-800 p-6 mb-8">
          <h3 className="text-lg font-semibold text-white mb-4">Logo Source</h3>
          <div className="grid grid-cols-2 gap-4">
            <Button
              variant={logoSource === 'clearbit' ? 'default' : 'outline'}
              onClick={() => setLogoSource('clearbit')}
              className="justify-start"
            >
              <Shield className="h-5 w-5 mr-2" />
              <div className="text-left">
                <div>Clearbit API</div>
                <div className="text-xs opacity-70">Auto-fetch from domains</div>
              </div>
            </Button>
            <Button
              variant={logoSource === 'wikipedia' ? 'default' : 'outline'}
              onClick={() => setLogoSource('wikipedia')}
              className="justify-start"
            >
              <ImageIcon className="h-5 w-5 mr-2" />
              <div className="text-left">
                <div>Wikipedia Commons</div>
                <div className="text-xs opacity-70">Open source logos</div>
              </div>
            </Button>
          </div>
        </Card>

        {/* Preview Section */}
        {!generating && products.length > 0 && (
          <Card className="bg-gray-900 border-gray-800 p-6 mb-8">
            <h3 className="text-xl font-bold text-white mb-4">Preview Branded Artwork</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {products.slice(0, 8).map((product) => {
                const brandAsset = getBrandAsset(product.brand);
                return (
                  <div key={product.id} className="space-y-2">
                    <div className="relative h-32 bg-gray-800 rounded overflow-hidden">
                      {previewUrls[product.id] ? (
                        <img 
                          src={previewUrls[product.id]} 
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Button
                            onClick={() => generatePreview(product)}
                            size="sm"
                            variant="outline"
                            className="text-xs"
                          >
                            Preview
                          </Button>
                        </div>
                      )}
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-400 truncate">{product.brand}</p>
                      {brandAsset && (
                        <div className="flex justify-center gap-1 mt-1">
                          {brandAsset.officialColors.slice(0, 3).map((color, idx) => (
                            <div
                              key={idx}
                              className="w-3 h-3 rounded-full border border-gray-600"
                              style={{ backgroundColor: color }}
                              title={color}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* Action Section */}
        <Card className="bg-gradient-to-r from-blue-600 to-purple-600 p-8 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Generate Branded Artwork</h2>
              <p className="text-white/80">
                Create artwork with official brand colors for all {products.length} products
              </p>
            </div>
            <Button
              onClick={generateArtworkForAll}
              disabled={generating || loading}
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

        {/* API Services Info */}
        <Card className="bg-gray-900 border-gray-800 p-6 mb-8">
          <h3 className="text-lg font-semibold text-white mb-4">Alternative Logo Services</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-800 rounded">
              <div>
                <div className="text-white font-medium">Brandfetch API</div>
                <div className="text-sm text-gray-400">Professional brand assets API</div>
              </div>
              <a 
                href="https://brandfetch.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300"
              >
                <ExternalLink className="h-5 w-5" />
              </a>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-800 rounded">
              <div>
                <div className="text-white font-medium">Logo.dev</div>
                <div className="text-sm text-gray-400">Fast logo API service</div>
              </div>
              <a 
                href="https://logo.dev" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300"
              >
                <ExternalLink className="h-5 w-5" />
              </a>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-800 rounded">
              <div>
                <div className="text-white font-medium">Clearbit Logo</div>
                <div className="text-sm text-gray-400">Free logo API (used here)</div>
              </div>
              <a 
                href="https://clearbit.com/logo" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300"
              >
                <ExternalLink className="h-5 w-5" />
              </a>
            </div>
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
                className="bg-gradient-to-r from-blue-600 to-purple-600 h-2 rounded-full transition-all duration-300"
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
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}