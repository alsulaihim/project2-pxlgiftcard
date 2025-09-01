"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { db } from '@/lib/firebase-config';
import { collection, addDoc, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { Upload, CheckCircle, AlertCircle, Loader2, FileSpreadsheet } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';

interface ParsedProduct {
  brand: string;
  name: string;
  description: string;
  category: string;
  featured: boolean;
  status: string;
  artwork: string;
  denominations: any[];
  totalSold: number;
  createdAt: Date;
}

export default function CSVImportPage() {
  const { user, platformUser } = useAuth();
  const router = useRouter();
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<string[]>([]);
  const [parsedProducts, setParsedProducts] = useState<ParsedProduct[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  // Check if user is admin
  const isAdmin = platformUser?.tier?.current === 'pixlionaire' || 
                  platformUser?.email === 'admin@pxlgiftcard.com';

  // Function to expand serial range (e.g., "AMZN10XXX001-AMZN10XXX015")
  const expandSerialRange = (rangeStr: string): string[] => {
    const [start, end] = rangeStr.split('-');
    if (!start || !end) return [rangeStr]; // Single serial
    
    // Extract the numeric part
    const startMatch = start.match(/(\d+)$/);
    const endMatch = end.match(/(\d+)$/);
    
    if (!startMatch || !endMatch) return [rangeStr];
    
    const prefix = start.substring(0, startMatch.index!);
    const startNum = parseInt(startMatch[1]);
    const endNum = parseInt(endMatch[1]);
    const numDigits = startMatch[1].length;
    
    const serials = [];
    for (let i = startNum; i <= endNum; i++) {
      const paddedNum = i.toString().padStart(numDigits, '0');
      serials.push(prefix + paddedNum);
    }
    
    return serials;
  };

  // Parse denomination string format: "value:quantity:serialRange|..."
  const parseDenominations = (denomStr: string) => {
    const denominations = [];
    const denomParts = denomStr.replace(/"/g, '').split('|');
    
    for (const part of denomParts) {
      const [value, quantity, serialRange] = part.split(':');
      const serials = expandSerialRange(serialRange);
      
      denominations.push({
        value: parseInt(value),
        stock: parseInt(quantity),
        serials: serials.map(code => ({
          code,
          status: 'available'
        }))
      });
    }
    
    return denominations;
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setImportStatus(['File selected: ' + selectedFile.name]);
    
    // Parse CSV
    const text = await selectedFile.text();
    const lines = text.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      setImportStatus(prev => [...prev, '❌ CSV file is empty or invalid']);
      return;
    }

    const headers = lines[0].split(',').map(h => h.trim());
    setImportStatus(prev => [...prev, `Found ${lines.length - 1} products to import`]);

    const products: ParsedProduct[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;
      
      // Parse CSV line (handles quotes in denominations field)
      const values: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      values.push(current.trim()); // Add last value
      
      if (values.length >= 10) {
        const product: ParsedProduct = {
          brand: values[0],
          name: values[1],
          description: values[2],
          category: values[3],
          featured: values[4] === 'true',
          status: values[5],
          artwork: values[6],
          denominations: parseDenominations(values[7]),
          totalSold: parseInt(values[8]) || 0,
          createdAt: values[9] ? new Date(values[9]) : new Date()
        };
        products.push(product);
      }
    }
    
    setParsedProducts(products);
    setImportStatus(prev => [...prev, `✅ Parsed ${products.length} products successfully`]);
  };

  const handleImport = async () => {
    if (!isAdmin) {
      alert('Only administrators can import products');
      return;
    }

    if (parsedProducts.length === 0) {
      alert('No products to import');
      return;
    }

    setIsImporting(true);
    setImportStatus(prev => [...prev, '', 'Starting import...']);

    let successCount = 0;
    let errorCount = 0;
    let skipCount = 0;

    for (const product of parsedProducts) {
      try {
        setImportStatus(prev => [...prev, `Processing: ${product.brand} - ${product.name}`]);
        
        // Check if product already exists
        const existingQuery = await getDocs(
          query(
            collection(db, 'products'),
            where('brand', '==', product.brand),
            where('name', '==', product.name)
          )
        );
        
        if (!existingQuery.empty) {
          setImportStatus(prev => [...prev, `  ⚠️ Product already exists, skipping...`]);
          skipCount++;
          continue;
        }
        
        // Calculate total stock
        const totalStock = product.denominations.reduce((sum, d) => sum + d.stock, 0);
        
        // Create product document
        const productData = {
          brand: product.brand,
          name: product.name,
          description: product.description,
          category: product.category,
          featured: product.featured,
          status: (totalStock > 0 ? product.status : 'out_of_stock') as 'active' | 'out_of_stock' | 'inactive',
          defaultArtworkUrl: '', // Will be set later if artwork exists
          artwork: product.artwork, // Store artwork identifier for later mapping
          denominations: product.denominations,
          totalSold: product.totalSold,
          totalStock,
          popularity: product.totalSold, // Use totalSold as initial popularity
          createdAt: Timestamp.fromDate(product.createdAt),
          updatedAt: Timestamp.now(),
          
          // Additional fields
          supplierId: 'default',
          supplierName: 'Default Supplier',
          commission: 10,
          bgColor: '#000000'
        };
        
        // Add to Firestore
        await addDoc(collection(db, 'products'), productData);
        setImportStatus(prev => [...prev, `  ✅ Created successfully`]);
        successCount++;
        
        // Small delay to prevent rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error('Error importing product:', error);
        setImportStatus(prev => [...prev, `  ❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`]);
        errorCount++;
      }
    }

    setImportStatus(prev => [...prev, 
      '',
      '='.repeat(60),
      '📊 Import Summary:',
      `  ✅ Successfully imported: ${successCount} products`,
      `  ⚠️ Skipped (already exists): ${skipCount} products`,
      `  ❌ Failed: ${errorCount} products`,
      `  📦 Total processed: ${parsedProducts.length} products`,
      '='.repeat(60)
    ]);
    
    setIsComplete(true);
    setIsImporting(false);
  };

  if (!user || !isAdmin) {
    return (
      <div className="container mx-auto p-6">
        <div className="bg-red-500/10 border border-red-500 rounded-lg p-6">
          <h1 className="text-2xl font-bold text-red-500 mb-2">Access Denied</h1>
          <p className="text-gray-400">Only administrators can access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="bg-gray-900 rounded-lg shadow-xl p-8">
        <div className="flex items-center gap-3 mb-6">
          <FileSpreadsheet className="h-8 w-8 text-blue-500" />
          <h1 className="text-3xl font-bold text-white">CSV Product Import</h1>
        </div>

        <div className="bg-blue-500/10 border border-blue-500 rounded-lg p-4 mb-6">
          <h2 className="text-lg font-semibold text-blue-500 mb-2">ℹ️ Import Information</h2>
          <p className="text-gray-300">
            This tool imports products from the CSV file format created for the PXL Giftcard Platform.
            It will parse denominations, expand serial number ranges, and create product entries.
          </p>
        </div>

        {!file && (
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-white mb-4">Select CSV File</h3>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="block w-full text-sm text-gray-400
                file:mr-4 file:py-2 file:px-4
                file:rounded-full file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-600 file:text-white
                hover:file:bg-blue-700"
            />
            <p className="text-sm text-gray-500 mt-2">
              Recommended: Use data/sample-products-import.csv for 50 sample products
            </p>
          </div>
        )}

        {parsedProducts.length > 0 && !isImporting && !isComplete && (
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-white mb-4">Ready to Import</h3>
            <p className="text-gray-300 mb-4">
              Found {parsedProducts.length} products ready to import.
            </p>
            <div className="max-h-40 overflow-y-auto bg-black rounded p-3 mb-4">
              {parsedProducts.slice(0, 10).map((p, i) => (
                <div key={i} className="text-sm text-gray-400">
                  • {p.brand} - {p.name}
                </div>
              ))}
              {parsedProducts.length > 10 && (
                <div className="text-sm text-gray-500 mt-2">
                  ... and {parsedProducts.length - 10} more
                </div>
              )}
            </div>
            <Button
              onClick={handleImport}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Upload className="h-4 w-4 mr-2" />
              Import Products
            </Button>
          </div>
        )}

        {isImporting && (
          <div className="flex items-center gap-2 text-blue-400 mb-4">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Importing products...</span>
          </div>
        )}

        {importStatus.length > 0 && (
          <div className="bg-black rounded-lg p-4 mb-6">
            <h3 className="text-white font-semibold mb-2">Import Log:</h3>
            <div className="font-mono text-sm text-gray-400 space-y-1 max-h-96 overflow-y-auto">
              {importStatus.map((status, index) => (
                <div key={index}>{status}</div>
              ))}
            </div>
          </div>
        )}

        {isComplete && (
          <div className="space-y-4">
            <div className="bg-green-500/10 border border-green-500 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="text-green-500 font-semibold">Import Complete!</span>
              </div>
            </div>
            
            <div className="flex gap-4">
              <Button
                onClick={() => router.push('/admin/products')}
                className="bg-blue-600 hover:bg-blue-700"
              >
                View Products
              </Button>
              <Button
                onClick={() => router.push('/marketplace')}
                variant="outline"
              >
                View Marketplace
              </Button>
              <Button
                onClick={() => window.location.reload()}
                variant="outline"
              >
                Import More
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}