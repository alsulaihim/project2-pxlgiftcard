"use client";

import React, { useState, useEffect } from "react";
import { db } from "@/lib/firebase-config";
import { collection, getDocs, query, orderBy, updateDoc, doc, increment } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { X, Search, Check, Grid, List } from "lucide-react";
import Image from "next/image";

interface Artwork {
  id: string;
  name: string;
  url: string;
  category: string;
  tags: string[];
  dimensions: {
    width: number;
    height: number;
  };
  usageCount: number;
}

interface ArtworkGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (artwork: Artwork) => void;
  selectedArtworkUrl?: string;
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

export function ArtworkGalleryModal({
  isOpen,
  onClose,
  onSelect,
  selectedArtworkUrl
}: ArtworkGalleryModalProps) {
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedArtwork, setSelectedArtwork] = useState<Artwork | null>(null);

  // Fetch artwork from repository
  const fetchArtwork = async () => {
    try {
      const q = query(collection(db, "artwork"), orderBy("usageCount", "desc"));
      const snapshot = await getDocs(q);
      const artworkList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Artwork));
      setArtworks(artworkList);
      
      // Pre-select if URL matches
      if (selectedArtworkUrl) {
        const preSelected = artworkList.find(a => a.url === selectedArtworkUrl);
        if (preSelected) setSelectedArtwork(preSelected);
      }
    } catch (error) {
      console.error("Error fetching artwork:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchArtwork();
    }
  }, [isOpen, selectedArtworkUrl]);

  // Filter artwork
  const filteredArtwork = artworks.filter(artwork => {
    const matchesSearch = artwork.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          artwork.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === "all" || artwork.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Handle selection
  const handleSelectArtwork = async () => {
    if (!selectedArtwork) return;
    
    // Update usage count
    try {
      await updateDoc(doc(db, "artwork", selectedArtwork.id), {
        usageCount: increment(1)
      });
    } catch (error) {
      console.error("Error updating usage count:", error);
    }
    
    onSelect(selectedArtwork);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#111111] border border-[#262626] rounded-lg w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-[#262626]">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-white">Select Artwork</h2>
            <Button size="icon" variant="ghost" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Controls */}
          <div className="flex flex-col sm:flex-row gap-3">
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
              className="w-[180px] px-4 py-2 bg-[#0a0a0a] border border-[#262626] rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Categories</option>
              {ARTWORK_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            {/* View Mode */}
            <div className="flex gap-1">
              <Button
                size="icon"
                variant={viewMode === "grid" ? "default" : "outline"}
                onClick={() => setViewMode("grid")}
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant={viewMode === "list" ? "default" : "outline"}
                onClick={() => setViewMode("list")}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            </div>
          ) : filteredArtwork.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400">No artwork found</p>
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {filteredArtwork.map(artwork => (
                <div
                  key={artwork.id}
                  onClick={() => setSelectedArtwork(artwork)}
                  className={`
                    relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all
                    ${selectedArtwork?.id === artwork.id 
                      ? 'border-blue-500 ring-2 ring-blue-500/50' 
                      : 'border-[#262626] hover:border-[#333333]'}
                  `}
                >
                  {/* Image */}
                  <div className="relative aspect-[3/2] bg-gray-900">
                    <Image
                      src={artwork.url}
                      alt={artwork.name}
                      fill
                      className="object-cover"
                    />
                    {/* Selected Indicator */}
                    {selectedArtwork?.id === artwork.id && (
                      <div className="absolute top-2 right-2 bg-blue-500 rounded-full p-1">
                        <Check className="h-4 w-4 text-white" />
                      </div>
                    )}
                    {/* Usage Badge */}
                    {artwork.usageCount > 0 && (
                      <div className="absolute bottom-2 left-2 bg-black bg-opacity-75 text-xs text-white px-2 py-1 rounded">
                        Used {artwork.usageCount}x
                      </div>
                    )}
                  </div>
                  
                  {/* Info */}
                  <div className="p-2 bg-[#0a0a0a]">
                    <p className="text-xs text-white truncate">{artwork.name}</p>
                    <p className="text-xs text-gray-400">{artwork.category}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredArtwork.map(artwork => (
                <div
                  key={artwork.id}
                  onClick={() => setSelectedArtwork(artwork)}
                  className={`
                    flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all
                    ${selectedArtwork?.id === artwork.id 
                      ? 'bg-blue-900/20 border-2 border-blue-500' 
                      : 'bg-[#0a0a0a] border-2 border-[#262626] hover:border-[#333333]'}
                  `}
                >
                  {/* Thumbnail */}
                  <div className="relative w-20 h-14 bg-gray-900 rounded overflow-hidden flex-shrink-0">
                    <Image
                      src={artwork.url}
                      alt={artwork.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  
                  {/* Info */}
                  <div className="flex-1">
                    <p className="text-white font-medium">{artwork.name}</p>
                    <div className="flex gap-3 text-xs text-gray-400 mt-1">
                      <span>{artwork.category}</span>
                      <span>{artwork.dimensions.width}x{artwork.dimensions.height}</span>
                      {artwork.usageCount > 0 && (
                        <span className="text-green-400">Used {artwork.usageCount}x</span>
                      )}
                    </div>
                  </div>
                  
                  {/* Selected Indicator */}
                  {selectedArtwork?.id === artwork.id && (
                    <div className="bg-blue-500 rounded-full p-1">
                      <Check className="h-4 w-4 text-white" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#262626]">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-400">
              {selectedArtwork ? (
                <span>Selected: <span className="text-white">{selectedArtwork.name}</span></span>
              ) : (
                <span>No artwork selected</span>
              )}
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                onClick={handleSelectArtwork}
                disabled={!selectedArtwork}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Select Artwork
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}