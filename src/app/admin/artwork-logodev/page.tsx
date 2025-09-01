"use client";

import React, { useState, useEffect } from "react";
import { db, storage } from "@/lib/firebase-config";
import { collection, getDocs, updateDoc, doc, addDoc, Timestamp } from "firebase/firestore";
import { ref, uploadString, getDownloadURL } from "firebase/storage";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { 
  Palette, Upload, CheckCircle, XCircle, Loader2, 
  Image as ImageIcon, Zap, Shield, AlertTriangle, 
  ExternalLink, Key, Settings, Download
} from "lucide-react";
import { 
  getLogoDevUrl, 
  getLogoAsDataUrl, 
  testLogoDevAPI,
  LOGODEV_CONFIG,
  BRAND_TO_DOMAIN 
} from "@/lib/logodev-service";
import { getBrandAsset } from "@/lib/brand-assets";

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

export default function LogoDevArtworkPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState<GenerationResult[]>([]);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [apiKey, setApiKey] = useState(LOGODEV_CONFIG.apiKey);
  const [apiConfigured, setApiConfigured] = useState(false);
  const [testingApi, setTestingApi] = useState(false);
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});
  const [logoCache, setLogoCache] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    fetchProducts();
    checkApiConfiguration();
  }, []);

  const checkApiConfiguration = async () => {
    if (apiKey && apiKey !== 'YOUR_API_KEY_HERE') {
      setTestingApi(true);
      const isWorking = await testLogoDevAPI();
      setApiConfigured(isWorking);
      setTestingApi(false);
    }
  };

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

  const saveApiKey = () => {
    // In production, you'd save this securely
    // For now, we'll just update the local state
    LOGODEV_CONFIG.apiKey = apiKey;
    checkApiConfiguration();
  };

  const generateProfessionalArtwork = async (
    canvas: HTMLCanvasElement, 
    ctx: CanvasRenderingContext2D, 
    product: Product
  ) => {
    // Get brand colors
    const brandAsset = getBrandAsset(product.brand);
    const colors = brandAsset?.officialColors || ['#1a1a1a', '#4a4a4a'];
    
    // Create sophisticated gradient background
    const gradient = ctx.createRadialGradient(
      canvas.width * 0.3, canvas.height * 0.3, 0,
      canvas.width * 0.7, canvas.height * 0.7, canvas.width * 0.8
    );
    gradient.addColorStop(0, colors[0] + 'ee');
    gradient.addColorStop(0.5, colors[0] + '88');
    gradient.addColorStop(1, colors[1] ? colors[1] + '44' : colors[0] + '22');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Add subtle pattern
    ctx.globalAlpha = 0.03;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    for (let i = 0; i < canvas.width; i += 20) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, canvas.height);
      ctx.stroke();
    }
    for (let i = 0; i < canvas.height; i += 20) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(canvas.width, i);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // Card container
    const cardX = 60;
    const cardY = canvas.height / 2 - 100;
    const cardWidth = canvas.width - 120;
    const cardHeight = 200;

    // Glass morphism card
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.fillRect(cardX, cardY, cardWidth, cardHeight);
    
    // Card border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.strokeRect(cardX, cardY, cardWidth, cardHeight);

    // Try to load and draw the logo
    let logoDrawn = false;
    let logoDataUrl = logoCache.get(product.brand);
    
    if (!logoDataUrl && apiConfigured) {
      // Fetch logo from Logo.dev
      logoDataUrl = await getLogoAsDataUrl(product.brand, 180);
      if (logoDataUrl) {
        logoCache.set(product.brand, logoDataUrl);
      }
    }

    if (logoDataUrl) {
      try {
        const img = new Image();
        img.src = logoDataUrl;
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
        });

        // Draw logo with nice positioning
        const logoSize = 120;
        const logoX = canvas.width / 2 - logoSize / 2;
        const logoY = cardY + 20;
        
        // White background for logo
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.fillRect(logoX - 10, logoY - 10, logoSize + 20, logoSize + 20);
        
        // Draw the actual logo
        ctx.drawImage(img, logoX, logoY, logoSize, logoSize);
        logoDrawn = true;

        // Add "GIFT CARD" text below logo
        ctx.fillStyle = '#ffffff';
        ctx.font = '24px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('GIFT CARD', canvas.width / 2, logoY + logoSize + 40);

      } catch (error) {
        console.error(`Failed to draw logo for ${product.brand}:`, error);
      }
    }

    if (!logoDrawn) {
      // Fallback to text-based design
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 52px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(product.brand, canvas.width / 2, canvas.height / 2 - 20);
      
      ctx.font = '24px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.fillText('GIFT CARD', canvas.width / 2, canvas.height / 2 + 30);
    }

    // Premium elements
    // Value range in corner
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('$25 - $200', canvas.width - 70, cardY + cardHeight - 20);

    // Category badge
    ctx.fillStyle = colors[0];
    ctx.fillRect(cardX, cardY + cardHeight - 30, 100, 30);
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(product.category.toUpperCase(), cardX + 50, cardY + cardHeight - 10);
  };

  const generateArtworkForProduct = async (product: Product): Promise<string> => {
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) throw new Error('Could not get canvas context');

    await generateProfessionalArtwork(canvas, ctx, product);
    return canvas.toDataURL('image/png');
  };

  const uploadArtworkToStorage = async (dataUrl: string, productId: string): Promise<string> => {
    const storageRef = ref(storage, `artwork/logodev/${productId}_${Date.now()}.png`);
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
    if (!apiConfigured) {
      alert('Please configure your Logo.dev API key first');
      return;
    }

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
          artwork_mode: 'logodev',
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
            'logodev',
            'professional',
            'giftcard'
          ],
          dimensions: { width: 600, height: 400 },
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

  const productsWithLogos = products.filter(p => BRAND_TO_DOMAIN[p.brand]);
  const productsWithoutLogos = products.filter(p => !BRAND_TO_DOMAIN[p.brand]);

  return (
    <div className="min-h-screen bg-black p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">Logo.dev Professional Artwork</h1>
          <p className="text-gray-400">Generate artwork with real brand logos using Logo.dev API</p>
        </div>

        {/* API Configuration */}
        <Card className="bg-gray-900 border-gray-800 p-6 mb-8">
          <div className="flex items-start gap-4">
            <Key className="h-6 w-6 text-blue-500 mt-1" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-white mb-2">Logo.dev API Configuration</h3>
              <p className="text-sm text-gray-400 mb-4">
                Get your API key from{' '}
                <a 
                  href="https://www.logo.dev/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 inline-flex items-center gap-1"
                >
                  logo.dev <ExternalLink className="h-3 w-3" />
                </a>
              </p>
              <div className="flex gap-2">
                <Input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter your Logo.dev API key"
                  className="flex-1 bg-gray-800 border-gray-700 text-white"
                />
                <Button 
                  onClick={saveApiKey}
                  disabled={testingApi}
                  variant={apiConfigured ? 'default' : 'outline'}
                >
                  {testingApi ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : apiConfigured ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <Settings className="h-4 w-4" />
                  )}
                  {apiConfigured ? 'Connected' : 'Connect'}
                </Button>
              </div>
              {apiConfigured && (
                <p className="text-sm text-green-400 mt-2">✓ API key configured and working</p>
              )}
            </div>
          </div>
        </Card>

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
                <p className="text-sm text-gray-400">With Logo Support</p>
                <p className="text-3xl font-bold text-green-500">{productsWithLogos.length}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </Card>

          <Card className="bg-gray-900 border-gray-800 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">No Logo Mapping</p>
                <p className="text-3xl font-bold text-yellow-500">{productsWithoutLogos.length}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-yellow-500" />
            </div>
          </Card>
        </div>

        {/* Preview Section */}
        {!generating && apiConfigured && products.length > 0 && (
          <Card className="bg-gray-900 border-gray-800 p-6 mb-8">
            <h3 className="text-xl font-bold text-white mb-4">Preview with Real Logos</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {productsWithLogos.slice(0, 8).map((product) => (
                <div key={product.id} className="space-y-2">
                  <div className="relative h-32 bg-gray-800 rounded overflow-hidden">
                    {previewUrls[product.id] ? (
                      <img 
                        src={previewUrls[product.id]} 
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center">
                        <Button
                          onClick={() => generatePreview(product)}
                          size="sm"
                          variant="outline"
                          className="text-xs"
                        >
                          <Download className="h-3 w-3 mr-1" />
                          Preview
                        </Button>
                      </div>
                    )}
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-white truncate">{product.brand}</p>
                    {BRAND_TO_DOMAIN[product.brand] && (
                      <p className="text-xs text-gray-500">{BRAND_TO_DOMAIN[product.brand]}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Products without logo mapping */}
        {productsWithoutLogos.length > 0 && (
          <Card className="bg-yellow-900/20 border-yellow-600/50 p-6 mb-8">
            <h3 className="text-lg font-semibold text-yellow-500 mb-3">Products Without Logo Mapping</h3>
            <p className="text-sm text-gray-300 mb-3">
              These brands don't have domain mappings for Logo.dev:
            </p>
            <div className="flex flex-wrap gap-2">
              {productsWithoutLogos.map(p => (
                <span key={p.id} className="px-2 py-1 bg-gray-800 rounded text-xs text-gray-300">
                  {p.brand}
                </span>
              ))}
            </div>
          </Card>
        )}

        {/* Action Section */}
        <Card className="bg-gradient-to-r from-blue-600 to-purple-600 p-8 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Generate Professional Artwork</h2>
              <p className="text-white/80">
                Create artwork with real logos for {productsWithLogos.length} products
              </p>
            </div>
            <Button
              onClick={generateArtworkForAll}
              disabled={generating || loading || !apiConfigured}
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

        {/* Logo.dev Features */}
        <Card className="bg-gray-900 border-gray-800 p-6 mb-8">
          <h3 className="text-lg font-semibold text-white mb-4">Logo.dev Features</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <div className="text-white font-medium">High Quality Logos</div>
                  <div className="text-sm text-gray-400">Vector and raster formats</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <div className="text-white font-medium">Fast CDN</div>
                  <div className="text-sm text-gray-400">Global edge network</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <div className="text-white font-medium">Auto Updates</div>
                  <div className="text-sm text-gray-400">Logos update automatically</div>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <div className="text-white font-medium">Size Options</div>
                  <div className="text-sm text-gray-400">16px to 2048px</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <div className="text-white font-medium">Format Support</div>
                  <div className="text-sm text-gray-400">PNG, JPG, SVG</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <div className="text-white font-medium">CORS Ready</div>
                  <div className="text-sm text-gray-400">Use in canvas directly</div>
                </div>
              </div>
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