"use client";

import React, { useState, useRef } from "react";
import { Send, Paperclip, Image, Mic, Smile, X, Reply } from "lucide-react";
import { VoiceRecorder } from './VoiceRecorder';

interface Props {
  onSend: (text: string) => Promise<void> | void;
  onMediaSend?: (mediaMessage: unknown) => Promise<void> | void;
  onTyping?: (isTyping: boolean) => void;
  disabled?: boolean;
  placeholder?: string;
  replyingTo?: {
    id: string;
    text?: string;
    senderId: string;
    senderName?: string;
  };
  onCancelReply?: () => void;
}

export function MessageInput({ 
  onSend, 
  onMediaSend, 
  onTyping, 
  disabled = false, 
  placeholder = "Write a message...",
  replyingTo,
  onCancelReply
}: Props) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const handleSend = async () => {
    const value = text.trim();
    if (!value || sending || disabled) return;
    
    setText("");
    
    try {
      setSending(true);
      await onSend(value);
    } catch (error) {
      setText(value);
      throw error;
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'file') => {
    const file = e.target.files?.[0];
    if (!file || !onMediaSend) return;

    try {
      // For now, simulate media upload - in production this would upload to storage
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        await onMediaSend({
          downloadUrl: base64,
          mediaType: type,
          metadata: {
            fileName: file.name,
            fileSize: file.size,
            mimeType: file.type
          }
        });
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Failed to upload file:', error);
    }
    
    // Reset input
    e.target.value = '';
  };

  return (
    <div className="relative px-4 pb-4">
      {/* Reply indicator */}
      {replyingTo && (
        <div className="mb-2 bg-[#1a1a1a] rounded-t-lg px-4 py-2 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Reply className="w-4 h-4 text-blue-400" />
              <div>
                <div className="text-xs text-blue-400">
                  Replying to {replyingTo.senderName || 'a message'}
                </div>
                <div className="text-xs text-gray-400 truncate max-w-md">
                  {replyingTo.text || replyingTo.content || 'Media message'}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={onCancelReply}
              className="p-1 hover:bg-[#262626] rounded transition-colors"
              title="Cancel reply"
              aria-label="Cancel reply"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>
      )}
      
      {/* Voice Recorder */}
      {isRecording && (
        <div className="mb-2">
          <VoiceRecorder
            autoStart={true}
            onCancel={() => setIsRecording(false)}
            onSend={() => {
              setIsRecording(false);
              // Voice message will be sent through the VoiceRecorder component itself
            }}
          />
        </div>
      )}
      
      {/* Floating input container */}
      <div className="relative bg-[#1a1a1a] rounded-lg overflow-hidden">
        <div className="flex items-end">
          {/* Left side icons */}
          <div className="flex items-center gap-1 p-2">
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              className="p-1.5 hover:bg-[#262626] rounded transition-colors"
              title="Attach image"
            >
              <Image className="w-4 h-4 text-gray-400 hover:text-gray-300" />
            </button>
            
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-1.5 hover:bg-[#262626] rounded transition-colors"
              title="Attach file"
            >
              <Paperclip className="w-4 h-4 text-gray-400 hover:text-gray-300" />
            </button>

            <button
              type="button"
              onClick={() => {
                if (!isRecording) {
                  setIsRecording(true);
                  // Will trigger VoiceRecorder to start immediately
                } else {
                  setIsRecording(false);
                }
              }}
              className={`p-1.5 hover:bg-[#262626] rounded transition-colors ${
                isRecording ? 'bg-[#262626]' : ''
              }`}
              title={isRecording ? "Cancel recording" : "Record voice"}
            >
              <Mic className={`w-4 h-4 ${
                isRecording ? 'text-red-500 animate-pulse' : 'text-gray-400 hover:text-gray-300'
              }`} />
            </button>

            <button
              type="button"
              className="p-1.5 hover:bg-[#262626] rounded transition-colors"
              title="Add emoji"
            >
              <Smile className="w-4 h-4 text-gray-400 hover:text-gray-300" />
            </button>
          </div>

          {/* Text input */}
          <textarea
            className="flex-1 bg-transparent text-gray-300 placeholder-gray-500 resize-none py-3 pr-2 outline-none focus:outline-none focus:ring-0 border-none focus:border-none min-h-[44px] max-h-32"
            placeholder={placeholder}
            value={text}
            onChange={(e) => {
              if (!disabled) {
                setText(e.target.value);
                if (onTyping) {
                  onTyping(e.target.value.length > 0);
                }
              }
            }}
            onKeyDown={!disabled ? handleKeyDown : undefined}
            onBlur={() => onTyping && onTyping(false)}
            rows={1}
            disabled={disabled}
            style={{ 
              scrollbarWidth: 'thin',
              border: 'none',
              outline: 'none',
              boxShadow: 'none'
            }}
          />

          {/* Send button */}
          <div className="p-2">
            <button
              type="button"
              onClick={handleSend}
              disabled={sending || text.trim() === "" || disabled}
              className={`p-2 rounded-lg transition-colors ${
                text.trim() && !disabled 
                  ? 'bg-white hover:bg-gray-200 text-black' 
                  : 'bg-[#262626] text-gray-600 cursor-not-allowed'
              }`}
              aria-label="Send message"
              title="Send message"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Hidden file inputs */}
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          onChange={(e) => handleFileUpload(e, 'image')}
          className="hidden"
          aria-label="Upload image"
        />
        
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.txt,.doc,.docx,.zip"
          onChange={(e) => handleFileUpload(e, 'file')}
          className="hidden"
          aria-label="Upload file"
        />
      </div>
    </div>
  );
}