"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { collection, getDocs } from "firebase/firestore";
import { 
  Download, 
  Plus, 
  Trash2, 
  Copy
} from "lucide-react";
import { db } from "@/lib/firebase-config";

// Predefined options for dropdowns
const KNOWN_BRANDS = [
  'Amazon', 'Apple', 'Google', 'Netflix', 'Spotify', 'Steam', 'Xbox', 
  'PlayStation', 'Nintendo', 'Starbucks', 'Target', 'Walmart', 'Uber',
  'DoorDash', 'Airbnb', 'Disney', 'Hulu', 'HBO', 'Paramount+',
  'iTunes', 'Google Play', 'Microsoft', 'Best Buy', 'Home Depot',
  'Nike', 'Adidas', 'Sephora', 'Ulta', 'CVS', 'Walgreens'
];

const CATEGORIES = [
  'Shopping', 'Entertainment', 'Gaming', 'Dining', 'Travel', 
  'Technology', 'Fashion', 'Sports', 'Music', 'Streaming',
  'Food Delivery', 'Transportation', 'Health & Beauty', 'Home & Garden'
];

const SUPPLIERS = [
  { id: 'supplier_001', name: 'Blackhawk Network' },
  { id: 'supplier_002', name: 'InComm Payments' },
  { id: 'supplier_003', name: 'Gift Card Partners' },
  { id: 'supplier_004', name: 'CashStar' },
  { id: 'supplier_005', name: 'Direct Supplier' }
];

const STATUS_OPTIONS = ['active', 'inactive', 'draft'];

const BRAND_COLORS: { [key: string]: string } = {
  'Amazon': '#FF9900',
  'Apple': '#000000',
  'Google': '#4285F4',
  'Netflix': '#E50914',
  'Spotify': '#1DB954',
  'Steam': '#171A21',
  'Xbox': '#107C10',
  'PlayStation': '#003791',
  'Nintendo': '#E60012',
  'Starbucks': '#00704A',
  'Target': '#CC0000',
  'Walmart': '#0071CE',
  'Uber': '#000000',
  'DoorDash': '#FF3008',
  'Airbnb': '#FF5A5F'
};

interface CSVRow {
  brand: string;
  name: string;
  category: string;
  description: string;
  logo_url: string;
  supplier_id: string;
  supplier_name: string;
  commission: string;
  denominations: string;
  serials: string;
  bg_color: string;
  status: string;
  artwork_mode: string;
  artwork_url: string;
}

export default function CSVBuilderPage() {
  const router = useRouter();
  const [rows, setRows] = useState<CSVRow[]>([]);
  const [existingBrands, setExistingBrands] = useState<string[]>([]);
  const [showDropdown, setShowDropdown] = useState<{ row: number; field: keyof CSVRow } | null>(null);

  useEffect(() => {
    // Load existing brands from database
    loadExistingBrands();
    // Initialize with one empty row
    addRow();
  }, []);

  const loadExistingBrands = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'products'));
      const brands = new Set<string>();
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.brand) brands.add(data.brand);
      });
      setExistingBrands([...Array.from(brands), ...KNOWN_BRANDS]);
    } catch (error) {
      console.error('Error loading brands:', error);
      setExistingBrands(KNOWN_BRANDS);
    }
  };

  const addRow = () => {
    const newRow: CSVRow = {
      brand: '',
      name: '',
      category: '',
      description: '',
      logo_url: '',
      supplier_id: '',
      supplier_name: '',
      commission: '10',
      denominations: '',
      serials: '',
      bg_color: '',
      status: 'active',
      artwork_mode: 'auto',
      artwork_url: ''
    };
    setRows([...rows, newRow]);
  };

  const deleteRow = (index: number) => {
    setRows(rows.filter((_, i) => i !== index));
  };

  const duplicateRow = (index: number) => {
    const rowToDuplicate = { ...rows[index] };
    const newRows = [...rows];
    newRows.splice(index + 1, 0, rowToDuplicate);
    setRows(newRows);
  };

  const updateRow = (index: number, field: keyof CSVRow, value: string) => {
    const newRows = [...rows];
    newRows[index][field] = value;

    // Auto-fill related fields
    if (field === 'brand') {
      // Auto-generate product name if empty
      if (!newRows[index].name) {
        newRows[index].name = `${value} Gift Card`;
      }
      // Auto-set brand color
      if (BRAND_COLORS[value]) {
        newRows[index].bg_color = BRAND_COLORS[value];
      }
    }

    if (field === 'supplier_id') {
      const supplier = SUPPLIERS.find(s => s.id === value);
      if (supplier) {
        newRows[index].supplier_name = supplier.name;
      }
    }

    setRows(newRows);
    setShowDropdown(null);
  };

  const generateSerialCodes = (index: number) => {
    const row = rows[index];
    if (!row.denominations) {
      alert('Please add denominations first');
      return;
    }

    const denoms = row.denominations.split(';').map(d => d.trim());
    const serialCodes: string[] = [];
    
    denoms.forEach(denom => {
      // Generate 5 sample codes for each denomination
      for (let i = 1; i <= 5; i++) {
        const code = `${row.brand.toUpperCase().substring(0, 3)}${denom}${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
        serialCodes.push(`${code}:${denom}`);
      }
    });

    const newRows = [...rows];
    newRows[index].serials = serialCodes.join(';');
    setRows(newRows);
  };

  const downloadCSV = () => {
    const headers = [
      '# CSV Builder Generated File',
      `# Generated: ${new Date().toISOString()}`,
      '# Instructions: Review and edit serial codes as needed',
      '',
      'brand,name,category,description,logo_url,supplier_id,supplier_name,commission,denominations,serials,bg_color,status,artwork_mode,artwork_url'
    ];

    const csvRows = rows.map(row => 
      [
        row.brand,
        row.name,
        row.category,
        row.description,
        row.logo_url,
        row.supplier_id,
        row.supplier_name,
        row.commission,
        row.denominations,
        row.serials,
        row.bg_color,
        row.status,
        row.artwork_mode,
        row.artwork_url
      ].join(',')
    );

    const csvContent = [...headers, ...csvRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `products_import_${Date.now()}.csv`;
    a.click();
  };

  const DropdownOptions = ({ 
    options, 
    onSelect, 
    currentValue 
  }: { 
    options: string[]; 
    onSelect: (value: string) => void;
    currentValue: string;
  }) => (
    <div className="absolute z-10 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
      {options.map((option, idx) => (
        <div
          key={idx}
          onClick={() => onSelect(option)}
          className={`px-3 py-2 hover:bg-gray-700 cursor-pointer text-sm ${
            currentValue === option ? 'bg-gray-700 text-blue-400' : 'text-white'
          }`}
        >
          {option}
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-black p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white">CSV Builder</h1>
            <p className="text-gray-400 mt-1">Build your product import file with guided dropdowns</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => router.push('/admin/products')}
              className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm"
            >
              Back to Products
            </button>
            <button
              onClick={downloadCSV}
              disabled={rows.length === 0}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50 text-sm"
            >
              <Download className="h-4 w-4" />
              Download CSV
            </button>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-3 mb-4">
          <h3 className="text-white font-semibold mb-2 text-sm">Quick Tips:</h3>
          <ul className="text-gray-400 text-xs space-y-1">
            <li>• Click on any field to see available options</li>
            <li>• Brand selection auto-fills related fields</li>
            <li>• Use "Generate Serials" to create sample codes</li>
            <li>• Artwork mode "auto" will match based on brand name</li>
          </ul>
        </div>

        {/* Table Container */}
        <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-800/50 sticky top-0 z-10">
                <tr className="border-b border-gray-700">
                  <th className="text-left py-2 px-2 text-gray-400 text-xs font-medium whitespace-nowrap">Actions</th>
                  <th className="text-left py-2 px-2 text-gray-400 text-xs font-medium whitespace-nowrap">Brand</th>
                  <th className="text-left py-2 px-2 text-gray-400 text-xs font-medium whitespace-nowrap">Product Name</th>
                  <th className="text-left py-2 px-2 text-gray-400 text-xs font-medium whitespace-nowrap">Category</th>
                  <th className="text-left py-2 px-2 text-gray-400 text-xs font-medium whitespace-nowrap">Description</th>
                  <th className="text-left py-2 px-2 text-gray-400 text-xs font-medium whitespace-nowrap">Supplier</th>
                  <th className="text-left py-2 px-2 text-gray-400 text-xs font-medium whitespace-nowrap">Comm%</th>
                  <th className="text-left py-2 px-2 text-gray-400 text-xs font-medium whitespace-nowrap">Denoms</th>
                  <th className="text-left py-2 px-2 text-gray-400 text-xs font-medium whitespace-nowrap">Serial Codes</th>
                  <th className="text-left py-2 px-2 text-gray-400 text-xs font-medium whitespace-nowrap">Color</th>
                  <th className="text-left py-2 px-2 text-gray-400 text-xs font-medium whitespace-nowrap">Status</th>
                  <th className="text-left py-2 px-2 text-gray-400 text-xs font-medium whitespace-nowrap">Artwork</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rowIndex) => (
                  <tr key={rowIndex} className="border-b border-gray-800 hover:bg-gray-800/30">
                    {/* Actions */}
                    <td className="py-1 px-2">
                      <div className="flex gap-1">
                        <button
                          onClick={() => duplicateRow(rowIndex)}
                          className="p-1 text-gray-400 hover:text-blue-400"
                          title="Duplicate row"
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => deleteRow(rowIndex)}
                          className="p-1 text-gray-400 hover:text-red-400"
                          title="Delete row"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </td>

                    {/* Brand */}
                    <td className="py-1 px-2 relative">
                      <div className="relative">
                        <input
                          type="text"
                          value={row.brand}
                          onChange={(e) => updateRow(rowIndex, 'brand', e.target.value)}
                          onFocus={() => setShowDropdown({ row: rowIndex, field: 'brand' })}
                          className="w-24 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-white text-xs"
                          placeholder="Brand"
                        />
                        {showDropdown?.row === rowIndex && showDropdown.field === 'brand' && (
                          <DropdownOptions
                            options={existingBrands}
                            onSelect={(value) => updateRow(rowIndex, 'brand', value)}
                            currentValue={row.brand}
                          />
                        )}
                      </div>
                    </td>

                    {/* Name */}
                    <td className="py-1 px-2">
                      <input
                        type="text"
                        value={row.name}
                        onChange={(e) => updateRow(rowIndex, 'name', e.target.value)}
                        className="w-32 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-white text-xs"
                        placeholder="Product name"
                      />
                    </td>

                    {/* Category */}
                    <td className="py-1 px-2 relative">
                      <div className="relative">
                        <input
                          type="text"
                          value={row.category}
                          onChange={(e) => updateRow(rowIndex, 'category', e.target.value)}
                          onFocus={() => setShowDropdown({ row: rowIndex, field: 'category' })}
                          className="w-28 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-white text-xs"
                          placeholder="Category"
                        />
                        {showDropdown?.row === rowIndex && showDropdown.field === 'category' && (
                          <DropdownOptions
                            options={CATEGORIES}
                            onSelect={(value) => updateRow(rowIndex, 'category', value)}
                            currentValue={row.category}
                          />
                        )}
                      </div>
                    </td>

                    {/* Description */}
                    <td className="py-1 px-2">
                      <input
                        type="text"
                        value={row.description}
                        onChange={(e) => updateRow(rowIndex, 'description', e.target.value)}
                        className="w-40 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-white text-xs"
                        placeholder="Description"
                      />
                    </td>

                    {/* Supplier */}
                    <td className="py-1 px-2 relative">
                      <select
                        value={row.supplier_id}
                        onChange={(e) => updateRow(rowIndex, 'supplier_id', e.target.value)}
                        className="w-32 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-white text-xs"
                      >
                        <option value="">Select</option>
                        {SUPPLIERS.map(supplier => (
                          <option key={supplier.id} value={supplier.id}>
                            {supplier.name}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Commission */}
                    <td className="py-1 px-2">
                      <input
                        type="number"
                        value={row.commission}
                        onChange={(e) => updateRow(rowIndex, 'commission', e.target.value)}
                        className="w-12 px-1 py-1 bg-gray-800 border border-gray-700 rounded text-white text-xs text-center"
                        placeholder="10"
                      />
                    </td>

                    {/* Denominations */}
                    <td className="py-1 px-2">
                      <input
                        type="text"
                        value={row.denominations}
                        onChange={(e) => updateRow(rowIndex, 'denominations', e.target.value)}
                        className="w-20 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-white text-xs"
                        placeholder="25;50"
                      />
                    </td>

                    {/* Serials */}
                    <td className="py-1 px-2">
                      <div className="flex gap-1">
                        <input
                          type="text"
                          value={row.serials}
                          onChange={(e) => updateRow(rowIndex, 'serials', e.target.value)}
                          className="w-32 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-white font-mono text-xs"
                          placeholder="Click Gen"
                        />
                        <button
                          onClick={() => generateSerialCodes(rowIndex)}
                          className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                          title="Generate sample serials"
                        >
                          Gen
                        </button>
                      </div>
                    </td>

                    {/* Color */}
                    <td className="py-1 px-2">
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={row.bg_color}
                          onChange={(e) => updateRow(rowIndex, 'bg_color', e.target.value)}
                          className="w-16 px-1 py-1 bg-gray-800 border border-gray-700 rounded text-white text-xs"
                          placeholder="#000"
                        />
                        {row.bg_color && (
                          <div 
                            className="w-4 h-4 rounded border border-gray-600"
                            style={{ backgroundColor: row.bg_color }}
                          />
                        )}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-1 px-2">
                      <select
                        value={row.status}
                        onChange={(e) => updateRow(rowIndex, 'status', e.target.value)}
                        className="w-16 px-1 py-1 bg-gray-800 border border-gray-700 rounded text-white text-xs"
                      >
                        {STATUS_OPTIONS.map(status => (
                          <option key={status} value={status}>{status}</option>
                        ))}
                      </select>
                    </td>

                    {/* Artwork */}
                    <td className="py-1 px-2">
                      <div className="flex gap-1">
                        <select
                          value={row.artwork_mode}
                          onChange={(e) => updateRow(rowIndex, 'artwork_mode', e.target.value)}
                          className="w-14 px-1 py-1 bg-gray-800 border border-gray-700 rounded text-white text-xs"
                        >
                          <option value="auto">Auto</option>
                          <option value="manual">URL</option>
                          <option value="">None</option>
                        </select>
                        {row.artwork_mode === 'manual' && (
                          <input
                            type="text"
                            value={row.artwork_url}
                            onChange={(e) => updateRow(rowIndex, 'artwork_url', e.target.value)}
                            className="w-24 px-1 py-1 bg-gray-800 border border-gray-700 rounded text-white text-xs"
                            placeholder="URL"
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add Row Button */}
        <div className="mt-4 flex justify-center">
          <button
            onClick={addRow}
            className="px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2 text-sm"
          >
            <Plus className="h-4 w-4" />
            Add Row
          </button>
        </div>

        {/* Summary */}
        <div className="mt-6 bg-gray-900 border border-gray-800 rounded-lg p-3">
          <h3 className="text-white font-semibold mb-2 text-sm">Summary</h3>
          <div className="grid grid-cols-3 gap-4 text-xs">
            <div>
              <span className="text-gray-400">Total Products:</span>
              <span className="text-white ml-2">{rows.length}</span>
            </div>
            <div>
              <span className="text-gray-400">Active Products:</span>
              <span className="text-white ml-2">{rows.filter(r => r.status === 'active').length}</span>
            </div>
            <div>
              <span className="text-gray-400">With Serials:</span>
              <span className="text-white ml-2">{rows.filter(r => r.serials).length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Click outside to close dropdowns */}
      {showDropdown && (
        <div 
          className="fixed inset-0 z-0" 
          onClick={() => setShowDropdown(null)}
        />
      )}
    </div>
  );
}