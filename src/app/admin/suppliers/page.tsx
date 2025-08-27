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
  orderBy
} from "firebase/firestore";
import { 
  Search, 
  Upload, 
  Download, 
  Edit2, 
  Trash2, 
  Plus,
  FileText,
  Package,
  TrendingUp,
  AlertCircle,
  X
} from "lucide-react";

interface Supplier {
  id: string;
  name: string;
  contactEmail: string;
  contactPhone: string;
  status: 'active' | 'inactive' | 'pending';
  performanceScore: number; // 0-100
  deliveryTimeAvg: number; // in hours
  qualityScore: number; // 0-100
  contractStartDate: Timestamp;
  contractEndDate?: Timestamp;
  commission: number; // percentage
  totalOrders: number;
  totalRevenue: number;
  categories: string[];
  notes?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

interface SupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplier: Supplier | null;
  onSave: (supplier: Partial<Supplier>) => Promise<void>;
}

function SupplierModal({ isOpen, onClose, supplier, onSave }: SupplierModalProps) {
  const [formData, setFormData] = useState<Partial<Supplier>>({
    name: '',
    contactEmail: '',
    contactPhone: '',
    status: 'active',
    commission: 10,
    categories: [],
    notes: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (supplier) {
      setFormData({
        ...supplier,
        contractStartDate: supplier.contractStartDate,
        contractEndDate: supplier.contractEndDate
      });
    } else {
      setFormData({
        name: '',
        contactEmail: '',
        contactPhone: '',
        status: 'active',
        commission: 10,
        categories: [],
        notes: ''
      });
    }
  }, [supplier]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Error saving supplier:', error);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gray-950 border border-gray-800 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">
            {supplier ? 'Edit Supplier' : 'Add New Supplier'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
            aria-label="Close modal"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Supplier Name
              </label>
              <input
                type="text"
                required
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Blackhawk Network"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Contact Email
              </label>
              <input
                type="email"
                required
                value={formData.contactEmail || ''}
                onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                className="w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="contact@supplier.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Contact Phone
              </label>
              <input
                type="tel"
                required
                value={formData.contactPhone || ''}
                onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                className="w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="+1 (555) 123-4567"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Status
              </label>
              <select
                value={formData.status || 'active'}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as Supplier['status'] })}
                className="w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                aria-label="Supplier status"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="pending">Pending</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Commission (%)
              </label>
              <input
                type="number"
                required
                min="0"
                max="100"
                step="0.1"
                value={formData.commission || 10}
                onChange={(e) => setFormData({ ...formData, commission: parseFloat(e.target.value) })}
                className="w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="10"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Contract Start Date
              </label>
              <input
                type="date"
                required
                value={formData.contractStartDate ? new Date(formData.contractStartDate.toDate()).toISOString().split('T')[0] : ''}
                onChange={(e) => setFormData({ ...formData, contractStartDate: Timestamp.fromDate(new Date(e.target.value)) })}
                className="w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                aria-label="Contract start date"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Categories (comma-separated)
            </label>
            <input
              type="text"
              value={formData.categories?.join(', ') || ''}
              onChange={(e) => setFormData({ 
                ...formData, 
                categories: e.target.value.split(',').map(cat => cat.trim()).filter(cat => cat)
              })}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="retail, dining, entertainment"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Notes
            </label>
            <textarea
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Additional notes about the supplier..."
            />
          </div>

          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : supplier ? 'Update Supplier' : 'Add Supplier'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function SuppliersPage() {
  const { user, platformUser, loading: authLoading, isAdmin } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Check admin access
  useEffect(() => {
    if (!authLoading && (!user || !platformUser || !isAdmin)) {
      router.push('/auth/signin?redirect=/admin/suppliers');
    }
  }, [user, platformUser, authLoading, isAdmin, router]);

  // Fetch suppliers
  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        const suppliersQuery = query(collection(db, 'suppliers'), orderBy('name'));
        const snapshot = await getDocs(suppliersQuery);
        const suppliersData: Supplier[] = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Supplier));
        setSuppliers(suppliersData);
      } catch (error) {
        console.error('Error fetching suppliers:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user && isAdmin) {
      fetchSuppliers();
    }
  }, [user, isAdmin]);

  const handleSaveSupplier = async (supplierData: Partial<Supplier>) => {
    try {
      if (selectedSupplier) {
        // Update existing supplier
        await updateDoc(doc(db, 'suppliers', selectedSupplier.id), {
          ...supplierData,
          updatedAt: Timestamp.now()
        });
        setSuppliers(suppliers.map(s => 
          s.id === selectedSupplier.id 
            ? { ...s, ...supplierData, updatedAt: Timestamp.now() }
            : s
        ));
      } else {
        // Create new supplier
        const newSupplier = {
          ...supplierData,
          performanceScore: 100,
          deliveryTimeAvg: 24,
          qualityScore: 100,
          totalOrders: 0,
          totalRevenue: 0,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        };
        const docRef = doc(collection(db, 'suppliers'));
        await setDoc(docRef, newSupplier);
        setSuppliers([...suppliers, { id: docRef.id, ...newSupplier } as Supplier]);
      }
    } catch (error) {
      console.error('Error saving supplier:', error);
      throw error;
    }
  };

  const handleDeleteSupplier = async (supplierId: string) => {
    if (!confirm('Are you sure you want to delete this supplier?')) return;

    try {
      await deleteDoc(doc(db, 'suppliers', supplierId));
      setSuppliers(suppliers.filter(s => s.id !== supplierId));
    } catch (error) {
      console.error('Error deleting supplier:', error);
    }
  };

  const handleCSVUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const text = await file.text();
      const lines = text.split('\n');
      const headers = lines[0].split(',').map(h => h.trim());
      
      // Expected headers: name,email,phone,commission,categories
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        if (values.length < 5) continue;

        const supplierData = {
          name: values[0],
          contactEmail: values[1],
          contactPhone: values[2],
          commission: parseFloat(values[3]) || 10,
          categories: values[4].split(';').map(c => c.trim()),
          status: 'active' as const,
          performanceScore: 100,
          deliveryTimeAvg: 24,
          qualityScore: 100,
          totalOrders: 0,
          totalRevenue: 0,
          contractStartDate: Timestamp.now(),
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        };

        const docRef = doc(collection(db, 'suppliers'));
        await setDoc(docRef, supplierData);
      }

      // Refresh suppliers list
      const snapshot = await getDocs(collection(db, 'suppliers'));
      const suppliersData: Supplier[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Supplier));
      setSuppliers(suppliersData);

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

  const filteredSuppliers = suppliers.filter(supplier =>
    supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.contactEmail.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-white">Loading suppliers...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white">Supplier Management</h1>
        <div className="flex space-x-4">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleCSVUpload}
            accept=".csv"
            className="hidden"
            aria-label="CSV file upload"
          />
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
              setSelectedSupplier(null);
              setIsModalOpen(true);
            }}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Supplier
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search suppliers..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-gray-900 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Suppliers Table */}
      <div className="bg-gray-950 border border-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-900 border-b border-gray-800">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Supplier
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Performance
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Commission
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {filteredSuppliers.map((supplier) => (
                <tr key={supplier.id} className="hover:bg-gray-900/50 transition-colors">
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-white">{supplier.name}</div>
                      <div className="text-xs text-gray-400">
                        {supplier.categories.join(', ')}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-300">{supplier.contactEmail}</div>
                    <div className="text-xs text-gray-400">{supplier.contactPhone}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-4">
                      <div>
                        <div className="text-sm text-white">{supplier.performanceScore}%</div>
                        <div className="text-xs text-gray-400">Performance</div>
                      </div>
                      <div>
                        <div className="text-sm text-white">{supplier.deliveryTimeAvg}h</div>
                        <div className="text-xs text-gray-400">Avg Delivery</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-white">{supplier.commission}%</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      supplier.status === 'active' 
                        ? 'bg-green-400/10 text-green-400'
                        : supplier.status === 'inactive'
                        ? 'bg-gray-400/10 text-gray-400'
                        : 'bg-yellow-400/10 text-yellow-400'
                    }`}>
                      {supplier.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          setSelectedSupplier(supplier);
                          setIsModalOpen(true);
                        }}
                        className="text-gray-400 hover:text-white transition-colors"
                        aria-label="Edit supplier"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteSupplier(supplier.id)}
                        className="text-gray-400 hover:text-red-400 transition-colors"
                        aria-label="Delete supplier"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredSuppliers.length === 0 && (
          <div className="text-center py-12">
            <Package className="h-12 w-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No suppliers found</p>
          </div>
        )}
      </div>

      {/* Add/Edit Supplier Modal */}
      <SupplierModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedSupplier(null);
        }}
        supplier={selectedSupplier}
        onSave={handleSaveSupplier}
      />
    </div>
  );
}
