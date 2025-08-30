"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase-config";
import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  Timestamp,
  query,
  orderBy,
  writeBatch
} from "firebase/firestore";
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
  Hash
} from "lucide-react";

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
}

interface Product {
  id: string;
  brand: string;
  name: string;
  category: string;
  description: string;
  logo: string;
  denominations: ProductDenomination[];
  supplierId: string;
  supplierName: string;
  commission: number; // percentage
  status: 'active' | 'inactive' | 'out_of_stock';
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
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

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
      'status'
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
        'active'
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
        'active'
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
        'active'
      ]
    ];
    
    // Combine headers and sample data
    const csvContent = [
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
      
      const batch = writeBatch(db);
      
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        if (values.length < 12 || !values[0]) continue; // Skip empty rows

        // Parse denominations
        const denominationValues = values[8] ? values[8].split(';').map(d => parseInt(d.trim())) : [];
        
        // Parse serials and group by denomination
        const serialsData = values[9] ? values[9].split(';') : [];
        const denominationsMap = new Map<number, ProductSerial[]>();
        
        serialsData.forEach(serialEntry => {
          const [code, denomStr] = serialEntry.split(':');
          const denom = parseInt(denomStr);
          if (!denominationsMap.has(denom)) {
            denominationsMap.set(denom, []);
          }
          denominationsMap.get(denom)?.push({
            code: code.trim(),
            status: 'available' as const
          });
        });
        
        // Build denominations array with serials
        const denominations: ProductDenomination[] = denominationValues.map(value => ({
          value,
          stock: denominationsMap.get(value)?.length || 0,
          serials: denominationsMap.get(value) || []
        }));

        const productData: Omit<Product, 'id'> = {
          brand: values[0],
          name: values[1],
          category: values[2],
          description: values[3],
          logo: values[4],
          supplierId: values[5],
          supplierName: values[6],
          commission: parseFloat(values[7]) || 10,
          denominations,
          bgColor: values[10] || '#000000',
          status: (values[11] === 'active' || values[11] === 'inactive' || values[11] === 'out_of_stock') 
            ? values[11] : 'active',
          popularity: 0,
          totalSold: 0,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        };

        const docRef = doc(collection(db, 'products'));
        batch.set(docRef, productData);
      }
      
      await batch.commit();
      
      // Refresh products list
      const snapshot = await getDocs(collection(db, 'products'));
      const productsData: Product[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Product));
      setProducts(productsData);
      
      alert('CSV import completed successfully!');
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
          <button
            onClick={downloadCSVTemplate}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            title="Download CSV template with sample data"
          >
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Download Template
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex items-center px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            <Upload className="h-4 w-4 mr-2" />
            {isUploading ? 'Uploading...' : 'Import CSV'}
          </button>
          <button
            onClick={() => {
              setSelectedProduct(null);
              setIsModalOpen(true);
            }}
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

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProducts.map((product) => (
          <div key={product.id} className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <div className="flex justify-between items-start mb-4">
              <div 
                className="w-16 h-16 rounded-lg flex items-center justify-center text-2xl font-bold"
                style={{ backgroundColor: product.bgColor }}
              >
                {product.brand.substring(0, 2).toUpperCase()}
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    setSelectedProduct(product);
                    setIsModalOpen(true);
                  }}
                  className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                  aria-label="Edit product"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDeleteProduct(product.id)}
                  className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-800 rounded-lg transition-colors"
                  aria-label="Delete product"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            <h3 className="text-lg font-semibold text-white mb-1">{product.brand}</h3>
            <p className="text-sm text-gray-400 mb-4">{product.name}</p>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Category:</span>
                <span className="text-white">{product.category}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Supplier:</span>
                <span className="text-white">{product.supplierName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Commission:</span>
                <span className="text-white">{product.commission}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Denominations:</span>
                <span className="text-white">{product.denominations.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Total Stock:</span>
                <span className="text-white">{getTotalStock(product)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Status:</span>
                <span className={`px-2 py-1 rounded-full text-xs ${
                  product.status === 'active' ? 'bg-green-900 text-green-300' :
                  product.status === 'inactive' ? 'bg-gray-700 text-gray-300' :
                  'bg-red-900 text-red-300'
                }`}>
                  {product.status}
                </span>
              </div>
            </div>

            {/* Denomination Details */}
            <div className="mt-4 pt-4 border-t border-gray-800">
              <p className="text-xs text-gray-500 mb-2">Available Denominations:</p>
              <div className="flex flex-wrap gap-2">
                {product.denominations.map((denom, idx) => (
                  <div key={idx} className="bg-gray-800 px-2 py-1 rounded text-xs">
                    <span className="text-white">${denom.value}</span>
                    <span className="text-gray-400 ml-1">({denom.stock})</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <div className="text-center py-12">
          <Package className="h-12 w-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">No products found</p>
        </div>
      )}
    </div>
  );
}