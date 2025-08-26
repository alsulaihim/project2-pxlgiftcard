// BUG FIX: 2025-01-27 - Profile picture upload component with Firebase Storage
// Problem: Profile pictures not persisting - only using blob URLs for preview
// Solution: Implement Firebase Storage upload with proper URL generation
// Impact: Profile pictures persist after upload and show in navigation

'use client';

import React, { useState, useRef } from 'react';
import { Upload, User, X, Loader2, Trash2 } from 'lucide-react';
import Image from 'next/image';
import { storage } from '@/lib/firebase-config';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { useAuth } from '@/contexts/auth-context';

interface ProfilePictureUploadProps {
  value?: string;
  onChange: (file: File | null, downloadUrl: string | null) => void;
  disabled?: boolean;
  className?: string;
}

export function ProfilePictureUpload({ 
  value, 
  onChange, 
  disabled = false, 
  className = '' 
}: ProfilePictureUploadProps) {
  const { user } = useAuth();
  const [previewUrl, setPreviewUrl] = useState<string | null>(value || null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Image optimization function
  const optimizeImage = (file: File): Promise<File> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new window.Image();
      
      img.onload = () => {
        // Set maximum dimensions (400x400 for profile pictures)
        const maxSize = 400;
        let { width, height } = img;
        
        // Calculate new dimensions maintaining aspect ratio
        if (width > height) {
          if (width > maxSize) {
            height = (height * maxSize) / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = (width * maxSize) / height;
            height = maxSize;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw and compress image
        ctx?.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const optimizedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(optimizedFile);
            } else {
              resolve(file);
            }
          },
          'image/jpeg',
          0.8 // 80% quality
        );
      };
      
      img.src = URL.createObjectURL(file);
    });
  };

  const handleFileSelect = async (file: File | null) => {
    if (!file) {
      setPreviewUrl(null);
      onChange(null, null);
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 10MB before optimization)
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB');
      return;
    }

    setIsUploading(true);

    try {
      // Optimize image before upload
      const optimizedFile = await optimizeImage(file);
      
      // Create preview URL for immediate display
      const localPreviewUrl = URL.createObjectURL(optimizedFile);
      setPreviewUrl(localPreviewUrl);

      // Upload to Firebase Storage if user is authenticated
      if (user) {
        try {
          const timestamp = Date.now();
          const fileName = `profile-pictures/${user.uid}/${timestamp}-optimized.jpg`;
          const storageRef = ref(storage, fileName);
          
          // Upload optimized file
          const snapshot = await uploadBytes(storageRef, optimizedFile);
          
          // Get download URL
          const downloadURL = await getDownloadURL(snapshot.ref);
          
          // Clean up local preview URL
          URL.revokeObjectURL(localPreviewUrl);
          
          // Update preview with actual URL and notify parent
          setPreviewUrl(downloadURL);
          onChange(optimizedFile, downloadURL);
        } catch (storageError) {
          console.warn('Firebase Storage not configured, using fallback method:', storageError);
          
          // Fallback: Convert optimized image to base64 data URL (temporary solution)
          const reader = new FileReader();
          reader.onload = (e) => {
            const dataURL = e.target?.result as string;
            URL.revokeObjectURL(localPreviewUrl);
            setPreviewUrl(dataURL);
            onChange(optimizedFile, dataURL);
          };
          reader.readAsDataURL(optimizedFile);
        }
      } else {
        // Fallback for when user is not authenticated yet (during signup)
        onChange(optimizedFile, localPreviewUrl);
      }
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      alert('Failed to upload profile picture. Please try again.');
      
      // Clean up on error
      URL.revokeObjectURL(localPreviewUrl);
      setPreviewUrl(null);
      onChange(null, null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileInputChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    await handleFileSelect(file);
  };

  const handleDrop = async (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(false);
    
    if (disabled || isUploading) return;
    
    const file = event.dataTransfer.files[0];
    if (file) {
      await handleFileSelect(file);
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    if (!disabled) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const handleClick = () => {
    if (!disabled && !isUploading && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleRemove = async (event: React.MouseEvent) => {
    event.stopPropagation();
    
    // Clean up blob URLs
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    
    // If there's a Firebase Storage URL, try to delete it
    if (previewUrl && previewUrl.includes('firebase')) {
      try {
        // Extract the file path from the URL for deletion
        const url = new URL(previewUrl);
        const pathMatch = url.pathname.match(/\/o\/(.+)\?/);
        if (pathMatch) {
          const filePath = decodeURIComponent(pathMatch[1]);
          const storageRef = ref(storage, filePath);
          await deleteObject(storageRef);
        }
      } catch (error) {
        console.warn('Could not delete file from storage:', error);
      }
    }
    
    setPreviewUrl(null);
    onChange(null, null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={`relative ${className}`}>
      <div
        className={`
          relative w-32 h-32 mx-auto rounded-full border-2 border-dashed 
          ${isDragging ? 'border-blue-500 bg-blue-50/10' : 'border-gray-600'}
          ${disabled || isUploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-gray-500'}
          transition-colors duration-200 overflow-hidden
        `}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
      >
        {previewUrl ? (
          <>
            <Image
              src={previewUrl}
              alt="Profile preview"
              fill
              className="object-cover"
              sizes="128px"
            />
            {isUploading && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-full">
                <Loader2 className="h-6 w-6 text-white animate-spin" />
              </div>
            )}
            {!disabled && !isUploading && (
              <div className="absolute top-1 right-1 flex gap-1">
                <button
                  type="button"
                  onClick={handleRemove}
                  className="bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 transition-colors shadow-lg"
                  aria-label="Remove image"
                  title="Remove image"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            {isUploading ? (
              <>
                <Loader2 className="h-8 w-8 mb-2 animate-spin" />
                <span className="text-xs text-center px-2">Uploading...</span>
              </>
            ) : isDragging ? (
              <>
                <Upload className="h-8 w-8 mb-2" />
                <span className="text-xs text-center px-2">Drop image here</span>
              </>
            ) : (
              <>
                {/* Avatar placeholder covering full circle */}
                <div className="w-full h-full bg-gray-600 rounded-full flex items-center justify-center">
                  <User className="h-12 w-12 text-gray-300" />
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileInputChange}
        className="hidden"
        disabled={disabled || isUploading}
        title="Upload profile picture"
        aria-label="Upload profile picture"
      />

      <div className="text-center mt-3">
        <p className="text-xs text-gray-400">
          Click or drag to upload
        </p>
        <p className="text-xs text-gray-500 mt-1">
          JPG, PNG, GIF up to 10MB • Auto-optimized
        </p>
      </div>
    </div>
  );
}
