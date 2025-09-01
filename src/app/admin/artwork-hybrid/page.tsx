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
  ExternalLink, Key, Settings, Download, Sparkles
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

// Enhanced category color schemes
const CATEGORY_THEMES = {
  'Entertainment': {
    gradients: [
      ['#FF006E', '#8338EC', '#3A86FF'],
      ['#F72585', '#B5179E', '#7209B7'],
      ['#4361EE', '#3F37C9', '#4895EF']
    ],
    patterns: ['wave', 'diagonal', 'circles']
  },
  'Shopping': {
    gradients: [
      ['#FF9500', '#FF6B6B', '#FFC300'],
      ['#F94144', '#F3722C', '#F8961E'],
      ['#FFB700', '#FF9A00', '#FF8800']
    ],
    patterns: ['grid', 'dots', 'hexagon']
  },
  'Gaming': {
    gradients: [
      ['#7400B8', '#6930C3', '#5E60CE'],
      ['#5390D9', '#4EA8DE', '#48BFE3'],
      ['#00F5FF', '#00D9FF', '#0096FF']
    ],
    patterns: ['tech', 'circuit', 'pixel']
  },
  'Food & Dining': {
    gradients: [
      ['#D4A574', '#A68A64', '#936639'],
      ['#BB3E03', '#CA6702', '#EE9B00'],
      ['#94D2BD', '#56CFE1', '#64DFDF']
    ],
    patterns: ['organic', 'wave', 'circles']
  },
  'Travel': {
    gradients: [
      ['#2D6A4F', '#40916C', '#52B788'],
      ['#74C69D', '#95D5B2', '#B7E4C7'],
      ['#007F5F', '#2B9348', '#55A630']
    ],
    patterns: ['map', 'wave', 'diagonal']
  },
  'Lifestyle': {
    gradients: [
      ['#E63946', '#F1FAEE', '#A8DADC'],
      ['#457B9D', '#1D3557', '#F1FAEE'],
      ['#E76F51', '#F4A261', '#E9C46A']
    ],
    patterns: ['minimal', 'dots', 'gradient']
  }
};

export default function HybridArtworkPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState<GenerationResult[]>([]);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [apiKey, setApiKey] = useState('pk_DN405L4ARZCzsbNkUjHV8Q');
  const [apiConfigured, setApiConfigured] = useState(false);
  const [testingApi, setTestingApi] = useState(false);
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});
  const [logoCache, setLogoCache] = useState<Map<string, string>>(new Map());
  const [useLogodev, setUseLogodev] = useState(true); // Enable Logo.dev

  useEffect(() => {
    // Set the API key in config immediately
    LOGODEV_CONFIG.apiKey = 'pk_DN405L4ARZCzsbNkUjHV8Q';
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
    LOGODEV_CONFIG.apiKey = apiKey;
    checkApiConfiguration();
  };

  const generateEnhancedPattern = (
    ctx: CanvasRenderingContext2D, 
    canvas: HTMLCanvasElement,
    pattern: string,
    color: string
  ) => {
    ctx.save();
    ctx.globalAlpha = 0.05;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;

    switch (pattern) {
      case 'wave':
        ctx.lineWidth = 2;
        for (let i = 0; i < 5; i++) {
          ctx.beginPath();
          const offset = i * 100;
          for (let x = 0; x < canvas.width; x += 5) {
            const y = Math.sin(x * 0.02) * 30 + canvas.height/2 + offset - 200;
            ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
        break;

      case 'circuit':
        ctx.lineWidth = 1;
        for (let i = 0; i < 20; i++) {
          const x = Math.random() * canvas.width;
          const y = Math.random() * canvas.height;
          ctx.beginPath();
          ctx.arc(x, y, 3, 0, Math.PI * 2);
          ctx.fill();
          
          // Draw connecting lines
          if (i > 0) {
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + (Math.random() - 0.5) * 100, y);
            ctx.lineTo(x + (Math.random() - 0.5) * 100, y + (Math.random() - 0.5) * 100);
            ctx.stroke();
          }
        }
        break;

      case 'hexagon':
        const size = 30;
        for (let row = 0; row < canvas.height / size + 2; row++) {
          for (let col = 0; col < canvas.width / size + 2; col++) {
            const x = col * size * 1.5;
            const y = row * size * Math.sqrt(3) + (col % 2 ? size * Math.sqrt(3) / 2 : 0);
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
              const angle = (Math.PI / 3) * i;
              const px = x + size * Math.cos(angle);
              const py = y + size * Math.sin(angle);
              if (i === 0) ctx.moveTo(px, py);
              else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.stroke();
          }
        }
        break;

      case 'gradient':
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, color + '22');
        gradient.addColorStop(0.5, color + '11');
        gradient.addColorStop(1, color + '22');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        break;

      default:
        // Dots pattern
        for (let x = 20; x < canvas.width; x += 40) {
          for (let y = 20; y < canvas.height; y += 40) {
            ctx.beginPath();
            ctx.arc(x, y, 2, 0, Math.PI * 2);
            ctx.fill();
          }
        }
    }

    ctx.restore();
  };

  // Helper function to extract dominant color from logo
  const extractDominantColor = (img: HTMLImageElement): string => {
    // Create a temporary canvas to analyze the image
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return '#1a1a1a';
    
    // Use smaller size for faster processing
    const sampleSize = 50;
    tempCanvas.width = sampleSize;
    tempCanvas.height = sampleSize;
    
    // Draw the image scaled down
    tempCtx.drawImage(img, 0, 0, sampleSize, sampleSize);
    
    // Get image data
    const imageData = tempCtx.getImageData(0, 0, sampleSize, sampleSize);
    const data = imageData.data;
    
    // Color buckets for averaging
    const colorMap = new Map<string, number>();
    
    // Sample pixels (skip transparent and white pixels)
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];
      
      // Skip transparent pixels
      if (a < 128) continue;
      
      // Skip white/near-white pixels
      if (r > 240 && g > 240 && b > 240) continue;
      
      // Skip very light gray pixels
      if (r > 200 && g > 200 && b > 200) continue;
      
      // Create color key (round to nearest 10 for grouping similar colors)
      const key = `${Math.round(r/10)*10},${Math.round(g/10)*10},${Math.round(b/10)*10}`;
      colorMap.set(key, (colorMap.get(key) || 0) + 1);
    }
    
    // Find most common color
    let dominantColor = '#1a1a1a';
    let maxCount = 0;
    
    for (const [colorKey, count] of colorMap.entries()) {
      if (count > maxCount) {
        maxCount = count;
        const [r, g, b] = colorKey.split(',').map(Number);
        
        // Convert to hex
        dominantColor = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
      }
    }
    
    // If no dominant color found or it's too light, use dark default
    if (maxCount === 0) {
      return '#1a1a1a';
    }
    
    return dominantColor;
  };

  const generateProfessionalArtwork = async (
    canvas: HTMLCanvasElement, 
    ctx: CanvasRenderingContext2D, 
    product: Product
  ) => {
    // Try to load real logo first if API is configured
    let logoDrawn = false;
    let brandColor = '#1a1a1a'; // Default dark color
    
    if (apiConfigured && useLogodev && BRAND_TO_DOMAIN[product.brand]) {
      try {
        // Get logo URL directly
        const logoUrl = getLogoDevUrl(product.brand, { size: 250, format: 'png' });
        
        if (logoUrl) {
          const img = new Image();
          img.crossOrigin = 'anonymous'; // Enable CORS
          
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = (e) => {
              console.log(`Failed to load logo for ${product.brand}:`, e);
              reject(e);
            };
            img.src = logoUrl;
            
            // Add timeout
            setTimeout(() => reject(new Error('Timeout')), 5000);
          });

          // Define brands that should have white backgrounds
          const whiteBackgroundBrands = [
            'Apple', 'Mastercard', 'Target', "Macy's", 'Whole Foods', 
            'eBay', 'Disney', 'Hotels.com', 'Foot Locker', 'Google Play', 
            "Dick's Sporting", 'Disney+', 'Macy\'s', 'Dick\'s Sporting Goods'
          ];
          
          // Check if this brand should have a white background
          if (whiteBackgroundBrands.some(brand => 
            product.brand.toLowerCase().includes(brand.toLowerCase()) ||
            brand.toLowerCase().includes(product.brand.toLowerCase())
          )) {
            brandColor = '#FFFFFF';
            console.log(`Using white background for ${product.brand}`);
          } else {
            // Extract dominant color from the logo for other brands
            brandColor = extractDominantColor(img);
            console.log(`Extracted color for ${product.brand}: ${brandColor}`);
            
            // Fallback to brand asset colors if extraction resulted in default
            if (brandColor === '#1a1a1a') {
              const brandAsset = getBrandAsset(product.brand);
              if (brandAsset?.officialColors?.[0]) {
                brandColor = brandAsset.officialColors[0];
              }
            }
          }

          // Clean solid background matching logo color
          ctx.fillStyle = brandColor;
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          // Add very subtle gradient overlay for depth
          const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
          gradient.addColorStop(0, 'rgba(255, 255, 255, 0.03)');
          gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0)');
          gradient.addColorStop(1, 'rgba(0, 0, 0, 0.08)');
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          // Draw the logo directly without container - properly centered
          const logoSize = 240;
          const logoX = (canvas.width - logoSize) / 2;
          const logoY = (canvas.height - logoSize) / 2; // Perfectly centered now
          
          // Draw logo without shadow for cleaner look
          ctx.drawImage(img, logoX, logoY, logoSize, logoSize);
          
          // Value badge in corner - adjust colors based on background
          const isWhiteBackground = brandColor === '#FFFFFF';
          
          ctx.fillStyle = isWhiteBackground ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.2)';
          ctx.beginPath();
          ctx.roundRect(canvas.width - 130, canvas.height - 60, 110, 40, 8);
          ctx.fill();
          
          ctx.fillStyle = isWhiteBackground ? '#000000' : '#ffffff';
          ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('$25 - $200', canvas.width - 75, canvas.height - 40);
          
          logoDrawn = true;
          console.log(`Successfully drew logo for ${product.brand}`);
        }
      } catch (error) {
        console.log(`Logo fetch failed for ${product.brand}, using fallback design:`, error);
      }
    }
    
    // Fallback to enhanced design if logo wasn't drawn
    if (!logoDrawn) {
      // Determine category theme
      const categoryTheme = CATEGORY_THEMES[product.category] || CATEGORY_THEMES['Lifestyle'];
      const gradientSet = categoryTheme.gradients[Math.floor(Math.random() * categoryTheme.gradients.length)];
      const patternType = categoryTheme.patterns[Math.floor(Math.random() * categoryTheme.patterns.length)];

      // Create sophisticated gradient background
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, gradientSet[0]);
      gradient.addColorStop(0.5, gradientSet[1]);
      gradient.addColorStop(1, gradientSet[2] || gradientSet[1]);
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Add pattern overlay
      generateEnhancedPattern(ctx, canvas, patternType, '#ffffff');

      // Glass morphism card
      const cardX = 50;
      const cardY = canvas.height / 2 - 120;
      const cardWidth = canvas.width - 100;
      const cardHeight = 240;

      // Card shadow
      ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
      ctx.shadowBlur = 20;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 10;
      
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.fillRect(cardX, cardY, cardWidth, cardHeight);
      
      ctx.shadowColor = 'transparent';

      // Card border with gradient
      const borderGradient = ctx.createLinearGradient(cardX, cardY, cardX + cardWidth, cardY + cardHeight);
      borderGradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
      borderGradient.addColorStop(1, 'rgba(255, 255, 255, 0.1)');
      ctx.strokeStyle = borderGradient;
      ctx.lineWidth = 1;
      ctx.strokeRect(cardX, cardY, cardWidth, cardHeight);

      // Create stylized brand text
      ctx.save();
      
      // Brand name with style
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 56px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
      ctx.shadowBlur = 10;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 3;
      
      // Split long brand names
      const brandParts = product.brand.split(' ');
      if (brandParts.length > 1 && product.brand.length > 12) {
        ctx.font = 'bold 42px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
        brandParts.forEach((part, i) => {
          ctx.fillText(part, canvas.width / 2, cardY + 60 + (i * 45));
        });
      } else {
        ctx.fillText(product.brand, canvas.width / 2, cardY + 80);
      }
      
      ctx.restore();
      
      // Value badge
      const badgeX = canvas.width - 140;
      const badgeY = cardY + cardHeight - 50;
      
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.fillRect(badgeX, badgeY, 100, 35);
      
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('$25 - $200', badgeX + 50, badgeY + 22);

      // Category indicator
      const categoryBadgeX = cardX + 20;
      const categoryBadgeY = cardY + cardHeight - 50;
      const fallbackCategoryTheme = CATEGORY_THEMES[product.category] || CATEGORY_THEMES['Lifestyle'];
      const fallbackGradientSet = fallbackCategoryTheme.gradients[0];
      
      ctx.fillStyle = fallbackGradientSet[0] + 'cc';
      ctx.fillRect(categoryBadgeX, categoryBadgeY, 120, 35);
      
      ctx.fillStyle = '#ffffff';
      ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(product.category.toUpperCase(), categoryBadgeX + 60, categoryBadgeY + 22);

      // Add decorative elements
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(cardX + 20, cardY + 190);
      ctx.lineTo(cardX + cardWidth - 20, cardY + 190);
      ctx.stroke();
      ctx.setLineDash([]);
    }
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
    const storageRef = ref(storage, `artwork/hybrid/${productId}_${Date.now()}.png`);
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
          artwork_mode: apiConfigured ? 'hybrid-logodev' : 'hybrid-enhanced',
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
            'hybrid',
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
          <h1 className="text-4xl font-bold text-white mb-4">
            Hybrid Professional Artwork Generator
          </h1>
          <p className="text-gray-400">
            Creates professional artwork with real logos when available, beautiful designs as fallback
          </p>
        </div>

        {/* Optional API Configuration */}
        <Card className="bg-gray-900 border-gray-800 p-6 mb-8">
          <div className="flex items-start gap-4">
            <Key className="h-6 w-6 text-blue-500 mt-1" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-white mb-2">
                Logo.dev API (Optional)
              </h3>
              <p className="text-sm text-gray-400 mb-4">
                Enhance artwork with real logos. Works great without it too!{' '}
                <a 
                  href="https://www.logo.dev/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 inline-flex items-center gap-1"
                >
                  Get API key <ExternalLink className="h-3 w-3" />
                </a>
              </p>
              <div className="flex gap-2">
                <Input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter Logo.dev API key (optional)"
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
                <p className="text-sm text-green-400 mt-2">
                  ✓ Logo.dev connected - Real logos will be used for {productsWithLogos.length} products
                </p>
              )}
              {!apiConfigured && (
                <p className="text-sm text-blue-400 mt-2">
                  ✓ Enhanced designs will be used for all products
                </p>
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
                <p className="text-sm text-gray-400">
                  {apiConfigured ? 'With Real Logos' : 'Enhanced Designs'}
                </p>
                <p className="text-3xl font-bold text-green-500">
                  {apiConfigured ? productsWithLogos.length : products.length}
                </p>
              </div>
              <Sparkles className="h-8 w-8 text-green-500" />
            </div>
          </Card>

          <Card className="bg-gray-900 border-gray-800 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Ready to Generate</p>
                <p className="text-3xl font-bold text-purple-500">{products.length}</p>
              </div>
              <Zap className="h-8 w-8 text-purple-500" />
            </div>
          </Card>
        </div>

        {/* Preview Section */}
        {!generating && products.length > 0 && (
          <Card className="bg-gray-900 border-gray-800 p-6 mb-8">
            <h3 className="text-xl font-bold text-white mb-4">Preview Designs</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {products.slice(0, 8).map((product) => (
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
                    <p className="text-xs text-gray-500">{product.category}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Action Section */}
        <Card className="bg-gradient-to-r from-purple-600 to-pink-600 p-8 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">
                Generate Professional Artwork
              </h2>
              <p className="text-white/80">
                {apiConfigured 
                  ? `Create artwork with real logos for ${productsWithLogos.length} products`
                  : `Create enhanced artwork for all ${products.length} products`}
              </p>
            </div>
            <Button
              onClick={generateArtworkForAll}
              disabled={generating || loading}
              size="lg"
              className="bg-white text-purple-600 hover:bg-gray-100"
            >
              {generating ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Generating... ({progress.current}/{progress.total})
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5 mr-2" />
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
                className="bg-gradient-to-r from-purple-600 to-pink-600 h-2 rounded-full transition-all duration-300"
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