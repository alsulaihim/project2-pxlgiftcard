/**
 * Media upload component for chat
 * Supports encrypted file, image, and voice note uploads
 * As specified in chat-architecture.mdc
 */

"use client";

import React, { useState, useRef } from 'react';
import { Image, Paperclip, Mic, X, Upload, Loader2 } from 'lucide-react';
import { mediaService, MediaFile } from '@/services/chat/media.service';

interface MediaUploadProps {
  conversationId: string;
  recipientId?: string;
  onMediaUploaded: (mediaMessage: any) => void;
  onError: (error: string) => void;
}

export const MediaUpload: React.FC<MediaUploadProps> = ({
  conversationId,
  recipientId,
  onMediaUploaded,
  onError
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Handle file upload
   */
  const handleFileUpload = async (file: File, type: 'image' | 'file' | 'voice') => {
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const mediaFile: MediaFile = {
        file,
        type,
        conversationId,
        recipientId
      };

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const result = await mediaService.uploadEncryptedMedia(mediaFile);
      const mediaMessage = mediaService.createMediaMessage(result, type);

      clearInterval(progressInterval);
      setUploadProgress(100);

      // Call parent callback with media message
      onMediaUploaded({
        ...mediaMessage,
        type: 'media',
        mediaType: type
      });

      console.log('📁 Media uploaded successfully:', type);

    } catch (error) {
      console.error('Media upload failed:', error);
      onError(error instanceof Error ? error.message : 'Failed to upload media');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  /**
   * Handle image selection
   */
  const handleImageSelect = () => {
    imageInputRef.current?.click();
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileUpload(file, 'image');
    }
    // Reset input
    event.target.value = '';
  };

  /**
   * Handle file selection
   */
  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileUpload(file, 'file');
    }
    // Reset input
    event.target.value = '';
  };

  /**
   * Handle voice recording
   */
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const audioChunks: Blob[] = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        const audioFile = new File([audioBlob], `voice-${Date.now()}.webm`, {
          type: 'audio/webm'
        });
        
        handleFileUpload(audioFile, 'voice');
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      // Start recording timer
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('Failed to start recording:', error);
      onError('Failed to access microphone');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
    }
  };

  /**
   * Format recording time
   */
  const formatRecordingTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isUploading) {
    return (
      <div className="flex items-center space-x-3 p-3 bg-gray-800 rounded-lg">
        <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
        <div className="flex-1">
          <div className="text-sm text-gray-300">Uploading media...</div>
          <div className="w-full bg-gray-700 rounded-full h-2 mt-1">
            <div 
              className={`bg-blue-500 h-2 rounded-full transition-all duration-300 ${
                uploadProgress === 0 ? 'w-0' :
                uploadProgress <= 10 ? 'w-1/12' :
                uploadProgress <= 20 ? 'w-1/6' :
                uploadProgress <= 25 ? 'w-1/4' :
                uploadProgress <= 33 ? 'w-1/3' :
                uploadProgress <= 40 ? 'w-2/5' :
                uploadProgress <= 50 ? 'w-1/2' :
                uploadProgress <= 60 ? 'w-3/5' :
                uploadProgress <= 66 ? 'w-2/3' :
                uploadProgress <= 75 ? 'w-3/4' :
                uploadProgress <= 80 ? 'w-4/5' :
                uploadProgress <= 90 ? 'w-11/12' :
                uploadProgress < 100 ? 'w-[95%]' :
                'w-full'
              }`}
            />
          </div>
        </div>
      </div>
    );
  }

  if (isRecording) {
    return (
      <div className="flex items-center space-x-3 p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
        <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
        <div className="flex-1">
          <div className="text-sm text-red-400">Recording...</div>
          <div className="text-xs text-gray-400">{formatRecordingTime(recordingTime)}</div>
        </div>
        <button
          onClick={stopRecording}
          className="p-2 hover:bg-red-500/20 rounded-full transition-colors"
          title="Stop recording"
        >
          <X className="w-4 h-4 text-red-400" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2">
      {/* Image upload */}
      <button
        onClick={handleImageSelect}
        className="p-2 hover:bg-gray-700 rounded-full transition-colors"
        title="Upload image"
      >
        <Image className="w-5 h-5 text-gray-400 hover:text-white" />
      </button>

      {/* File upload */}
      <button
        onClick={handleFileSelect}
        className="p-2 hover:bg-gray-700 rounded-full transition-colors"
        title="Upload file"
      >
        <Paperclip className="w-5 h-5 text-gray-400 hover:text-white" />
      </button>

      {/* Voice recording */}
      <button
        onClick={startRecording}
        className="p-2 hover:bg-gray-700 rounded-full transition-colors"
        title="Record voice note"
      >
        <Mic className="w-5 h-5 text-gray-400 hover:text-white" />
      </button>

      {/* Hidden file inputs */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageChange}
        className="hidden"
        aria-label="Select image file"
        title="Select image file"
      />
      
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.txt,.doc,.docx"
        onChange={handleFileChange}
        className="hidden"
        aria-label="Select document file"
        title="Select document file"
      />
    </div>
  );
};
