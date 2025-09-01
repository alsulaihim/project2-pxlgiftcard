"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase-config";
import { 
  collection, 
  getDocs, 
  query, 
  where,
  Timestamp,
  onSnapshot
} from "firebase/firestore";
import { 
  Package, 
  AlertTriangle, 
  TrendingDown, 
  CheckCircle,
  RefreshCw,
  Download,
  BarChart3,
  ShoppingCart,
  Clock
} from "lucide-react";
import { getStockLevels, getLowStockProducts, releaseExpiredReservations } from "@/lib/inventory-service";

interface Product {
  id: string;
  brand: string;
  name: string;
  category: string;
  denominations: Array<{
    value: number;
    stock: number;
    serials: Array<{
      code: string;
      status: 'available' | 'reserved' | 'sold';
      orderId?: string;
      reservedUntil?: any;
    }>;
  }>;
  status: 'active' | 'inactive' | 'out_of_stock';
  totalSold: number;
}

interface InventoryStats {
  totalProducts: number;
  activeProducts: number;
  outOfStock: number;
  lowStock: number;
  totalSerials: number;
  availableSerials: number;
  reservedSerials: number;
  soldSerials: number;
}

interface LowStockItem {
  productId: string;
  brand: string;
  name: string;
  denomination: number;
  stock: number;
  threshold: number;
}

export default function InventoryPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState<InventoryStats>({
    totalProducts: 0,
    activeProducts: 0,
    outOfStock: 0,
    lowStock: 0,
    totalSerials: 0,
    availableSerials: 0,
    reservedSerials: 0,
    soldSerials: 0
  });
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [stockThreshold, setStockThreshold] = useState(10);

  useEffect(() => {
    if (!user) {
      router.push('/admin/login');
      return;
    }

    fetchInventoryData();
    
    // Set up real-time listener for products
    const unsubscribe = onSnapshot(
      collection(db, 'products'),
      (snapshot) => {
        const productsData: Product[] = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Product));
        setProducts(productsData);
        calculateStats(productsData);
      }
    );

    // Release expired reservations every 5 minutes
    const interval = setInterval(() => {
      releaseExpiredReservations();
    }, 5 * 60 * 1000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [user, router, stockThreshold]);

  const fetchInventoryData = async () => {
    setLoading(true);
    try {
      // Fetch all products
      const snapshot = await getDocs(collection(db, 'products'));
      const productsData: Product[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Product));
      
      setProducts(productsData);
      calculateStats(productsData);
      
      // Get low stock items
      const lowStock = await getLowStockProducts(stockThreshold);
      setLowStockItems(lowStock);
    } catch (error) {
      console.error('Error fetching inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (products: Product[]) => {
    const stats: InventoryStats = {
      totalProducts: products.length,
      activeProducts: 0,
      outOfStock: 0,
      lowStock: 0,
      totalSerials: 0,
      availableSerials: 0,
      reservedSerials: 0,
      soldSerials: 0
    };

    products.forEach(product => {
      if (product.status === 'active') stats.activeProducts++;
      if (product.status === 'out_of_stock') stats.outOfStock++;
      
      let productHasLowStock = false;
      
      product.denominations.forEach(denom => {
        const available = denom.serials.filter(s => s.status === 'available').length;
        const reserved = denom.serials.filter(s => s.status === 'reserved').length;
        const sold = denom.serials.filter(s => s.status === 'sold').length;
        
        stats.totalSerials += denom.serials.length;
        stats.availableSerials += available;
        stats.reservedSerials += reserved;
        stats.soldSerials += sold;
        
        if (available > 0 && available <= stockThreshold) {
          productHasLowStock = true;
        }
      });
      
      if (productHasLowStock) stats.lowStock++;
    });

    setStats(stats);
  };

  const exportInventoryReport = () => {
    const csvData = ['Brand,Product Name,Denomination,Available,Reserved,Sold,Total'];
    
    products.forEach(product => {
      product.denominations.forEach(denom => {
        const available = denom.serials.filter(s => s.status === 'available').length;
        const reserved = denom.serials.filter(s => s.status === 'reserved').length;
        const sold = denom.serials.filter(s => s.status === 'sold').length;
        const total = denom.serials.length;
        
        csvData.push(
          `${product.brand},${product.name},${denom.value},${available},${reserved},${sold},${total}`
        );
      });
    });
    
    const blob = new Blob([csvData.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', `inventory_report_${new Date().toISOString().split('T')[0]}.csv`);
    a.click();
  };

  const handleReleaseExpired = async () => {
    await releaseExpiredReservations();
    await fetchInventoryData();
    alert('Expired reservations have been released');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="px-6 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white">Inventory Management</h1>
              <p className="text-gray-400 mt-2">Track stock levels and manage product inventory</p>
            </div>
            <div className="flex gap-4">
              <button
                onClick={handleReleaseExpired}
                className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors flex items-center gap-2"
              >
                <Clock className="h-4 w-4" />
                Release Expired
              </button>
              <button
                onClick={exportInventoryReport}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Export Report
              </button>
              <button
                onClick={fetchInventoryData}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Total Products</p>
                  <p className="text-2xl font-bold text-white mt-1">{stats.totalProducts}</p>
                  <p className="text-green-400 text-sm mt-2">{stats.activeProducts} active</p>
                </div>
                <Package className="h-10 w-10 text-blue-500" />
              </div>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Total Serials</p>
                  <p className="text-2xl font-bold text-white mt-1">{stats.totalSerials}</p>
                  <p className="text-green-400 text-sm mt-2">{stats.availableSerials} available</p>
                </div>
                <BarChart3 className="h-10 w-10 text-green-500" />
              </div>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Low Stock</p>
                  <p className="text-2xl font-bold text-yellow-400 mt-1">{stats.lowStock}</p>
                  <p className="text-gray-400 text-sm mt-2">≤ {stockThreshold} items</p>
                </div>
                <TrendingDown className="h-10 w-10 text-yellow-500" />
              </div>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Out of Stock</p>
                  <p className="text-2xl font-bold text-red-400 mt-1">{stats.outOfStock}</p>
                  <p className="text-gray-400 text-sm mt-2">products</p>
                </div>
                <AlertTriangle className="h-10 w-10 text-red-500" />
              </div>
            </div>
          </div>

          {/* Serial Status Overview */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">Serial Status Overview</h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-green-400">{stats.availableSerials}</p>
                <p className="text-gray-400 text-sm mt-1">Available</p>
                <div className="mt-2 h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-green-500"
                    style={{ width: `${(stats.availableSerials / stats.totalSerials) * 100}%` }}
                  />
                </div>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-yellow-400">{stats.reservedSerials}</p>
                <p className="text-gray-400 text-sm mt-1">Reserved</p>
                <div className="mt-2 h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-yellow-500"
                    style={{ width: `${(stats.reservedSerials / stats.totalSerials) * 100}%` }}
                  />
                </div>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-blue-400">{stats.soldSerials}</p>
                <p className="text-gray-400 text-sm mt-1">Sold</p>
                <div className="mt-2 h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500"
                    style={{ width: `${(stats.soldSerials / stats.totalSerials) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Low Stock Alerts */}
          {lowStockItems.length > 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-white">Low Stock Alerts</h2>
                <div className="flex items-center gap-2">
                  <label className="text-gray-400 text-sm">Threshold:</label>
                  <input
                    type="number"
                    value={stockThreshold}
                    onChange={(e) => setStockThreshold(parseInt(e.target.value))}
                    className="w-16 px-2 py-1 bg-gray-800 text-white border border-gray-700 rounded"
                  />
                </div>
              </div>
              <div className="space-y-3">
                {lowStockItems.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="h-5 w-5 text-yellow-500" />
                      <div>
                        <p className="text-white font-medium">{item.brand} - {item.name}</p>
                        <p className="text-gray-400 text-sm">${item.denomination} denomination</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-yellow-400 font-bold">{item.stock} left</p>
                      <button
                        onClick={() => router.push(`/admin/products?product=${item.productId}`)}
                        className="text-blue-400 hover:text-blue-300 text-sm"
                      >
                        View Product →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Product Inventory Table */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Product Inventory</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="pb-3 text-gray-400 font-medium">Product</th>
                    <th className="pb-3 text-gray-400 font-medium">Status</th>
                    <th className="pb-3 text-gray-400 font-medium">Denominations</th>
                    <th className="pb-3 text-gray-400 font-medium">Stock</th>
                    <th className="pb-3 text-gray-400 font-medium">Reserved</th>
                    <th className="pb-3 text-gray-400 font-medium">Sold</th>
                    <th className="pb-3 text-gray-400 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map(product => {
                    const totalAvailable = product.denominations.reduce((sum, d) => 
                      sum + d.serials.filter(s => s.status === 'available').length, 0
                    );
                    const totalReserved = product.denominations.reduce((sum, d) => 
                      sum + d.serials.filter(s => s.status === 'reserved').length, 0
                    );
                    const totalSold = product.denominations.reduce((sum, d) => 
                      sum + d.serials.filter(s => s.status === 'sold').length, 0
                    );
                    
                    return (
                      <tr key={product.id} className="border-b border-gray-800">
                        <td className="py-4">
                          <div>
                            <p className="text-white font-medium">{product.brand}</p>
                            <p className="text-gray-400 text-sm">{product.name}</p>
                          </div>
                        </td>
                        <td className="py-4">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            product.status === 'active' 
                              ? 'bg-green-500/20 text-green-400'
                              : product.status === 'out_of_stock'
                              ? 'bg-red-500/20 text-red-400'
                              : 'bg-gray-500/20 text-gray-400'
                          }`}>
                            {product.status}
                          </span>
                        </td>
                        <td className="py-4 text-gray-300">
                          {product.denominations.map(d => `$${d.value}`).join(', ')}
                        </td>
                        <td className="py-4 text-green-400 font-medium">
                          {totalAvailable}
                        </td>
                        <td className="py-4 text-yellow-400 font-medium">
                          {totalReserved}
                        </td>
                        <td className="py-4 text-blue-400 font-medium">
                          {totalSold}
                        </td>
                        <td className="py-4">
                          <button
                            onClick={() => setSelectedProduct(product.id === selectedProduct ? null : product.id)}
                            className="text-blue-400 hover:text-blue-300 text-sm"
                          >
                            {product.id === selectedProduct ? 'Hide' : 'Details'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}