"use client";

import React, { useState } from "react";
import { Send } from "lucide-react";
import { MediaUpload } from './MediaUpload';

interface Props {
  onSend: (text: string) => Promise<void> | void;
  conversationId?: string;
  recipientId?: string;
  onMediaSend?: (mediaMessage: any) => Promise<void> | void;
  disabled?: boolean;
  placeholder?: string;
}

export function MessageInput({ onSend, conversationId, recipientId, onMediaSend, disabled = false, placeholder = "Type a message (Enter to send, Shift+Enter for new line)" }: Props) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSend = async () => {
    const value = text.trim();
    if (!value || sending || disabled) return;
    
    // BUG FIX: 2025-01-28 - Clear input immediately for better UX
    // Problem: Message stays in input box for a second before disappearing
    // Solution: Clear input immediately when user sends message
    // Impact: Input clears instantly for better user experience
    setText("");
    
    try {
      setSending(true);
      await onSend(value);
    } catch (error) {
      // If sending fails, restore the message text so user can retry
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

  const handleMediaUploaded = async (mediaMessage: any) => {
    if (onMediaSend) {
      try {
        await onMediaSend(mediaMessage);
        setError(null);
      } catch (error) {
        console.error('Failed to send media:', error);
        setError('Failed to send media');
      }
    }
  };

  const handleMediaError = (errorMessage: string) => {
    setError(errorMessage);
  };

  return (
    <div className="border-t border-gray-800 bg-black/40">
      {error && (
        <div className="p-3 bg-red-900/20 border-b border-red-500/30 text-red-400 text-sm">
          {error}
        </div>
      )}
      
      <div className="p-3 flex items-center space-x-2">
        {/* Media upload controls */}
        {conversationId && (
          <MediaUpload
            conversationId={conversationId}
            recipientId={recipientId}
            onMediaUploaded={handleMediaUploaded}
            onError={handleMediaError}
          />
        )}
        
        <textarea
          className={`flex-1 resize-none bg-gray-900 text-white rounded-lg border border-gray-800 px-3 py-2 focus:outline-none focus:border-gray-700 min-h-[44px] max-h-36 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          placeholder={placeholder}
          value={text}
          onChange={(e) => !disabled && setText(e.target.value)}
          onKeyDown={!disabled ? handleKeyDown : undefined}
          rows={1}
          disabled={disabled}
        />
        <button
          onClick={handleSend}
          disabled={sending || text.trim() === "" || disabled}
          className="inline-flex items-center justify-center rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-3 py-2 text-white"
          aria-label="Send message"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}


