"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { db } from '@/lib/firebase-config';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { Trash2, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';

export default function CleanupPage() {
  const { user, platformUser } = useAuth();
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteStatus, setDeleteStatus] = useState<string[]>([]);
  const [isComplete, setIsComplete] = useState(false);

  // Check if user is admin
  const isAdmin = platformUser?.tier?.current === 'pixlionaire' || 
                  platformUser?.email === 'admin@pxlgiftcard.com';

  const handleDeleteAllProducts = async () => {
    if (!isAdmin) {
      alert('Only administrators can perform this action');
      return;
    }

    const confirmed = window.confirm(
      '⚠️ WARNING: This will DELETE ALL PRODUCTS from your database!\n\n' +
      'This action cannot be undone.\n\n' +
      'Are you sure you want to continue?'
    );

    if (!confirmed) {
      return;
    }

    setIsDeleting(true);
    setDeleteStatus(['Starting cleanup process...']);

    try {
      // Get all products
      const productsSnapshot = await getDocs(collection(db, 'products'));
      
      if (productsSnapshot.empty) {
        setDeleteStatus(prev => [...prev, '✅ No products found. Database is already clean.']);
        setIsComplete(true);
        setIsDeleting(false);
        return;
      }

      setDeleteStatus(prev => [...prev, `Found ${productsSnapshot.size} products to delete.`]);

      // Delete each product
      let count = 0;
      for (const productDoc of productsSnapshot.docs) {
        const product = productDoc.data();
        setDeleteStatus(prev => [...prev, `Deleting: ${product.brand} - ${product.name}`]);
        
        await deleteDoc(doc(db, 'products', productDoc.id));
        count++;
        
        // Small delay to prevent rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      setDeleteStatus(prev => [...prev, 
        '',
        `✅ Successfully deleted ${count} products!`,
        'The products collection is now empty.',
        'You can now import your CSV file without conflicts.'
      ]);
      
      setIsComplete(true);

    } catch (error) {
      console.error('Error deleting products:', error);
      setDeleteStatus(prev => [...prev, `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`]);
    } finally {
      setIsDeleting(false);
    }
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
          <AlertTriangle className="h-8 w-8 text-yellow-500" />
          <h1 className="text-3xl font-bold text-white">Product Database Cleanup</h1>
        </div>

        <div className="bg-yellow-500/10 border border-yellow-500 rounded-lg p-4 mb-6">
          <h2 className="text-lg font-semibold text-yellow-500 mb-2">⚠️ Warning</h2>
          <p className="text-gray-300">
            This tool will permanently delete ALL products from your database.
            This action cannot be undone. Make sure you have backups if needed.
          </p>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">What this will do:</h3>
          <ul className="space-y-2 text-gray-300">
            <li>• Remove all products from the products collection</li>
            <li>• Clear all product denominations and serial numbers</li>
            <li>• Preserve artwork and other collections</li>
            <li>• Allow clean import of new CSV data</li>
          </ul>
        </div>

        {!isComplete && !isDeleting && (
          <Button
            onClick={handleDeleteAllProducts}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-3"
            disabled={isDeleting}
          >
            <Trash2 className="h-5 w-5 mr-2" />
            Delete All Products
          </Button>
        )}

        {isDeleting && (
          <div className="flex items-center gap-2 text-blue-400">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Deleting products...</span>
          </div>
        )}

        {deleteStatus.length > 0 && (
          <div className="mt-6 bg-black rounded-lg p-4">
            <h3 className="text-white font-semibold mb-2">Process Log:</h3>
            <div className="font-mono text-sm text-gray-400 space-y-1 max-h-96 overflow-y-auto">
              {deleteStatus.map((status, index) => (
                <div key={index}>{status}</div>
              ))}
            </div>
          </div>
        )}

        {isComplete && (
          <div className="mt-6 space-y-4">
            <div className="bg-green-500/10 border border-green-500 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="text-green-500 font-semibold">Cleanup Complete!</span>
              </div>
            </div>
            
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="text-white font-semibold mb-2">Next Steps:</h3>
              <ol className="list-decimal list-inside space-y-1 text-gray-300">
                <li>Go to the Products page</li>
                <li>Click "Import CSV"</li>
                <li>Select "sample-products-import.csv" from the data folder</li>
                <li>Import the 50 sample products</li>
              </ol>
            </div>

            <div className="flex gap-4">
              <Button
                onClick={() => router.push('/admin/products')}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Go to Products Page
              </Button>
              <Button
                onClick={() => window.location.reload()}
                variant="outline"
              >
                Run Cleanup Again
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}