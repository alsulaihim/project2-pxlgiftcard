/**
 * Media service for encrypted file upload and sharing
 * Implements encrypted media storage as specified in chat-architecture.mdc
 * Supports images, files, and voice notes with Firebase Storage
 */

"use client";

import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '@/lib/firebase-config';
import { encryptionService } from './encryption.service';
import { keyExchangeService } from './key-exchange.service';

export interface MediaFile {
  file: File;
  type: 'image' | 'file' | 'voice';
  conversationId: string;
  recipientId?: string; // For direct messages
}

export interface EncryptedMediaResult {
  downloadUrl: string;
  encryptedKey: string;
  nonce: string;
  metadata: {
    fileName: string;
    fileSize: number;
    mimeType: string;
    duration?: number; // For voice notes
    width?: number;    // For images
    height?: number;   // For images
  };
}

export interface MediaMessage {
  type: 'image' | 'file' | 'voice';
  downloadUrl: string;
  encryptedKey: string;
  nonce: string;
  metadata: {
    fileName: string;
    fileSize: number;
    mimeType: string;
    duration?: number;
    width?: number;
    height?: number;
  };
}

/**
 * Media service for handling encrypted file uploads and downloads
 */
export class MediaService {
  private static instance: MediaService;
  private maxFileSize = 25 * 1024 * 1024; // 25MB max file size
  private allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  private allowedFileTypes = ['application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  private allowedAudioTypes = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm'];

  private constructor() {}

  static getInstance(): MediaService {
    if (!MediaService.instance) {
      MediaService.instance = new MediaService();
    }
    return MediaService.instance;
  }

  /**
   * Upload encrypted media file to Firebase Storage
   */
  async uploadEncryptedMedia(mediaFile: MediaFile): Promise<EncryptedMediaResult> {
    try {
      // Validate file
      this.validateFile(mediaFile.file, mediaFile.type);

      // Process file based on type
      const processedFile = await this.processFile(mediaFile.file, mediaFile.type);

      // Generate encryption key for this file
      const fileEncryptionKey = encryptionService.generateKeyPair();

      // Encrypt file content
      const fileBuffer = await processedFile.arrayBuffer();
      const fileBytes = new Uint8Array(fileBuffer);
      const encryptedData = encryptionService.encryptBinary(fileBytes, fileEncryptionKey.publicKey);

      // Create encrypted blob
      const encryptedBlob = new Blob([encryptedData.content], { type: 'application/octet-stream' });

      // Generate unique file path
      const fileId = this.generateFileId();
      const filePath = `chat-media/${mediaFile.conversationId}/${fileId}`;

      // Upload to Firebase Storage
      const storageRef = ref(storage, filePath);
      const uploadResult = await uploadBytes(storageRef, encryptedBlob);
      const downloadUrl = await getDownloadURL(uploadResult.ref);

      // Encrypt the file encryption key for the recipient(s)
      let encryptedKey = fileEncryptionKey.privateKey;
      if (mediaFile.recipientId) {
        const recipientPublicKey = await keyExchangeService.getPublicKey(mediaFile.recipientId);
        if (recipientPublicKey) {
          const keyEncryption = encryptionService.encryptMessage(fileEncryptionKey.privateKey, recipientPublicKey);
          encryptedKey = keyEncryption.content;
        }
      }

      // Get file metadata
      const metadata = await this.getFileMetadata(processedFile, mediaFile.type);

      console.log('📁 Media file uploaded and encrypted:', fileId);

      return {
        downloadUrl,
        encryptedKey,
        nonce: encryptedData.nonce,
        metadata
      };

    } catch (error) {
      console.error('Failed to upload encrypted media:', error);
      throw error;
    }
  }

  /**
   * Download and decrypt media file
   */
  async downloadDecryptedMedia(mediaMessage: MediaMessage, senderId?: string): Promise<Blob> {
    try {
      // Download encrypted file
      const response = await fetch(mediaMessage.downloadUrl);
      const encryptedBlob = await response.blob();
      const encryptedBytes = new Uint8Array(await encryptedBlob.arrayBuffer());

      // Decrypt file encryption key
      let fileKey = mediaMessage.encryptedKey;
      if (senderId) {
        const senderPublicKey = await keyExchangeService.getPublicKey(senderId);
        if (senderPublicKey) {
          fileKey = encryptionService.decryptMessage(
            { content: mediaMessage.encryptedKey, nonce: mediaMessage.nonce },
            senderPublicKey
          );
        }
      }

      // Decrypt file content
      const decryptedBytes = encryptionService.decryptBinary(
        { content: encryptedBytes, nonce: mediaMessage.nonce },
        fileKey
      );

      // Create decrypted blob with original mime type
      const decryptedBlob = new Blob([decryptedBytes], { 
        type: mediaMessage.metadata.mimeType 
      });

      console.log('📁 Media file downloaded and decrypted');
      return decryptedBlob;

    } catch (error) {
      console.error('Failed to download/decrypt media:', error);
      throw error;
    }
  }

  /**
   * Delete media file from storage
   */
  async deleteMedia(downloadUrl: string): Promise<void> {
    try {
      const storageRef = ref(storage, downloadUrl);
      await deleteObject(storageRef);
      console.log('🗑️ Media file deleted from storage');
    } catch (error) {
      console.error('Failed to delete media file:', error);
      throw error;
    }
  }

  /**
   * Validate file type and size
   */
  private validateFile(file: File, type: 'image' | 'file' | 'voice'): void {
    // Check file size
    if (file.size > this.maxFileSize) {
      throw new Error(`File size exceeds ${this.maxFileSize / (1024 * 1024)}MB limit`);
    }

    // Check file type
    let allowedTypes: string[];
    switch (type) {
      case 'image':
        allowedTypes = this.allowedImageTypes;
        break;
      case 'voice':
        allowedTypes = this.allowedAudioTypes;
        break;
      case 'file':
        allowedTypes = this.allowedFileTypes;
        break;
      default:
        throw new Error('Invalid media type');
    }

    if (!allowedTypes.includes(file.type)) {
      throw new Error(`File type ${file.type} not allowed for ${type} uploads`);
    }
  }

  /**
   * Process file based on type (compression, optimization)
   */
  private async processFile(file: File, type: 'image' | 'file' | 'voice'): Promise<File> {
    switch (type) {
      case 'image':
        return await this.compressImage(file);
      case 'voice':
        return await this.processAudio(file);
      case 'file':
        return file; // No processing for general files
      default:
        return file;
    }
  }

  /**
   * Compress image for optimal storage and transmission
   */
  private async compressImage(file: File): Promise<File> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Calculate new dimensions (max 1920x1080)
        const maxWidth = 1920;
        const maxHeight = 1080;
        let { width, height } = img;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width *= ratio;
          height *= ratio;
        }

        canvas.width = width;
        canvas.height = height;

        // Draw and compress
        ctx?.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now()
              });
              resolve(compressedFile);
            } else {
              reject(new Error('Image compression failed'));
            }
          },
          'image/jpeg',
          0.8 // 80% quality
        );
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Process audio file (basic validation)
   */
  private async processAudio(file: File): Promise<File> {
    // For now, just return the file as-is
    // In production, you might want to compress audio or convert formats
    return file;
  }

  /**
   * Get file metadata
   */
  private async getFileMetadata(file: File, type: 'image' | 'file' | 'voice'): Promise<{
    fileName: string;
    fileSize: number;
    mimeType: string;
    duration?: number;
    width?: number;
    height?: number;
  }> {
    const metadata = {
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type
    };

    if (type === 'image') {
      const dimensions = await this.getImageDimensions(file);
      return { ...metadata, ...dimensions };
    }

    if (type === 'voice') {
      const duration = await this.getAudioDuration(file);
      return { ...metadata, duration };
    }

    return metadata;
  }

  /**
   * Get image dimensions
   */
  private async getImageDimensions(file: File): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.width, height: img.height });
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Get audio duration
   */
  private async getAudioDuration(file: File): Promise<number> {
    return new Promise((resolve, reject) => {
      const audio = new Audio();
      audio.onloadedmetadata = () => resolve(audio.duration);
      audio.onerror = () => reject(new Error('Failed to load audio'));
      audio.src = URL.createObjectURL(file);
    });
  }

  /**
   * Generate unique file ID
   */
  private generateFileId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Create media message object for Firestore
   */
  createMediaMessage(result: EncryptedMediaResult, type: 'image' | 'file' | 'voice'): MediaMessage {
    return {
      type,
      downloadUrl: result.downloadUrl,
      encryptedKey: result.encryptedKey,
      nonce: result.nonce,
      metadata: result.metadata
    };
  }
}

// Export singleton instance
export const mediaService = MediaService.getInstance();


