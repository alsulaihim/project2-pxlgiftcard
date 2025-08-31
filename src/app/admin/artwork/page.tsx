"use client";

import React, { useState, useEffect } from "react";
import { db, storage } from "@/lib/firebase-config";
import { collection, addDoc, deleteDoc, doc, getDocs, query, orderBy, Timestamp, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Edit2, Image as ImageIcon, Search, Grid, List, X, Check, Upload } from "lucide-react";
import Image from "next/image";
import { optimizeArtworkImage } from "@/lib/image-optimizer";

interface Artwork {
  id: string;
  name: string;
  url: string;
  thumbnailUrl?: string;
  category: string;
  tags: string[];
  dimensions: {
    width: number;
    height: number;
  };
  fileSize: number;
  uploadedAt: Timestamp;
  usageCount: number;
}

const ARTWORK_CATEGORIES = [
  "Gaming",
  "Entertainment",
  "Food & Dining",
  "Shopping",
  "Travel",
  "Technology",
  "Fashion",
  "Sports",
  "Music",
  "Other"
];

export default function ArtworkRepositoryPage() {
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [editingArtwork, setEditingArtwork] = useState<Artwork | null>(null);
  
  // Upload form state
  const [uploadForm, setUploadForm] = useState({
    name: "",
    category: "",
    tags: "",
    file: null as File | null,
  });

  // Fetch all artwork from Firestore
  const fetchArtwork = async () => {
    try {
      const q = query(collection(db, "artwork"), orderBy("uploadedAt", "desc"));
      const snapshot = await getDocs(q);
      const artworkList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Artwork));
      setArtworks(artworkList);
    } catch (error) {
      console.error("Error fetching artwork:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArtwork();
  }, []);

  // Handle file upload
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      setUploadForm({ ...uploadForm, file });
    }
  };

  // Upload new artwork
  const handleUploadArtwork = async () => {
    if (!uploadForm.file || !uploadForm.name || !uploadForm.category) {
      alert("Please fill in all required fields");
      return;
    }

    setUploading(true);
    try {
      // Optimize the image
      const optimizedBlob = await optimizeArtworkImage(uploadForm.file, "CARD");
      
      // Create storage reference
      const timestamp = Date.now();
      const fileName = `artwork_${timestamp}_${uploadForm.file.name}`;
      const storageRef = ref(storage, `artwork-repository/${fileName}`);
      
      // Upload to Firebase Storage
      const snapshot = await uploadBytes(storageRef, optimizedBlob);
      const url = await getDownloadURL(snapshot.ref);
      
      // Get image dimensions
      const img = new window.Image();
      await new Promise((resolve) => {
        img.onload = resolve;
        img.src = URL.createObjectURL(optimizedBlob);
      });
      
      // Save metadata to Firestore
      const artworkData = {
        name: uploadForm.name,
        url: url,
        category: uploadForm.category,
        tags: uploadForm.tags.split(",").map(tag => tag.trim()).filter(Boolean),
        dimensions: {
          width: img.width,
          height: img.height
        },
        fileSize: optimizedBlob.size,
        uploadedAt: Timestamp.now(),
        usageCount: 0
      };
      
      await addDoc(collection(db, "artwork"), artworkData);
      
      // Reset form and refresh
      setUploadForm({ name: "", category: "", tags: "", file: null });
      setShowUploadModal(false);
      await fetchArtwork();
      
    } catch (error) {
      console.error("Error uploading artwork:", error);
      alert("Failed to upload artwork");
    } finally {
      setUploading(false);
    }
  };

  // Delete artwork
  const handleDeleteArtwork = async (artwork: Artwork) => {
    if (!confirm(`Delete "${artwork.name}"?`)) return;
    
    try {
      // Delete from Storage
      const storageRef = ref(storage, artwork.url);
      await deleteObject(storageRef).catch(() => {
        // Ignore if file doesn't exist
      });
      
      // Delete from Firestore
      await deleteDoc(doc(db, "artwork", artwork.id));
      
      // Refresh list
      await fetchArtwork();
    } catch (error) {
      console.error("Error deleting artwork:", error);
    }
  };

  // Update artwork metadata
  const handleUpdateArtwork = async () => {
    if (!editingArtwork) return;
    
    try {
      await updateDoc(doc(db, "artwork", editingArtwork.id), {
        name: editingArtwork.name,
        category: editingArtwork.category,
        tags: editingArtwork.tags
      });
      
      setEditingArtwork(null);
      await fetchArtwork();
    } catch (error) {
      console.error("Error updating artwork:", error);
    }
  };

  // Filter artwork based on search and category
  const filteredArtwork = artworks.filter(artwork => {
    const matchesSearch = artwork.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          artwork.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === "all" || artwork.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Artwork Repository</h1>
        <p className="text-gray-400">Manage and organize artwork for gift cards</p>
      </div>

      {/* Controls Bar */}
      <div className="bg-[#111111] border border-[#262626] rounded-lg p-4 mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search artwork..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[#0a0a0a] border border-[#262626] rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-[200px] px-4 py-2 bg-[#0a0a0a] border border-[#262626] rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Categories</option>
            {ARTWORK_CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          {/* View Mode Toggle */}
          <div className="flex gap-2">
            <Button
              variant={viewMode === "grid" ? "default" : "outline"}
              size="icon"
              onClick={() => setViewMode("grid")}
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "outline"}
              size="icon"
              onClick={() => setViewMode("list")}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>

          {/* Upload Button */}
          <Button onClick={() => setShowUploadModal(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" />
            Upload Artwork
          </Button>
        </div>

        {/* Stats */}
        <div className="flex gap-6 mt-4 text-sm">
          <span className="text-gray-400">
            Total: <span className="text-white font-medium">{artworks.length}</span>
          </span>
          <span className="text-gray-400">
            Filtered: <span className="text-white font-medium">{filteredArtwork.length}</span>
          </span>
        </div>
      </div>

      {/* Artwork Grid/List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
        </div>
      ) : filteredArtwork.length === 0 ? (
        <div className="text-center py-12 bg-[#111111] border border-[#262626] rounded-lg">
          <ImageIcon className="h-12 w-12 text-gray-500 mx-auto mb-4" />
          <p className="text-gray-400">No artwork found</p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredArtwork.map(artwork => (
            <div key={artwork.id} className="group relative bg-[#111111] border border-[#262626] rounded-lg overflow-hidden hover:border-[#333333] transition-all">
              {/* Image */}
              <div className="relative aspect-[3/2] bg-gray-900">
                <Image
                  src={artwork.url}
                  alt={artwork.name}
                  fill
                  className="object-cover"
                />
                {/* Overlay on hover */}
                <div className="absolute inset-0 bg-black bg-opacity-75 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button
                    size="icon"
                    variant="secondary"
                    onClick={() => setEditingArtwork(artwork)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="destructive"
                    onClick={() => handleDeleteArtwork(artwork)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              {/* Info */}
              <div className="p-3">
                <h3 className="text-sm font-medium text-white truncate">{artwork.name}</h3>
                <p className="text-xs text-gray-400 mt-1">{artwork.category}</p>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-xs text-gray-500">
                    {artwork.dimensions.width}x{artwork.dimensions.height}
                  </span>
                  {artwork.usageCount > 0 && (
                    <span className="text-xs bg-green-900/50 text-green-400 px-2 py-0.5 rounded">
                      Used {artwork.usageCount}x
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredArtwork.map(artwork => (
            <div key={artwork.id} className="flex items-center gap-4 bg-[#111111] border border-[#262626] rounded-lg p-4 hover:border-[#333333] transition-all">
              {/* Thumbnail */}
              <div className="relative w-24 h-16 bg-gray-900 rounded overflow-hidden flex-shrink-0">
                <Image
                  src={artwork.url}
                  alt={artwork.name}
                  fill
                  className="object-cover"
                />
              </div>
              
              {/* Info */}
              <div className="flex-1">
                <h3 className="text-white font-medium">{artwork.name}</h3>
                <div className="flex gap-4 text-sm text-gray-400 mt-1">
                  <span>{artwork.category}</span>
                  <span>{artwork.dimensions.width}x{artwork.dimensions.height}</span>
                  <span>{(artwork.fileSize / 1024).toFixed(0)}KB</span>
                  {artwork.usageCount > 0 && (
                    <span className="text-green-400">Used {artwork.usageCount}x</span>
                  )}
                </div>
                {artwork.tags.length > 0 && (
                  <div className="flex gap-1 mt-2">
                    {artwork.tags.map(tag => (
                      <span key={tag} className="text-xs bg-gray-800 px-2 py-0.5 rounded">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => setEditingArtwork(artwork)}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => handleDeleteArtwork(artwork)}
                  className="hover:bg-red-900/20 hover:text-red-400"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#111111] border border-[#262626] rounded-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">Upload Artwork</h2>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setShowUploadModal(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-4">
              {/* File Upload */}
              <div>
                <Label>Image File</Label>
                <div className="mt-2">
                  <label className="flex items-center justify-center w-full h-32 border-2 border-dashed border-[#262626] rounded-lg cursor-pointer hover:border-[#333333] transition-colors">
                    <div className="text-center">
                      {uploadForm.file ? (
                        <>
                          <Check className="h-8 w-8 text-green-500 mx-auto mb-2" />
                          <p className="text-sm text-white">{uploadForm.file.name}</p>
                        </>
                      ) : (
                        <>
                          <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-400">Click to upload</p>
                        </>
                      )}
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handleFileSelect}
                    />
                  </label>
                </div>
              </div>

              {/* Name */}
              <div>
                <Label>Name</Label>
                <input
                  value={uploadForm.name}
                  onChange={(e) => setUploadForm({ ...uploadForm, name: e.target.value })}
                  placeholder="e.g., Amazon Gift Card"
                  className="w-full mt-2 px-4 py-2 bg-[#0a0a0a] border border-[#262626] rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Category */}
              <div>
                <Label>Category</Label>
                <select
                  value={uploadForm.category}
                  onChange={(e) => setUploadForm({ ...uploadForm, category: e.target.value })}
                  className="w-full mt-2 px-4 py-2 bg-[#0a0a0a] border border-[#262626] rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="" disabled>Select category</option>
                  {ARTWORK_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Tags */}
              <div>
                <Label>Tags (comma-separated)</Label>
                <input
                  value={uploadForm.tags}
                  onChange={(e) => setUploadForm({ ...uploadForm, tags: e.target.value })}
                  placeholder="e.g., gift, card, shopping"
                  className="w-full mt-2 px-4 py-2 bg-[#0a0a0a] border border-[#262626] rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowUploadModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUploadArtwork}
                  disabled={uploading || !uploadForm.file || !uploadForm.name || !uploadForm.category}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  {uploading ? "Uploading..." : "Upload"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingArtwork && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#111111] border border-[#262626] rounded-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">Edit Artwork</h2>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setEditingArtwork(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-4">
              {/* Preview */}
              <div className="relative w-full h-48 bg-gray-900 rounded overflow-hidden">
                <Image
                  src={editingArtwork.url}
                  alt={editingArtwork.name}
                  fill
                  className="object-cover"
                />
              </div>

              {/* Name */}
              <div>
                <Label>Name</Label>
                <input
                  value={editingArtwork.name}
                  onChange={(e) => setEditingArtwork({ ...editingArtwork, name: e.target.value })}
                  className="w-full mt-2 px-4 py-2 bg-[#0a0a0a] border border-[#262626] rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Category */}
              <div>
                <Label>Category</Label>
                <select
                  value={editingArtwork.category}
                  onChange={(e) => setEditingArtwork({ ...editingArtwork, category: e.target.value })}
                  className="w-full mt-2 px-4 py-2 bg-[#0a0a0a] border border-[#262626] rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {ARTWORK_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Tags */}
              <div>
                <Label>Tags</Label>
                <input
                  value={editingArtwork.tags.join(", ")}
                  onChange={(e) => setEditingArtwork({
                    ...editingArtwork,
                    tags: e.target.value.split(",").map(tag => tag.trim()).filter(Boolean)
                  })}
                  className="w-full mt-2 px-4 py-2 bg-[#0a0a0a] border border-[#262626] rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setEditingArtwork(null)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUpdateArtwork}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}