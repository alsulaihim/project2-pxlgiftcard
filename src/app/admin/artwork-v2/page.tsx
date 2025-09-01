"use client";

import React, { useState, useEffect } from "react";
import { db, storage } from "@/lib/firebase-config";
import { collection, getDocs, updateDoc, doc, addDoc, Timestamp } from "firebase/firestore";
import { ref, uploadString, getDownloadURL } from "firebase/storage";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Palette, Upload, CheckCircle, XCircle, Loader2, Image as ImageIcon, Zap, Sparkles, RefreshCw } from "lucide-react";

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

// Professional color schemes for different categories
const CATEGORY_THEMES: Record<string, any> = {
  'Gaming': {
    gradients: [
      ['#667eea', '#764ba2'], // Purple gaming
      ['#f093fb', '#f5576c'], // Neon pink
      ['#4facfe', '#00f2fe'], // Cyan blue
      ['#43e97b', '#38f9d7'], // Green cyan
    ],
    patterns: ['geometric', 'circuit', 'hexagon'],
    accent: '#00ff88'
  },
  'Entertainment': {
    gradients: [
      ['#fa709a', '#fee140'], // Sunset
      ['#30cfd0', '#330867'], // Deep purple
      ['#a8edea', '#fed6e3'], // Soft pastel
      ['#ff6e7f', '#bfe9ff'], // Cotton candy
    ],
    patterns: ['wave', 'dots', 'film'],
    accent: '#ff0080'
  },
  'Shopping': {
    gradients: [
      ['#f77062', '#fe5196'], // Coral pink
      ['#fdbb2d', '#22c1c3'], // Gold teal
      ['#ff9a56', '#ff6348'], // Orange red
      ['#ffecd2', '#fcb69f'], // Peach
    ],
    patterns: ['diagonal', 'shopping-bag', 'price-tag'],
    accent: '#ff6b6b'
  },
  'Food & Dining': {
    gradients: [
      ['#ff9966', '#ff5e62'], // Warm orange
      ['#ee9ca7', '#ffdde1'], // Rose
      ['#ff6b6b', '#ffd93d'], // Red yellow
      ['#f9ca24', '#f0932b'], // Golden
    ],
    patterns: ['circles', 'organic', 'utensils'],
    accent: '#ff6348'
  },
  'Travel': {
    gradients: [
      ['#2193b0', '#6dd5ed'], // Ocean blue
      ['#396afc', '#2948ff'], // Sky blue
      ['#11998e', '#38ef7d'], // Tropical
      ['#0575e6', '#021b79'], // Deep ocean
    ],
    patterns: ['map', 'compass', 'airplane'],
    accent: '#00d2ff'
  },
  'Technology': {
    gradients: [
      ['#4158d0', '#c850c0'], // Tech purple
      ['#0093e9', '#80d0c7'], // Digital cyan
      ['#8ec5fc', '#e0c3fc'], // Soft tech
      ['#4facfe', '#00f2fe'], // Electric blue
    ],
    patterns: ['circuit', 'binary', 'network'],
    accent: '#00ffff'
  },
  'Fashion': {
    gradients: [
      ['#ff0844', '#ffb199'], // Fashion red
      ['#fc4a1a', '#f7b733'], // Sunset orange
      ['#ddd6f3', '#faaca8'], // Soft pink
      ['#ff9a9e', '#fecfef'], // Rose gold
    ],
    patterns: ['stripes', 'dots', 'abstract'],
    accent: '#ff006e'
  },
  'Sports': {
    gradients: [
      ['#11998e', '#38ef7d'], // Sport green
      ['#fc4a1a', '#f7b733'], // Energy orange
      ['#00b09b', '#96c93d'], // Fresh green
      ['#f2994a', '#f2c94c'], // Golden
    ],
    patterns: ['dynamic', 'speed', 'trophy'],
    accent: '#00ff00'
  },
  'Music': {
    gradients: [
      ['#b92b27', '#1565c0'], // Sound wave
      ['#7028e4', '#e5b2ca'], // Violet pink
      ['#ff006e', '#8338ec'], // Vibrant purple
      ['#f72585', '#7209b7'], // Music purple
    ],
    patterns: ['soundwave', 'notes', 'vinyl'],
    accent: '#ff00ff'
  },
  'Other': {
    gradients: [
      ['#667eea', '#764ba2'], // Default purple
      ['#6b73ff', '#000dff'], // Blue gradient
      ['#36d1dc', '#5b86e5'], // Sky blue
      ['#141e30', '#243b55'], // Dark blue
    ],
    patterns: ['abstract', 'minimal', 'geometric'],
    accent: '#4a90e2'
  }
};

export default function ArtworkV2Page() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState<GenerationResult[]>([]);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [selectedStyle, setSelectedStyle] = useState('modern');
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

  const generateModernArtwork = (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, product: Product) => {
    const theme = CATEGORY_THEMES[product.category] || CATEGORY_THEMES['Other'];
    const gradient = theme.gradients[Math.floor(Math.random() * theme.gradients.length)];
    
    // Create gradient background
    const bgGradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    bgGradient.addColorStop(0, gradient[0]);
    bgGradient.addColorStop(1, gradient[1]);
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Add geometric patterns
    ctx.globalAlpha = 0.1;
    ctx.fillStyle = '#ffffff';
    
    // Random geometric shapes
    for (let i = 0; i < 15; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const size = Math.random() * 150 + 50;
      
      ctx.beginPath();
      if (Math.random() > 0.5) {
        // Circles
        ctx.arc(x, y, size, 0, Math.PI * 2);
      } else {
        // Hexagons
        const sides = 6;
        for (let j = 0; j <= sides; j++) {
          const angle = (j * 2 * Math.PI) / sides - Math.PI / 2;
          const px = x + size * Math.cos(angle);
          const py = y + size * Math.sin(angle);
          if (j === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
      }
      ctx.fill();
    }
    
    ctx.globalAlpha = 1;

    // Add glass morphism effect
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fillRect(50, canvas.height / 2 - 100, canvas.width - 100, 200);
    
    // Add brand name with modern typography
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 10;
    
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 52px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(product.brand.toUpperCase(), canvas.width / 2, canvas.height / 2 - 20);
    
    // Add category with smaller text
    ctx.font = '24px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fillText(product.category, canvas.width / 2, canvas.height / 2 + 30);
    
    ctx.restore();

    // Add accent elements
    ctx.strokeStyle = theme.accent;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2 - 80, canvas.height / 2 + 60);
    ctx.lineTo(canvas.width / 2 + 80, canvas.height / 2 + 60);
    ctx.stroke();
  };

  const generateMinimalArtwork = (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, product: Product) => {
    const theme = CATEGORY_THEMES[product.category] || CATEGORY_THEMES['Other'];
    const gradient = theme.gradients[0];
    
    // Solid color or subtle gradient
    const bgGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    bgGradient.addColorStop(0, gradient[0]);
    bgGradient.addColorStop(1, gradient[0] + '22'); // Very subtle gradient
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Large first letter
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 180px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.globalAlpha = 0.1;
    ctx.fillText(product.brand.charAt(0), canvas.width / 2, canvas.height / 2);
    
    ctx.globalAlpha = 1;
    
    // Brand name
    ctx.font = 'bold 48px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillText(product.brand, canvas.width / 2, canvas.height / 2);
    
    // Simple line accent
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2 - 100, canvas.height / 2 + 40);
    ctx.lineTo(canvas.width / 2 + 100, canvas.height / 2 + 40);
    ctx.stroke();
  };

  const generatePremiumArtwork = (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, product: Product) => {
    const theme = CATEGORY_THEMES[product.category] || CATEGORY_THEMES['Other'];
    const gradient = theme.gradients[Math.floor(Math.random() * theme.gradients.length)];
    
    // Dark background
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Gradient overlay
    const overlay = ctx.createRadialGradient(
      canvas.width / 2, canvas.height / 2, 0,
      canvas.width / 2, canvas.height / 2, canvas.width / 2
    );
    overlay.addColorStop(0, gradient[0] + '66');
    overlay.addColorStop(1, gradient[1] + '33');
    ctx.fillStyle = overlay;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Premium gold/silver accents
    const accentGradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
    accentGradient.addColorStop(0, '#ffd700');
    accentGradient.addColorStop(0.5, '#ffffff');
    accentGradient.addColorStop(1, '#ffd700');
    
    // Decorative frame
    ctx.strokeStyle = accentGradient;
    ctx.lineWidth = 3;
    ctx.strokeRect(30, 30, canvas.width - 60, canvas.height - 60);
    
    // Brand text with gold gradient
    ctx.font = 'bold 56px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = accentGradient;
    ctx.fillText(product.brand.toUpperCase(), canvas.width / 2, canvas.height / 2 - 20);
    
    // Category in elegant font
    ctx.font = 'italic 22px Georgia, serif';
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.8;
    ctx.fillText(product.category, canvas.width / 2, canvas.height / 2 + 30);
    
    // Premium badge
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.arc(canvas.width - 60, 60, 30, 0, Math.PI * 2);
    ctx.fillStyle = accentGradient;
    ctx.fill();
    ctx.fillStyle = '#0a0a0a';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PRO', canvas.width - 60, 65);
  };

  const generateArtworkForProduct = async (product: Product, style: string = 'modern'): Promise<string> => {
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) throw new Error('Could not get canvas context');

    // Apply selected style
    switch (style) {
      case 'minimal':
        generateMinimalArtwork(canvas, ctx, product);
        break;
      case 'premium':
        generatePremiumArtwork(canvas, ctx, product);
        break;
      case 'modern':
      default:
        generateModernArtwork(canvas, ctx, product);
        break;
    }

    return canvas.toDataURL('image/png');
  };

  const uploadArtworkToStorage = async (dataUrl: string, productId: string): Promise<string> => {
    const storageRef = ref(storage, `artwork/v2/${productId}_${Date.now()}.png`);
    await uploadString(storageRef, dataUrl, 'data_url');
    return await getDownloadURL(storageRef);
  };

  const generatePreview = async (product: Product) => {
    const artworkDataUrl = await generateArtworkForProduct(product, selectedStyle);
    setPreviewUrls(prev => ({ ...prev, [product.id]: artworkDataUrl }));
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
        // Generate artwork with selected style
        const artworkDataUrl = await generateArtworkForProduct(product, selectedStyle);
        
        // Upload to Firebase Storage
        const downloadUrl = await uploadArtworkToStorage(artworkDataUrl, product.id);

        // Update product with artwork URL
        await updateDoc(doc(db, 'products', product.id), {
          artwork_url: downloadUrl,
          artwork_mode: 'v2',
          artwork_style: selectedStyle,
          artwork_generated_at: Timestamp.now()
        });

        // Also add to artwork collection
        await addDoc(collection(db, 'artwork'), {
          name: `${product.brand} ${product.name}`,
          url: downloadUrl,
          thumbnailUrl: downloadUrl,
          category: product.category.toLowerCase().replace(/\s+/g, '-'),
          tags: [
            product.brand.toLowerCase(),
            product.category.toLowerCase(),
            'generated-v2',
            selectedStyle,
            'giftcard'
          ],
          dimensions: { width: 600, height: 400 },
          fileSize: 0,
          uploadedAt: Timestamp.now(),
          usageCount: 1,
          productId: product.id,
          style: selectedStyle
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
          <h1 className="text-4xl font-bold text-white mb-4">Enhanced Artwork Generator V2</h1>
          <p className="text-gray-400">Generate beautiful, professional artwork for your gift cards</p>
        </div>

        {/* Style Selector */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-white mb-4">Choose Artwork Style</h3>
          <div className="grid grid-cols-3 gap-4">
            <Card 
              className={`bg-gray-900 border-2 p-6 cursor-pointer transition-all ${
                selectedStyle === 'modern' ? 'border-blue-500 bg-blue-500/10' : 'border-gray-800'
              }`}
              onClick={() => setSelectedStyle('modern')}
            >
              <div className="flex items-center gap-3 mb-2">
                <Sparkles className="h-6 w-6 text-blue-500" />
                <h4 className="text-white font-semibold">Modern</h4>
              </div>
              <p className="text-sm text-gray-400">
                Vibrant gradients with geometric patterns and glass morphism effects
              </p>
            </Card>

            <Card 
              className={`bg-gray-900 border-2 p-6 cursor-pointer transition-all ${
                selectedStyle === 'minimal' ? 'border-blue-500 bg-blue-500/10' : 'border-gray-800'
              }`}
              onClick={() => setSelectedStyle('minimal')}
            >
              <div className="flex items-center gap-3 mb-2">
                <ImageIcon className="h-6 w-6 text-purple-500" />
                <h4 className="text-white font-semibold">Minimal</h4>
              </div>
              <p className="text-sm text-gray-400">
                Clean, simple designs with subtle colors and typography focus
              </p>
            </Card>

            <Card 
              className={`bg-gray-900 border-2 p-6 cursor-pointer transition-all ${
                selectedStyle === 'premium' ? 'border-blue-500 bg-blue-500/10' : 'border-gray-800'
              }`}
              onClick={() => setSelectedStyle('premium')}
            >
              <div className="flex items-center gap-3 mb-2">
                <Palette className="h-6 w-6 text-yellow-500" />
                <h4 className="text-white font-semibold">Premium</h4>
              </div>
              <p className="text-sm text-gray-400">
                Luxurious dark themes with gold accents and elegant typography
              </p>
            </Card>
          </div>
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
                <p className="text-sm text-gray-400">Need Update</p>
                <p className="text-3xl font-bold text-yellow-500">{products.length}</p>
              </div>
              <RefreshCw className="h-8 w-8 text-yellow-500" />
            </div>
          </Card>
        </div>

        {/* Preview Section */}
        {!generating && products.length > 0 && (
          <Card className="bg-gray-900 border-gray-800 p-6 mb-8">
            <h3 className="text-xl font-bold text-white mb-4">Preview Selected Style</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {products.slice(0, 4).map((product) => (
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
                  <p className="text-xs text-gray-400 text-center truncate">{product.brand}</p>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Action Section */}
        <Card className="bg-gradient-to-r from-blue-600 to-purple-600 p-8 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Generate Artwork</h2>
              <p className="text-white/80">
                Generate {selectedStyle} style artwork for all {products.length} products
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
                  {result.error && (
                    <span className="text-sm text-gray-400">{result.error}</span>
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