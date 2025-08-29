/**
 * Media message display component
 * Handles encrypted media display and download
 * As specified in chat-architecture.mdc
 */

"use client";

import React, { useState, useEffect } from 'react';
import { Download, Play, Pause, FileText, Image as ImageIcon, Loader2 } from 'lucide-react';
import { mediaService, MediaMessage } from '@/services/chat/media.service';

interface MediaMessageProps {
  mediaMessage: MediaMessage;
  senderId: string;
  isOwn: boolean;
  className?: string;
}

export const MediaMessageComponent: React.FC<MediaMessageProps> = ({
  mediaMessage,
  senderId,
  isOwn,
  className = ''
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Download and decrypt media
   */
  const handleDownload = async () => {
    if (mediaUrl) {
      // If already decrypted, just download
      const link = document.createElement('a');
      link.href = mediaUrl;
      link.download = mediaMessage.metadata.fileName;
      link.click();
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const decryptedBlob = await mediaService.downloadDecryptedMedia(mediaMessage, senderId);
      const url = URL.createObjectURL(decryptedBlob);
      setMediaUrl(url);

      // Auto-download for files
      if (mediaMessage.type === 'file') {
        const link = document.createElement('a');
        link.href = url;
        link.download = mediaMessage.metadata.fileName;
        link.click();
      }

    } catch (error) {
      console.error('Failed to download media:', error);
      setError('Failed to load media');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle image display
   */
  const handleImageDisplay = async () => {
    if (!mediaUrl) {
      await handleDownload();
    }
  };

  /**
   * Handle audio playback
   */
  const handleAudioPlay = async () => {
    if (!mediaUrl) {
      await handleDownload();
      return;
    }

    const audio = new Audio(mediaUrl);
    
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play();
      setIsPlaying(true);
      
      audio.onended = () => setIsPlaying(false);
      audio.onerror = () => {
        setIsPlaying(false);
        setError('Failed to play audio');
      };
    }
  };

  /**
   * Format file size
   */
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  /**
   * Format duration
   */
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Cleanup object URL on unmount
  useEffect(() => {
    return () => {
      if (mediaUrl) {
        URL.revokeObjectURL(mediaUrl);
      }
    };
  }, [mediaUrl]);

  const baseClasses = `
    max-w-sm rounded-lg overflow-hidden
    ${isOwn ? 'bg-blue-600' : 'bg-gray-700'}
    ${className}
  `;

  if (error) {
    return (
      <div className={`${baseClasses} p-4`}>
        <div className="flex items-center space-x-2 text-red-400">
          <FileText className="w-5 h-5" />
          <div>
            <div className="text-sm font-medium">Media Error</div>
            <div className="text-xs opacity-70">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  // Image message
  if (mediaMessage.type === 'image') {
    return (
      <div className={baseClasses}>
        {mediaUrl ? (
          <img
            src={mediaUrl}
            alt={mediaMessage.metadata.fileName}
            className="w-full h-auto cursor-pointer"
            onClick={() => window.open(mediaUrl, '_blank')}
          />
        ) : (
          <div 
            className="w-full h-48 bg-gray-800 flex items-center justify-center cursor-pointer"
            onClick={handleImageDisplay}
          >
            {isLoading ? (
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            ) : (
              <div className="text-center">
                <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <div className="text-sm text-gray-300">Click to view image</div>
                <div className="text-xs text-gray-400">
                  {formatFileSize(mediaMessage.metadata.fileSize)}
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Image metadata */}
        <div className="p-3 bg-black/20">
          <div className="text-xs text-gray-300">
            {mediaMessage.metadata.fileName}
          </div>
          {mediaMessage.metadata.width && mediaMessage.metadata.height && (
            <div className="text-xs text-gray-400">
              {mediaMessage.metadata.width} × {mediaMessage.metadata.height}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Voice message
  if (mediaMessage.type === 'voice') {
    return (
      <div className={`${baseClasses} p-4`}>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleAudioPlay}
            disabled={isLoading}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : isPlaying ? (
              <Pause className="w-5 h-5" />
            ) : (
              <Play className="w-5 h-5" />
            )}
          </button>
          
          <div className="flex-1">
            <div className="text-sm font-medium">Voice Message</div>
            <div className="text-xs opacity-70">
              {mediaMessage.metadata.duration 
                ? formatDuration(mediaMessage.metadata.duration)
                : formatFileSize(mediaMessage.metadata.fileSize)
              }
            </div>
          </div>
          
          <button
            onClick={handleDownload}
            className="p-2 rounded-full hover:bg-white/10 transition-colors"
            title="Download"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // File message
  return (
    <div className={`${baseClasses} p-4`}>
      <div className="flex items-center space-x-3">
        <div className="p-2 rounded-full bg-white/10">
          <FileText className="w-6 h-6" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">
            {mediaMessage.metadata.fileName}
          </div>
          <div className="text-xs opacity-70">
            {formatFileSize(mediaMessage.metadata.fileSize)}
          </div>
        </div>
        
        <button
          onClick={handleDownload}
          disabled={isLoading}
          className="p-2 rounded-full hover:bg-white/10 transition-colors"
          title="Download"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  );
};


