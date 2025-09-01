"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase-config";
import { collection, getDocs, addDoc, Timestamp } from "firebase/firestore";
import { 
  Palette,
  Upload,
  Wand2,
  Settings,
  Plus,
  RefreshCw,
  Download,
  Check,
  X
} from "lucide-react";
import { DEFAULT_ARTWORK_TEMPLATES, generatePlaceholderArtwork } from "@/lib/artwork-seeder";
import { matchArtworkForProduct } from "@/lib/artwork-matcher";

interface TestResult {
  input: string;
  brand: string;
  category: string;
  matchedUrl: string | null;
  success: boolean;
}

export default function ArtworkMappingPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [testInput, setTestInput] = useState("");
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [artworkCount, setArtworkCount] = useState(0);
  const [seedingStatus, setSeedingStatus] = useState("");

  useEffect(() => {
    if (!user) {
      router.push('/admin/login');
      return;
    }
    fetchArtworkCount();
  }, [user, router]);

  const fetchArtworkCount = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'artwork'));
      setArtworkCount(snapshot.size);
    } catch (error) {
      console.error('Error fetching artwork count:', error);
    }
  };

  const seedDefaultArtwork = async () => {
    setLoading(true);
    setSeedingStatus("Starting artwork seeding...");
    
    try {
      let addedCount = 0;
      
      for (const template of DEFAULT_ARTWORK_TEMPLATES) {
        setSeedingStatus(`Adding ${template.name}...`);
        
        // Check if artwork already exists
        const existingArtwork = await getDocs(collection(db, 'artwork'));
        const exists = existingArtwork.docs.some(doc => 
          doc.data().name === template.name || 
          doc.data().category === template.category
        );
        
        if (!exists) {
          await addDoc(collection(db, 'artwork'), {
            name: template.name,
            url: template.placeholderUrl,
            category: template.category,
            tags: template.tags,
            description: template.description,
            dimensions: { width: 600, height: 400 },
            fileSize: 50000, // Placeholder size
            uploadedAt: Timestamp.now(),
            usageCount: 0,
            isPlaceholder: true // Mark as placeholder
          });
          addedCount++;
        }
      }
      
      setSeedingStatus(`Successfully added ${addedCount} artwork templates!`);
      await fetchArtworkCount();
      
      setTimeout(() => setSeedingStatus(""), 3000);
    } catch (error) {
      console.error('Error seeding artwork:', error);
      setSeedingStatus("Error seeding artwork");
    } finally {
      setLoading(false);
    }
  };

  const testArtworkMatching = async () => {
    if (!testInput.trim()) return;
    
    setLoading(true);
    const lines = testInput.split('\n').filter(line => line.trim());
    const results: TestResult[] = [];
    
    for (const line of lines) {
      const parts = line.split(',').map(p => p.trim());
      const brand = parts[0] || '';
      const name = parts[1] || brand;
      const category = parts[2] || 'generic';
      
      const matchedUrl = await matchArtworkForProduct(name, brand, category);
      
      results.push({
        input: line,
        brand,
        category,
        matchedUrl,
        success: !!matchedUrl
      });
    }
    
    setTestResults(results);
    setLoading(false);
  };

  const downloadMappingReport = () => {
    const report = [
      'Artwork Mapping Test Report',
      `Generated: ${new Date().toISOString()}`,
      `Total Artwork in Repository: ${artworkCount}`,
      '',
      'Test Results:',
      'Input,Brand,Category,Matched URL,Status',
      ...testResults.map(r => 
        `"${r.input}","${r.brand}","${r.category}","${r.matchedUrl || 'No match'}","${r.success ? 'Success' : 'Failed'}"`
      )
    ].join('\n');
    
    const blob = new Blob([report], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `artwork_mapping_report_${Date.now()}.csv`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-black">
      <div className="px-6 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white">Artwork Mapping Configuration</h1>
              <p className="text-gray-400 mt-2">Configure and test automatic artwork matching for bulk imports</p>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => router.push('/admin/artwork')}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
              >
                <Palette className="h-4 w-4" />
                Artwork Repository
              </button>
              <button
                onClick={() => router.push('/admin/products')}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Back to Products
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Artwork in Repository</p>
                  <p className="text-2xl font-bold text-white mt-1">{artworkCount}</p>
                </div>
                <Palette className="h-10 w-10 text-purple-500" />
              </div>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Default Templates</p>
                  <p className="text-2xl font-bold text-white mt-1">{DEFAULT_ARTWORK_TEMPLATES.length}</p>
                </div>
                <Settings className="h-10 w-10 text-blue-500" />
              </div>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Match Success Rate</p>
                  <p className="text-2xl font-bold text-white mt-1">
                    {testResults.length > 0 
                      ? `${Math.round((testResults.filter(r => r.success).length / testResults.length) * 100)}%`
                      : 'N/A'
                    }
                  </p>
                </div>
                <Wand2 className="h-10 w-10 text-green-500" />
              </div>
            </div>
          </div>

          {/* Seed Default Artwork */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">Initialize Artwork Repository</h2>
            <p className="text-gray-400 mb-4">
              Seed the artwork repository with placeholder templates for common brands. 
              These can be replaced with actual artwork later.
            </p>
            <div className="flex items-center gap-4">
              <button
                onClick={seedDefaultArtwork}
                disabled={loading}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <Upload className="h-4 w-4" />
                {loading ? 'Seeding...' : 'Seed Default Artwork'}
              </button>
              {seedingStatus && (
                <span className="text-sm text-gray-400">{seedingStatus}</span>
              )}
            </div>
          </div>

          {/* Test Artwork Matching */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">Test Artwork Matching</h2>
            <p className="text-gray-400 mb-4">
              Test how products will be matched with artwork. Enter one product per line in format: 
              <code className="bg-gray-800 px-2 py-1 rounded text-sm ml-2">Brand, Product Name, Category</code>
            </p>
            
            <textarea
              value={testInput}
              onChange={(e) => setTestInput(e.target.value)}
              placeholder="Amazon, Amazon Gift Card, Shopping
Netflix, Netflix Subscription, Entertainment
Starbucks, Starbucks Card, Dining
Custom Brand, Custom Product, Generic"
              className="w-full h-32 px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white font-mono text-sm focus:ring-2 focus:ring-blue-500"
            />
            
            <div className="flex gap-4 mt-4">
              <button
                onClick={testArtworkMatching}
                disabled={loading || !testInput.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <Wand2 className="h-4 w-4" />
                Test Matching
              </button>
              
              {testResults.length > 0 && (
                <button
                  onClick={downloadMappingReport}
                  className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download Report
                </button>
              )}
            </div>
          </div>

          {/* Test Results */}
          {testResults.length > 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Test Results</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="pb-3 text-gray-400 font-medium">Status</th>
                      <th className="pb-3 text-gray-400 font-medium">Input</th>
                      <th className="pb-3 text-gray-400 font-medium">Brand</th>
                      <th className="pb-3 text-gray-400 font-medium">Category</th>
                      <th className="pb-3 text-gray-400 font-medium">Matched Artwork</th>
                    </tr>
                  </thead>
                  <tbody>
                    {testResults.map((result, idx) => (
                      <tr key={idx} className="border-b border-gray-800">
                        <td className="py-3">
                          {result.success ? (
                            <div className="flex items-center text-green-400">
                              <Check className="h-4 w-4 mr-1" />
                              Success
                            </div>
                          ) : (
                            <div className="flex items-center text-red-400">
                              <X className="h-4 w-4 mr-1" />
                              No Match
                            </div>
                          )}
                        </td>
                        <td className="py-3 text-gray-300 font-mono text-sm">
                          {result.input}
                        </td>
                        <td className="py-3 text-white">
                          {result.brand}
                        </td>
                        <td className="py-3 text-gray-400">
                          {result.category}
                        </td>
                        <td className="py-3">
                          {result.matchedUrl ? (
                            <a 
                              href={result.matchedUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-400 hover:text-blue-300 text-sm truncate block max-w-xs"
                            >
                              {result.matchedUrl}
                            </a>
                          ) : (
                            <span className="text-gray-500">No artwork found</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* How It Works */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mt-8">
            <h2 className="text-xl font-semibold text-white mb-4">How Artwork Matching Works</h2>
            <div className="space-y-3 text-gray-400">
              <div className="flex items-start gap-3">
                <span className="text-green-400 font-bold">1.</span>
                <div>
                  <strong className="text-white">Exact Brand Match:</strong> First tries to find artwork with exact brand name or category match
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-green-400 font-bold">2.</span>
                <div>
                  <strong className="text-white">Pattern Rules:</strong> Applies pattern matching rules (e.g., "Amazon" → amazon category artwork)
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-green-400 font-bold">3.</span>
                <div>
                  <strong className="text-white">Tag Matching:</strong> Fuzzy matches based on tags (gaming, entertainment, shopping, etc.)
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-green-400 font-bold">4.</span>
                <div>
                  <strong className="text-white">Default Fallback:</strong> Uses generic artwork if no specific match is found
                </div>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-gray-800 rounded-lg">
              <p className="text-sm text-gray-300">
                <strong className="text-white">Tip:</strong> For best results, upload brand-specific artwork to the repository 
                and use consistent naming in your CSV imports. The system learns from your artwork repository and improves matching over time.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}