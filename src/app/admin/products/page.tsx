"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { db, storage } from "@/lib/firebase-config";
import { 
  collection, 
  doc, 
  getDocs, 
  addDoc,
  updateDoc, 
  deleteDoc,
  Timestamp,
  query,
  orderBy,
  writeBatch,
  getDoc,
  where
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { 
  Search, 
  Upload, 
  Download, 
  Edit2, 
  Trash2, 
  Plus,
  FileSpreadsheet,
  Package,
  DollarSign,
  AlertCircle,
  X,
  CreditCard,
  Hash,
  Image as ImageIcon,
  FileImage,
  ImagePlus,
  Grid,
  List,
  Palette
} from "lucide-react";
import { optimizeImage, validateImageFile, generateArtworkFilename, ARTWORK_DIMENSIONS } from "@/lib/image-optimizer";
import Image from "next/image";
import { ArtworkGalleryModal } from "@/components/admin/artwork-gallery-modal";
import { addSerialCodes } from "@/lib/inventory-service";
import { matchArtworkForProduct, batchMatchArtwork } from "@/lib/artwork-matcher";

interface ProductSerial {
  code: string;
  status: 'available' | 'sold' | 'reserved';
  soldAt?: Timestamp;
  orderId?: string;
}

interface ProductDenomination {
  value: number;
  stock: number;
  serials: ProductSerial[];
  artworkUrl?: string; // Denomination-specific artwork
}

interface Product {
  id: string;
  brand: string;
  name: string;
  category: string;
  description: string;
  logo: string;
  defaultArtworkUrl?: string; // Default artwork for all denominations
  denominations: ProductDenomination[];
  supplierId: string;
  supplierName: string;
  commission: number; // percentage
  status: 'active' | 'inactive' | 'out_of_stock';
  featured: boolean; // Show on homepage
  popularity: number;
  totalSold: number;
  bgColor: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export default function ProductsPage() {
  const { user, platformUser, loading: authLoading, isAdmin } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const artworkInputRef = useRef<HTMLInputElement>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isArtworkModalOpen, setIsArtworkModalOpen] = useState(false);
  const [selectedDenomination, setSelectedDenomination] = useState<number | 'default'>('default');
  const [artworkPreview, setArtworkPreview] = useState<string | null>(null);
  const [uploadingArtwork, setUploadingArtwork] = useState(false);
  const [showArtworkGallery, setShowArtworkGallery] = useState(false);
  const [selectedArtworkForProduct, setSelectedArtworkForProduct] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [formData, setFormData] = useState({
    brand: '',
    name: '',
    category: '',
    description: '',
    logo: '',
    defaultArtworkUrl: '',
    supplierId: '',
    supplierName: '',
    commission: 10,
    bgColor: '#000000',
    status: 'active' as const,
    featured: false,
    denominations: [{ value: 25, stock: 0, serials: [] }] as ProductDenomination[]
  });

  // Check admin access
  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.push('/dashboard');
    }
  }, [authLoading, isAdmin, router]);

  // Load products from Firestore
  useEffect(() => {
    const loadProducts = async () => {
      try {
        const q = query(collection(db, 'products'), orderBy('brand', 'asc'));
        const snapshot = await getDocs(q);
        const productsData: Product[] = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Product));
        setProducts(productsData);
      } catch (error) {
        console.error('Error loading products:', error);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading && isAdmin) {
      loadProducts();
    }
  }, [authLoading, isAdmin]);

  const downloadCSVTemplate = () => {
    // Create CSV template with headers and sample data
    const headers = [
      'brand',
      'name', 
      'category',
      'description',
      'logo_url',
      'supplier_id',
      'supplier_name',
      'commission',
      'denominations',
      'serials',
      'bg_color',
      'status',
      'artwork_mode', // New: auto, manual, or specific URL
      'artwork_url' // New: optional, used when artwork_mode is manual
    ];
    
    const sampleData = [
      [
        'Amazon',
        'Amazon Gift Card',
        'Shopping',
        'Shop millions of products on Amazon',
        'https://example.com/amazon-logo.png',
        'supplier_001',
        'Blackhawk Network',
        '10',
        '25;50;100;200', // Multiple denominations separated by semicolon
        'AMZ25001:25;AMZ25002:25;AMZ50001:50;AMZ50002:50;AMZ100001:100', // Format: serial:denomination
        '#FF9900',
        'active',
        'auto', // Will auto-match based on brand "Amazon"
        '' // Leave empty for auto mode
      ],
      [
        'iTunes',
        'iTunes Gift Card',
        'Entertainment',
        'Music, movies, and more on iTunes',
        'https://example.com/itunes-logo.png',
        'supplier_002',
        'InComm Payments',
        '12',
        '15;25;50;100',
        'ITU15001:15;ITU15002:15;ITU25001:25;ITU50001:50',
        '#FC3C44',
        'active',
        'auto', // Will auto-match based on brand "iTunes" and category "Entertainment"
        ''
      ],
      [
        'Steam',
        'Steam Wallet Card',
        'Gaming',
        'Games and software on Steam',
        'https://example.com/steam-logo.png',
        'supplier_002',
        'InComm Payments',
        '8',
        '20;50;100',
        'STM20001:20;STM20002:20;STM50001:50;STM100001:100',
        '#171A21',
        'active',
        'manual', // Use specific URL provided
        'https://example.com/custom-steam-artwork.jpg' // Custom artwork URL
      ],
      [
        'Starbucks',
        'Starbucks Card',
        'Dining',
        'Coffee and treats at Starbucks',
        'https://example.com/starbucks-logo.png',
        'supplier_003',
        'Blackhawk Network',
        '8',
        '10;25;50',
        'SBX10001:10;SBX25001:25;SBX50001:50',
        '#00704A',
        'active',
        'auto', // Will match based on "Starbucks" and "Dining" category
        ''
      ]
    ];
    
    // Add instructions as comments
    const instructions = [
      '# CSV Import Instructions:',
      '# artwork_mode options:',
      '#   - auto: System will automatically match artwork based on brand/name/category',
      '#   - manual: Use the URL provided in artwork_url column',
      '#   - leave empty: No artwork will be assigned',
      '# ',
      '# The auto mode uses intelligent matching:',
      '#   1. Exact brand match from artwork repository',
      '#   2. Category-based matching (gaming, entertainment, shopping, etc.)',
      '#   3. Tag-based fuzzy matching',
      '#   4. Default/generic artwork as fallback',
      '# ',
      '# Tips for best results:',
      '#   - Upload brand-specific artwork to the repository first',
      '#   - Use consistent naming (e.g., "Amazon" not "AMZN")',
      '#   - Set appropriate categories for better matching',
      '# '
    ];
    
    // Combine instructions, headers and sample data
    const csvContent = [
      ...instructions,
      headers.join(','),
      ...sampleData.map(row => row.join(','))
    ].join('\n');
    
    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'product_import_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCSVUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const text = await file.text();
      const lines = text.split('\n');
      const headers = lines[0].split(',').map(h => h.trim());
      
      const importResults = [];
      
      // Skip comment lines and find header row
      let headerIndex = 0;
      for (let i = 0; i < lines.length; i++) {
        if (!lines[i].startsWith('#') && lines[i].includes('brand')) {
          headerIndex = i;
          break;
        }
      }
      
      // Prepare products for batch artwork matching
      const productsToMatch: Array<{ name: string; brand: string; category?: string; rowIndex: number }> = [];
      
      for (let i = headerIndex + 1; i < lines.length; i++) {
        if (lines[i].startsWith('#')) continue; // Skip comment lines
        const values = lines[i].split(',').map(v => v.trim());
        if (values.length < 12 || !values[0]) continue; // Skip empty rows
        
        const artworkMode = values[12] || 'auto';
        if (artworkMode === 'auto') {
          productsToMatch.push({
            brand: values[0],
            name: values[1],
            category: values[2],
            rowIndex: i
          });
        }
      }
      
      // Batch match artwork for all auto-mode products
      console.log(`Matching artwork for ${productsToMatch.length} products...`);
      const artworkMap = await batchMatchArtwork(productsToMatch);
      
      // Process each product
      for (let i = headerIndex + 1; i < lines.length; i++) {
        if (lines[i].startsWith('#')) continue; // Skip comment lines
        const values = lines[i].split(',').map(v => v.trim());
        if (values.length < 12 || !values[0]) continue; // Skip empty rows

        const brand = values[0];
        const name = values[1];
        
        // Parse denominations
        const denominationValues = values[8] ? values[8].split(';').map(d => parseInt(d.trim())) : [];
        
        // Parse serials and group by denomination
        const serialsData = values[9] ? values[9].split(';') : [];
        const denominationsMap = new Map<number, string[]>();
        
        serialsData.forEach(serialEntry => {
          const [code, denomStr] = serialEntry.split(':');
          const denom = parseInt(denomStr);
          if (!denominationsMap.has(denom)) {
            denominationsMap.set(denom, []);
          }
          denominationsMap.get(denom)?.push(code.trim());
        });
        
        // Check if product exists
        const existingProducts = await getDocs(
          query(
            collection(db, 'products'),
            where('brand', '==', brand),
            where('name', '==', name)
          )
        );
        
        let productId: string;
        
        if (existingProducts.empty) {
          // Create new product with initial denominations (no serials yet)
          const denominations: ProductDenomination[] = denominationValues.map(value => ({
            value,
            stock: 0,
            serials: []
          }));

          // Determine artwork URL
          let artworkUrl = '';
          const artworkMode = values[12] || 'auto';
          
          if (artworkMode === 'manual' && values[13]) {
            artworkUrl = values[13];
            console.log(`Using manual artwork for ${brand}: ${artworkUrl}`);
          } else if (artworkMode === 'auto') {
            const mapKey = `${brand}_${name}`;
            artworkUrl = artworkMap.get(mapKey) || '';
            if (artworkUrl) {
              console.log(`Auto-matched artwork for ${brand}: ${artworkUrl}`);
            } else {
              console.log(`No artwork found for ${brand}, will use default`);
            }
          }
          
          const productData: Omit<Product, 'id'> = {
            brand: values[0],
            name: values[1],
            category: values[2],
            description: values[3],
            logo: values[4],
            defaultArtworkUrl: artworkUrl, // Add artwork URL
            supplierId: values[5],
            supplierName: values[6],
            commission: parseFloat(values[7]) || 10,
            denominations,
            bgColor: values[10] || '#000000',
            status: 'inactive', // Start as inactive until serials are added
            popularity: 0,
            totalSold: 0,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
          };

          const docRef = await addDoc(collection(db, 'products'), productData);
          productId = docRef.id;
        } else {
          productId = existingProducts.docs[0].id;
        }
        
        // Add serials using the inventory service
        for (const [denom, serials] of denominationsMap.entries()) {
          if (serials.length > 0) {
            const result = await addSerialCodes(productId, denom, serials);
            importResults.push({
              product: `${brand} - ${name}`,
              denomination: denom,
              added: result.added,
              duplicates: result.duplicates
            });
          }
        }
      }
      
      // Refresh products list
      const snapshot = await getDocs(collection(db, 'products'));
      const productsData: Product[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Product));
      setProducts(productsData);
      
      // Show import results
      let resultMessage = 'CSV import completed!\n\n';
      importResults.forEach(result => {
        resultMessage += `${result.product} ($${result.denomination}): ${result.added} codes added`;
        if (result.duplicates.length > 0) {
          resultMessage += ` (${result.duplicates.length} duplicates skipped)`;
        }
        resultMessage += '\n';
      });
      
      alert(resultMessage);
    } catch (error) {
      console.error('Error importing CSV:', error);
      alert('Error importing CSV. Please check the file format.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    
    try {
      await deleteDoc(doc(db, 'products', productId));
      setProducts(products.filter(p => p.id !== productId));
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Failed to delete product');
    }
  };

  const handleArtworkUpload = async () => {
    if (!selectedProduct || (!artworkPreview && !selectedArtworkForProduct)) return;

    setUploadingArtwork(true);
    try {
      let downloadUrl: string;
      
      // Check if using gallery selection or new upload
      if (selectedArtworkForProduct) {
        // Using artwork from gallery
        downloadUrl = selectedArtworkForProduct;
      } else if (artworkPreview) {
        // Uploading new artwork
        const file = artworkInputRef.current?.files?.[0];
        if (!file) {
          alert('Please select an image');
          return;
        }

        const validation = validateImageFile(file);
        if (validation !== true) {
          alert(validation);
          return;
        }

        // Optimize image
        const { blob, dataUrl } = await optimizeImage(file, {
          maxWidth: ARTWORK_DIMENSIONS.CARD.width,
          maxHeight: ARTWORK_DIMENSIONS.CARD.height,
          quality: 0.9,
          format: 'webp'
        });

        // Upload to Firebase Storage
        const filename = generateArtworkFilename(
          selectedProduct.id, 
          selectedDenomination, 
          file.name
        );
        const storageRef = ref(storage, filename);
        await uploadBytes(storageRef, blob);
        downloadUrl = await getDownloadURL(storageRef);
        
        // Also add to artwork repository for future use
        await addDoc(collection(db, 'artwork'), {
          name: `${selectedProduct.brand} - ${selectedProduct.name}`,
          url: downloadUrl,
          category: selectedProduct.category || 'Other',
          tags: [selectedProduct.brand.toLowerCase(), selectedProduct.name.toLowerCase()],
          dimensions: ARTWORK_DIMENSIONS.CARD,
          fileSize: blob.size,
          uploadedAt: Timestamp.now(),
          usageCount: 1
        });
      } else {
        alert('Please select or upload an artwork');
        return;
      }

      // Update product in Firestore
      if (selectedDenomination === 'default') {
        // Update default artwork
        await updateDoc(doc(db, 'products', selectedProduct.id), {
          defaultArtworkUrl: downloadUrl,
          updatedAt: Timestamp.now()
        });
        
        // Update local state
        setProducts(products.map(p => 
          p.id === selectedProduct.id 
            ? { ...p, defaultArtworkUrl: downloadUrl }
            : p
        ));
      } else {
        // Update denomination-specific artwork
        const updatedDenominations = selectedProduct.denominations.map(d => 
          d.value === selectedDenomination
            ? { ...d, artworkUrl: downloadUrl }
            : d
        );
        
        await updateDoc(doc(db, 'products', selectedProduct.id), {
          denominations: updatedDenominations,
          updatedAt: Timestamp.now()
        });
        
        // Update local state
        setProducts(products.map(p => 
          p.id === selectedProduct.id 
            ? { ...p, denominations: updatedDenominations }
            : p
        ));
      }

      setArtworkPreview(null);
      setSelectedArtworkForProduct(null);
      setIsArtworkModalOpen(false);
      alert('Artwork updated successfully!');
    } catch (error) {
      console.error('Error uploading artwork:', error);
      alert('Failed to upload artwork');
    } finally {
      setUploadingArtwork(false);
      if (artworkInputRef.current) {
        artworkInputRef.current.value = '';
      }
    }
  };

  const openArtworkModal = (product: Product, denomination: number | 'default' = 'default') => {
    setSelectedProduct(product);
    setSelectedDenomination(denomination);
    setIsArtworkModalOpen(true);
  };

  const handleSaveProduct = async () => {
    try {
      if (!formData.brand || !formData.name) {
        alert('Brand and Name are required');
        return;
      }

      // Prepare product data - keep existing serials, don't override them
      const productData = {
        brand: formData.brand,
        name: formData.name,
        category: formData.category,
        description: formData.description,
        logoUrl: formData.logo,
        defaultArtworkUrl: formData.defaultArtworkUrl,
        supplierId: formData.supplierId,
        supplierName: formData.supplierName,
        commission: formData.commission,
        bgColor: formData.bgColor,
        status: formData.status,
        featured: formData.featured,
        popularity: selectedProduct?.popularity || 0,
        totalSold: selectedProduct?.totalSold || 0,
        createdAt: selectedProduct?.createdAt || Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      if (selectedProduct) {
        // Update existing product - DO NOT touch denominations/serials
        await updateDoc(doc(db, 'products', selectedProduct.id), productData);
        
        // Update local state
        setProducts(products.map(p => 
          p.id === selectedProduct.id 
            ? { ...p, ...productData, denominations: p.denominations, id: selectedProduct.id } 
            : p
        ));
        
        alert('Product updated successfully! Note: Serial codes are managed separately.');
      } else {
        // Create new product with denominations structure
        const newProductData = {
          ...productData,
          denominations: formData.denominations.map((d: ProductDenomination) => ({
            value: d.value,
            stock: 0,
            serials: [],
            artworkUrl: d.artworkUrl || ''
          }))
        };
        
        const docRef = await addDoc(collection(db, 'products'), newProductData);
        const newProduct = { ...newProductData, id: docRef.id };
        setProducts([...products, newProduct]);
        
        alert('Product created successfully! Now add serial codes to activate inventory.');
      }

      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error saving product:', error);
      alert('Failed to save product');
    }
  };

  // Separate function to handle adding serial codes
  const handleAddSerialCodes = async (productId: string, denomination: number, serialCodes: string[]) => {
    try {
      const result = await addSerialCodes(productId, denomination, serialCodes);
      
      if (result.success) {
        // Refresh the product to get updated data
        const productDoc = await getDoc(doc(db, 'products', productId));
        if (productDoc.exists()) {
          const updatedProduct = { ...productDoc.data(), id: productId };
          setProducts(products.map(p => 
            p.id === productId ? updatedProduct : p
          ));
        }
        
        alert(`Successfully added ${result.added} serial codes. Duplicates: ${result.duplicates.length}`);
        return true;
      } else {
        alert(`Failed to add serial codes: ${result.error}`);
        return false;
      }
    } catch (error) {
      console.error('Error adding serial codes:', error);
      alert('Failed to add serial codes');
      return false;
    }
  };

  const resetForm = () => {
    setFormData({
      brand: '',
      name: '',
      category: '',
      description: '',
      logo: '',
      defaultArtworkUrl: '',
      supplierId: '',
      supplierName: '',
      commission: 10,
      bgColor: '#000000',
      status: 'active',
      featured: false,
      denominations: [{ value: 25, stock: 0, serials: [] }]
    });
    setSelectedProduct(null);
  };

  const openProductModal = (product?: Product) => {
    if (product) {
      setSelectedProduct(product);
      setFormData({
        brand: product.brand,
        name: product.name,
        category: product.category,
        description: product.description,
        logo: product.logo,
        defaultArtworkUrl: product.defaultArtworkUrl || '',
        supplierId: product.supplierId,
        supplierName: product.supplierName,
        commission: product.commission,
        bgColor: product.bgColor,
        status: product.status,
        featured: product.featured || false,
        denominations: product.denominations
      });
    } else {
      resetForm();
    }
    setIsModalOpen(true);
  };

  const filteredProducts = products.filter(product =>
    product.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getTotalStock = (product: Product) => {
    return product.denominations.reduce((total, denom) => total + denom.stock, 0);
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Products Management</h1>
          <p className="text-gray-400 mt-1">Manage gift cards, denominations, and serial codes</p>
        </div>
        <div className="flex items-center space-x-3">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleCSVUpload}
            accept=".csv"
            className="hidden"
            aria-label="CSV file upload"
          />
          
          {/* View Mode Toggle */}
          <div className="flex bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded ${viewMode === 'grid' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}
              title="Grid view"
            >
              <Grid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded ${viewMode === 'list' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}
              title="List view"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
          
          <button
            onClick={() => router.push('/admin/inventory')}
            className="flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
            title="View inventory dashboard"
          >
            <Package className="h-4 w-4 mr-2" />
            Inventory
          </button>
          
          <button
            onClick={() => router.push('/admin/artwork')}
            className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            title="Manage artwork repository"
          >
            <Palette className="h-4 w-4 mr-2" />
            Artwork
          </button>
          
          <button
            onClick={() => router.push('/admin/csv-builder')}
            className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            title="Build CSV with guided interface"
          >
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            CSV Builder
          </button>
          
          <button
            onClick={downloadCSVTemplate}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            title="Download CSV template with sample data"
          >
            <Download className="h-4 w-4 mr-2" />
            Template
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex items-center px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            <Upload className="h-4 w-4 mr-2" />
            {isUploading ? 'Uploading...' : 'Import'}
          </button>
          <button
            onClick={() => openProductModal()}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search products by brand, name, or category..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-gray-900 border border-gray-800 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Products Display */}
      {viewMode === 'grid' ? (
        // Compact Grid View
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredProducts.map((product) => (
            <div key={product.id} className="bg-gray-900 rounded-lg overflow-hidden border border-gray-800 hover:border-gray-600 transition-all">
              {/* Compact Artwork Display */}
              {(product.defaultArtworkUrl || product.denominations.some(d => d.artworkUrl)) && (
                <div className="relative h-32 bg-gray-800">
                  <Image
                    src={product.defaultArtworkUrl || product.denominations.find(d => d.artworkUrl)?.artworkUrl || ''}
                    alt={`${product.brand} ${product.name}`}
                    fill
                    className="object-cover"
                  />
                  {product.featured && (
                    <div className="absolute top-1 right-1 bg-yellow-500 text-black px-1.5 py-0.5 rounded text-xs font-semibold">
                      Featured
                    </div>
                  )}
                </div>
              )}
              
              <div className="p-3">
                <div className="flex justify-between items-start mb-2">
                  <div 
                    className="w-10 h-10 rounded flex items-center justify-center text-sm font-bold"
                    style={{ backgroundColor: product.bgColor }}
                  >
                    {product.brand.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="flex space-x-1">
                    <button
                      onClick={() => openArtworkModal(product)}
                      className="p-1 text-gray-400 hover:text-blue-400 hover:bg-gray-800 rounded transition-colors"
                      aria-label="Upload artwork"
                      title="Upload artwork"
                    >
                      <ImageIcon className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => openProductModal(product)}
                      className="p-1 text-gray-400 hover:text-white hover:bg-gray-800 rounded transition-colors"
                      aria-label="Edit product"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteProduct(product.id)}
                      className="p-1 text-gray-400 hover:text-red-400 hover:bg-gray-800 rounded transition-colors"
                      aria-label="Delete product"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <h3 className="text-sm font-semibold text-white truncate">{product.brand}</h3>
                <p className="text-xs text-gray-400 truncate mb-2">{product.name}</p>

                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Stock:</span>
                    <span className="text-white">{getTotalStock(product)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Commission:</span>
                    <span className="text-white">{product.commission}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Status:</span>
                    <span className={`px-1.5 py-0.5 rounded text-xs ${
                      product.status === 'active' ? 'bg-green-900 text-green-300' :
                      product.status === 'inactive' ? 'bg-gray-700 text-gray-300' :
                      'bg-red-900 text-red-300'
                    }`}>
                      {product.status}
                    </span>
                  </div>
                </div>

                {/* Compact Denomination Display */}
                <div className="mt-2 pt-2 border-t border-gray-800">
                  <div className="flex flex-wrap gap-1">
                    {product.denominations.slice(0, 3).map((denom, idx) => (
                      <span 
                        key={idx} 
                        className="bg-gray-800 px-1.5 py-0.5 rounded text-xs"
                      >
                        ${denom.value}
                      </span>
                    ))}
                    {product.denominations.length > 3 && (
                      <span className="text-xs text-gray-500">+{product.denominations.length - 3}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        // List View
        <div className="space-y-2">
          {filteredProducts.map((product) => (
            <div key={product.id} className="bg-gray-900 rounded-lg border border-gray-800 hover:border-gray-600 transition-all p-4">
              <div className="flex items-center gap-4">
                {/* Thumbnail */}
                {product.defaultArtworkUrl ? (
                  <div className="relative w-20 h-20 bg-gray-800 rounded overflow-hidden flex-shrink-0">
                    <Image
                      src={product.defaultArtworkUrl}
                      alt={`${product.brand} ${product.name}`}
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div 
                    className="w-20 h-20 rounded flex items-center justify-center text-lg font-bold flex-shrink-0"
                    style={{ backgroundColor: product.bgColor }}
                  >
                    {product.brand.substring(0, 2).toUpperCase()}
                  </div>
                )}
                
                {/* Product Info */}
                <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">Brand</p>
                    <p className="text-sm font-semibold text-white">{product.brand}</p>
                    <p className="text-xs text-gray-400">{product.name}</p>
                  </div>
                  
                  <div>
                    <p className="text-xs text-gray-500">Category</p>
                    <p className="text-sm text-white">{product.category || 'N/A'}</p>
                  </div>
                  
                  <div>
                    <p className="text-xs text-gray-500">Stock / Commission</p>
                    <p className="text-sm text-white">{getTotalStock(product)} / {product.commission}%</p>
                  </div>
                  
                  <div>
                    <p className="text-xs text-gray-500">Denominations</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {product.denominations.slice(0, 4).map((denom, idx) => (
                        <span key={idx} className="bg-gray-800 px-1.5 py-0.5 rounded text-xs">
                          ${denom.value}
                        </span>
                      ))}
                      {product.denominations.length > 4 && (
                        <span className="text-xs text-gray-500">+{product.denominations.length - 4}</span>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-xs text-gray-500">Status</p>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        product.status === 'active' ? 'bg-green-900 text-green-300' :
                        product.status === 'inactive' ? 'bg-gray-700 text-gray-300' :
                        'bg-red-900 text-red-300'
                      }`}>
                        {product.status}
                      </span>
                      {product.featured && (
                        <span className="bg-yellow-900 text-yellow-300 px-2 py-1 rounded text-xs">
                          Featured
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => openArtworkModal(product)}
                    className="p-2 text-gray-400 hover:text-blue-400 hover:bg-gray-800 rounded-lg transition-colors"
                    title="Upload artwork"
                  >
                    <ImageIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => openProductModal(product)}
                    className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                    title="Edit product"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteProduct(product.id)}
                    className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-800 rounded-lg transition-colors"
                    title="Delete product"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {filteredProducts.length === 0 && (
        <div className="text-center py-12">
          <Package className="h-12 w-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">No products found</p>
        </div>
      )}

      {/* Product Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-800">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-white">
                  {selectedProduct ? 'Edit Product' : 'Add New Product'}
                </h2>
                <button
                  onClick={() => {
                    setIsModalOpen(false);
                    resetForm();
                  }}
                  className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Brand */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Brand *</label>
                <input
                  type="text"
                  value={formData.brand}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Amazon"
                />
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Product Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Amazon Gift Card"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Category</option>
                  <option value="Shopping">Shopping</option>
                  <option value="Entertainment">Entertainment</option>
                  <option value="Gaming">Gaming</option>
                  <option value="Food">Food</option>
                  <option value="Travel">Travel</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Product description..."
                />
              </div>

              {/* Logo URL */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Logo URL</label>
                <input
                  type="text"
                  value={formData.logo}
                  onChange={(e) => setFormData({ ...formData, logo: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                  placeholder="https://example.com/logo.png"
                />
              </div>

              {/* Default Artwork */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Default Artwork</label>
                <div className="space-y-2">
                  {/* Current Artwork Preview */}
                  {formData.defaultArtworkUrl && (
                    <div className="relative w-full h-32 bg-gray-800 rounded-lg overflow-hidden">
                      <Image
                        src={formData.defaultArtworkUrl}
                        alt="Default artwork"
                        fill
                        className="object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, defaultArtworkUrl: '' })}
                        className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded hover:bg-red-700"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                  
                  {/* Selection Buttons */}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowArtworkGallery(true);
                        setSelectedArtworkForProduct(formData.defaultArtworkUrl);
                      }}
                      className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <ImagePlus className="h-4 w-4" />
                      Select from Gallery
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        // This will open the artwork upload modal after the product is saved
                        alert('Save the product first, then upload artwork from the product card');
                      }}
                      className="flex-1 px-3 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors flex items-center justify-center gap-2"
                    >
                      <Upload className="h-4 w-4" />
                      Upload New
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Supplier ID */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Supplier ID</label>
                  <input
                    type="text"
                    value={formData.supplierId}
                    onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                    placeholder="SUP001"
                  />
                </div>

                {/* Supplier Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Supplier Name</label>
                  <input
                    type="text"
                    value={formData.supplierName}
                    onChange={(e) => setFormData({ ...formData, supplierName: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                    placeholder="Supplier Name"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Commission */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Commission (%)</label>
                  <input
                    type="number"
                    value={formData.commission}
                    onChange={(e) => setFormData({ ...formData, commission: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                    min="0"
                    max="100"
                  />
                </div>

                {/* Background Color */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Background Color</label>
                  <input
                    type="color"
                    value={formData.bgColor}
                    onChange={(e) => setFormData({ ...formData, bgColor: e.target.value })}
                    className="w-full h-10 bg-gray-800 border border-gray-700 rounded-lg cursor-pointer"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="out_of_stock">Out of Stock</option>
                  </select>
                </div>

                {/* Featured */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Featured Product</label>
                  <div className="flex items-center h-10">
                    <input
                      type="checkbox"
                      checked={formData.featured}
                      onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                      className="w-4 h-4 text-blue-600 bg-gray-800 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                    />
                    <label className="ml-2 text-sm text-gray-400">
                      Show on homepage
                    </label>
                  </div>
                </div>
              </div>

              {/* Denominations */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Denominations & Serial Codes</label>
                <div className="space-y-4">
                  {formData.denominations.map((denom, idx) => (
                    <div key={idx} className="border border-gray-700 rounded-lg p-4 space-y-3">
                      <div className="flex items-center space-x-2">
                        <div className="flex-1">
                          <label className="text-xs text-gray-400">Value ($)</label>
                          <input
                            type="number"
                            value={denom.value}
                            onChange={(e) => {
                              const newDenoms = [...formData.denominations];
                              newDenoms[idx] = { ...denom, value: parseInt(e.target.value) || 0 };
                              setFormData({ ...formData, denominations: newDenoms });
                            }}
                            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                            placeholder="Denomination value"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="text-xs text-gray-400">Current Stock</label>
                          <input
                            type="text"
                            value={`${denom.serials?.filter((s: any) => s.status === 'available').length || 0} available`}
                            disabled
                            className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-gray-400"
                          />
                        </div>
                        <button
                          onClick={() => {
                            setFormData({
                              ...formData,
                              denominations: formData.denominations.filter((_, i) => i !== idx)
                            });
                          }}
                          className="p-2 text-red-400 hover:text-red-300 mt-4"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      
                      {/* Serial Codes Section */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <label className="text-xs text-gray-400">Serial Codes Management</label>
                          <span className="text-xs text-gray-500">
                            {denom.serials?.length || 0} total, 
                            {denom.serials?.filter((s: any) => s.status === 'available').length || 0} available
                          </span>
                        </div>
                        {selectedProduct ? (
                          <>
                            <textarea
                              id={`serials-${denom.value}`}
                              placeholder="Enter new serial codes to add, one per line"
                              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm font-mono focus:ring-2 focus:ring-blue-500"
                              rows={3}
                            />
                            <button
                              type="button"
                              onClick={async () => {
                                const textarea = document.getElementById(`serials-${denom.value}`) as HTMLTextAreaElement;
                                const codes = textarea.value.split('\n').filter(code => code.trim()).map(c => c.trim());
                                
                                if (codes.length === 0) {
                                  alert('Please enter at least one serial code');
                                  return;
                                }
                                
                                const result = await handleAddSerialCodes(selectedProduct.id, denom.value, codes);
                                if (result) {
                                  textarea.value = ''; // Clear on success
                                  // Refresh form data with updated product
                                  const updatedProduct = products.find(p => p.id === selectedProduct.id);
                                  if (updatedProduct) {
                                    setFormData({
                                      ...formData,
                                      denominations: updatedProduct.denominations
                                    });
                                  }
                                }
                              }}
                              className="w-full px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors"
                            >
                              Add Serial Codes to Inventory
                            </button>
                          </>
                        ) : (
                          <div className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg">
                            <p className="text-xs text-gray-500 italic">
                              Save the product first, then you can add serial codes
                            </p>
                          </div>
                        )}
                        {denom.serials && denom.serials.length > 0 && (
                          <div className="text-xs text-gray-500">
                            <details>
                              <summary className="cursor-pointer hover:text-gray-400">
                                View current serials ({denom.serials.length})
                              </summary>
                              <div className="mt-2 max-h-32 overflow-y-auto bg-gray-900 p-2 rounded">
                                {denom.serials.map((serial: any, sIdx: number) => (
                                  <div key={sIdx} className="flex justify-between py-1">
                                    <span className="font-mono">{serial.code}</span>
                                    <span className={`px-2 py-0.5 rounded text-xs ${
                                      serial.status === 'available' ? 'bg-green-900 text-green-300' :
                                      serial.status === 'reserved' ? 'bg-yellow-900 text-yellow-300' :
                                      'bg-gray-700 text-gray-300'
                                    }`}>
                                      {serial.status}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </details>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={() => {
                      setFormData({
                        ...formData,
                        denominations: [...formData.denominations, { value: 0, stock: 0, serials: [] }]
                      });
                    }}
                    className="flex items-center px-3 py-2 bg-gray-800 text-gray-400 hover:text-white border border-gray-700 rounded-lg transition-colors"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Denomination
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => {
                    setIsModalOpen(false);
                    resetForm();
                  }}
                  className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveProduct}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {selectedProduct ? 'Update Product' : 'Create Product'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Artwork Upload Modal */}
      {isArtworkModalOpen && selectedProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-800">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-white">Upload Artwork</h2>
                  <p className="text-gray-400 mt-1">
                    {selectedProduct.brand} - {selectedProduct.name}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setIsArtworkModalOpen(false);
                    setArtworkPreview(null);
                    setSelectedDenomination('default');
                  }}
                  className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Denomination Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Select Denomination
                </label>
                <select
                  value={selectedDenomination}
                  onChange={(e) => setSelectedDenomination(
                    e.target.value === 'default' ? 'default' : Number(e.target.value)
                  )}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="default">Default (All Denominations)</option>
                  {selectedProduct.denominations.map((denom) => (
                    <option key={denom.value} value={denom.value}>
                      ${denom.value}
                    </option>
                  ))}
                </select>
              </div>

              {/* Current Artwork Preview */}
              {(selectedDenomination === 'default' ? selectedProduct.defaultArtworkUrl : 
                selectedProduct.denominations.find(d => d.value === selectedDenomination)?.artworkUrl) && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">
                    Current Artwork
                  </label>
                  <div className="relative w-full h-48 bg-gray-800 rounded-lg overflow-hidden">
                    <Image
                      src={selectedDenomination === 'default' ? selectedProduct.defaultArtworkUrl! : 
                        selectedProduct.denominations.find(d => d.value === selectedDenomination)?.artworkUrl!}
                      alt="Current artwork"
                      fill
                      className="object-contain"
                    />
                  </div>
                </div>
              )}

              {/* Image Requirements */}
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-sm font-medium text-white mb-2">Image Requirements</h3>
                <ul className="text-xs text-gray-400 space-y-1">
                  <li>• Recommended dimensions: {ARTWORK_DIMENSIONS.CARD.width} x {ARTWORK_DIMENSIONS.CARD.height}px (3:2 ratio)</li>
                  <li>• Maximum file size: 10MB</li>
                  <li>• Supported formats: JPEG, PNG, WebP, GIF</li>
                  <li>• Images will be automatically optimized for web display</li>
                </ul>
              </div>

              {/* Artwork Selection Options */}
              <div className="space-y-4">
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Select Artwork
                </label>
                
                {/* Option Buttons */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Select from Gallery */}
                  <button
                    type="button"
                    onClick={() => setShowArtworkGallery(true)}
                    className="flex flex-col items-center justify-center p-6 bg-gray-800 border border-gray-700 rounded-lg hover:bg-gray-700 hover:border-gray-600 transition-colors"
                  >
                    <ImagePlus className="h-8 w-8 text-blue-400 mb-2" />
                    <span className="text-white font-medium">Choose from Gallery</span>
                    <span className="text-xs text-gray-400 mt-1">Select existing artwork</span>
                  </button>
                  
                  {/* Upload New */}
                  <button
                    type="button"
                    onClick={() => artworkInputRef.current?.click()}
                    className="flex flex-col items-center justify-center p-6 bg-gray-800 border border-gray-700 rounded-lg hover:bg-gray-700 hover:border-gray-600 transition-colors"
                  >
                    <Upload className="h-8 w-8 text-green-400 mb-2" />
                    <span className="text-white font-medium">Upload New</span>
                    <span className="text-xs text-gray-400 mt-1">Add new artwork</span>
                  </button>
                </div>
                
                {/* Hidden File Input */}
                <input
                  ref={artworkInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const validation = validateImageFile(file);
                      if (validation === true) {
                        const reader = new FileReader();
                        reader.onload = (ev) => {
                          setArtworkPreview(ev.target?.result as string);
                          setSelectedArtworkForProduct(null); // Clear gallery selection
                        };
                        reader.readAsDataURL(file);
                      } else {
                        alert(validation);
                        e.target.value = '';
                      }
                    }
                  }}
                  className="hidden"
                />
                
                {/* Preview Area */}
                {(artworkPreview || selectedArtworkForProduct) && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-300 mb-3">
                      Selected Artwork
                    </label>
                    <div className="relative w-full h-48 bg-gray-800 rounded-lg overflow-hidden">
                      <Image
                        src={artworkPreview || selectedArtworkForProduct || ''}
                        alt="Selected artwork"
                        fill
                        className="object-contain"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setArtworkPreview(null);
                          setSelectedArtworkForProduct(null);
                        }}
                        className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded hover:bg-red-700"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setIsArtworkModalOpen(false);
                    setArtworkPreview(null);
                    setSelectedDenomination('default');
                  }}
                  className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleArtworkUpload}
                  disabled={(!artworkPreview && !selectedArtworkForProduct) || uploadingArtwork}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {uploadingArtwork ? (
                    <span className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Uploading...
                    </span>
                  ) : (
                    'Save Artwork'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Artwork Gallery Modal */}
      <ArtworkGalleryModal
        isOpen={showArtworkGallery}
        onClose={() => setShowArtworkGallery(false)}
        onSelect={(artwork) => {
          // Check if we're in the product form or artwork upload modal
          if (isModalOpen) {
            // We're in the product creation/edit form
            setFormData({ ...formData, defaultArtworkUrl: artwork.url });
          } else {
            // We're in the artwork upload modal
            setSelectedArtworkForProduct(artwork.url);
            setArtworkPreview(null); // Clear file upload preview
          }
          setShowArtworkGallery(false);
        }}
        selectedArtworkUrl={formData.defaultArtworkUrl || selectedArtworkForProduct || undefined}
      />
    </div>
  );
}