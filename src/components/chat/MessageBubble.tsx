"use client";

import React, { useState } from "react";
import { ChatMessage } from "@/services/chat/firestore-chat.service";
import { MessageStatus } from "./MessageStatus";
import { MoreVertical, Edit2, Reply, Trash2, Copy, Pin, Smile, Heart, ThumbsUp, ThumbsDown, Laugh } from "lucide-react";

interface MessageBubbleProps {
  message: ChatMessage & {
    status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
    delivered?: string[];
    read?: string[];
    reactions?: { [emoji: string]: string[] };
    edited?: boolean;
    editedAt?: any;
    replyTo?: any;
  };
  isOwn: boolean;
  user?: {
    displayName?: string;
    photoURL?: string;
    tier?: 'starter' | 'rising' | 'pro' | 'pixlbeast' | 'pixlionaire';
  };
  showAvatar?: boolean;
  onReply?: (message: ChatMessage) => void;
  onEdit?: (messageId: string, newText: string) => void;
  onDelete?: (messageId: string) => void;
  onReact?: (messageId: string, emoji: string) => void;
  currentUserId?: string;
}

/**
 * Slack-style message bubble with Vercel dark theme
 */
export const MessageBubble: React.FC<MessageBubbleProps> = ({ 
  message, 
  isOwn, 
  user,
  showAvatar = true,
  onReply,
  onEdit,
  onDelete,
  onReact,
  currentUserId = ''
}) => {
  const [showActions, setShowActions] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.text || '');
  
  const quickReactions = ['👍', '❤️', '😂', '😮', '😢', '🎉'];
  const formatTime = (timestamp: any) => {
    if (!timestamp || typeof timestamp.toDate !== 'function') return '';
    const date = timestamp.toDate();
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const messageType = (message as any).type || 'text';
  const metadata = (message as any).metadata;
  
  // Show message ID when shift is held
  const [showId, setShowId] = React.useState(false);
  
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey) setShowId(true);
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (!e.shiftKey) setShowId(false);
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  return (
    <div 
      className={`group flex ${isOwn ? "justify-end" : "justify-start"} px-4 py-3 hover:bg-[#1a1a1a]/30 transition-colors`}
      onMouseLeave={() => {
        setShowActions(false);
        setShowReactions(false);
      }}
      title={`Message ID: ${message.id} (Hold Shift to see ID)`}
    >
      <div className={`flex ${isOwn ? 'flex-row-reverse' : 'flex-row'} items-start gap-2 max-w-[70%]`}>
        {/* Avatar */}
        {!isOwn && showAvatar && (
          <img 
            src={user?.photoURL || '/default-avatar.png'} 
            alt={user?.displayName || 'User'}
            className="w-8 h-8 rounded-full object-cover bg-[#262626] flex-shrink-0 mt-0.5"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/default-avatar.png';
            }}
          />
        )}
        
        {/* Message wrapper with inline actions */}
        <div className="flex flex-col">
          {/* Message ID - shown when shift is held */}
          {showId && (
            <div className="text-[10px] text-yellow-500 mb-1 font-mono bg-black/50 px-2 py-0.5 rounded">
              ID: {message.id}
            </div>
          )}
          
          {/* User name - only for other users */}
          {!isOwn && (
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium text-white">
                {user?.displayName || 'User'}
              </span>
              {user?.tier && user.tier !== 'starter' && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                  user.tier === 'pixlionaire' ? 'bg-purple-900/30 text-purple-400' :
                  user.tier === 'pixlbeast' ? 'bg-amber-900/30 text-amber-400' :
                  user.tier === 'pro' ? 'bg-green-900/30 text-green-400' :
                  user.tier === 'rising' ? 'bg-blue-900/30 text-blue-400' :
                  'bg-gray-900/30 text-gray-400'
                }`}>
                  {user.tier.toUpperCase()}
                </span>
              )}
            </div>
          )}
          
          {/* Reply indicator */}
          {message.replyTo && (
            <div className={`mb-2 pl-3 border-l-2 border-gray-600 ${isOwn ? 'text-right' : ''}`}>
              <div className="text-xs text-gray-500">
                <Reply className="inline w-3 h-3 mr-1" />
                Replying to {message.replyTo.senderName || 'a message'}
              </div>
              <div className="text-xs text-gray-400 truncate max-w-xs">
                {message.replyTo.text || message.replyTo.content || 'Media message'}
              </div>
            </div>
          )}
          
          {/* Message content based on type - with chat bubble styling */}
          <div className={`${isOwn ? 'text-right' : ''}`}>
            {(() => {
              if (messageType === 'image' || (metadata?.mediaType === 'image')) {
                // Display image
                const imageUrl = metadata?.downloadUrl ||
                                message.text || 
                                (message as any).downloadUrl || 
                                (message as any).content || 
                                (message as any).decryptedContent;
                
                // Check if the image URL is encrypted/invalid
                const isInvalidUrl = !imageUrl || 
                                   imageUrl === '[Decrypting...]' || 
                                   imageUrl.includes('[') || 
                                   imageUrl === 'undefined' ||
                                   (!imageUrl.startsWith('http') && !imageUrl.startsWith('data:') && imageUrl.length < 200);
                
                if (isInvalidUrl) {
                  return (
                    <div className={`inline-flex items-center gap-2 p-3 rounded-2xl ${
                      isOwn 
                        ? 'bg-white text-black' 
                        : 'bg-[#262626] text-gray-300'
                    }`}>
                      <div className="text-2xl">🖼️</div>
                      <div>
                        <p className="text-sm">Image</p>
                        <p className="text-xs opacity-70">Unable to load</p>
                      </div>
                    </div>
                  );
                }
                
                return (
                  <div className={`inline-block p-1 rounded-2xl ${
                    isOwn 
                      ? 'bg-white' 
                      : 'bg-[#262626]'
                  }`}>
                    <img 
                      src={imageUrl}
                      alt="Shared image"
                      className="rounded-xl max-w-sm h-auto"
                      onError={(e) => {
                        // Silently handle error without console logging
                        (e.target as HTMLImageElement).src = '/default-avatar.png';
                      }}
                    />
                    {metadata?.fileName && (
                      <p className={`text-xs mt-1 px-2 pb-1 ${
                        isOwn ? 'text-gray-600' : 'text-gray-400'
                      }`}>{metadata.fileName}</p>
                    )}
                  </div>
                );
              } else if (messageType === 'file' || (metadata?.mediaType === 'file')) {
                // Display file attachment
                const fileUrl = metadata?.downloadUrl || message.text;
                return (
                  <a 
                    href={fileUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className={`inline-flex items-center gap-2 p-3 rounded-2xl transition-colors ${
                      isOwn 
                        ? 'bg-white text-black hover:bg-gray-100' 
                        : 'bg-[#262626] text-gray-300 hover:bg-[#333333]'
                    }`}
                  >
                    <div className="text-2xl">📎</div>
                    <div>
                      <p className="text-sm font-medium">{metadata?.fileName || 'File'}</p>
                      <p className={`text-xs ${isOwn ? 'text-gray-600' : 'text-gray-400'}`}>
                        {metadata?.fileSize ? `${(metadata.fileSize / 1024).toFixed(1)} KB` : ''}
                      </p>
                    </div>
                  </a>
                );
              } else if (messageType === 'voice' || (metadata?.mediaType === 'voice')) {
                // Display voice message with audio player
                const audioUrl = metadata?.downloadUrl || message.text;
                return (
                  <div className="space-y-2">
                    <div className={`inline-flex items-center gap-2 p-3 rounded-2xl ${
                      isOwn 
                        ? 'bg-white text-black' 
                        : 'bg-[#262626] text-gray-300'
                    }`}>
                      <div className="text-2xl">🎤</div>
                      <div>
                        <p className="text-sm font-medium">Voice message</p>
                        <p className={`text-xs ${isOwn ? 'text-gray-600' : 'text-gray-400'}`}>
                          {metadata?.duration ? `${metadata.duration}s` : ''}
                        </p>
                      </div>
                    </div>
                    {audioUrl && audioUrl !== 'undefined' && !audioUrl.includes('[') && (
                      <audio controls className="max-w-xs">
                        <source src={audioUrl} type="audio/webm" />
                        Your browser does not support the audio element.
                      </audio>
                    )}
                  </div>
                );
              } else {
                // Default text message with chat bubble
                const textContent = message.text || (message as any).decryptedContent || (message as any).content || '[Encrypted message]';
                
                if (isEditing && isOwn) {
                  return (
                    <div className="inline-block">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              if (editText.trim()) {
                                onEdit?.(message.id, editText.trim());
                                setIsEditing(false);
                              }
                            }
                            if (e.key === 'Escape') {
                              setIsEditing(false);
                              setEditText(textContent);
                            }
                          }}
                          className="px-4 py-2 rounded-2xl text-sm bg-[#262626] text-gray-300 border border-gray-600 focus:outline-none focus:border-gray-500"
                          placeholder="Edit message..."
                          autoFocus
                        />
                        <button
                          onClick={() => {
                            if (editText.trim()) {
                              onEdit?.(message.id, editText.trim());
                              setIsEditing(false);
                            }
                          }}
                          className="p-1.5 bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
                        >
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </button>
                        <button
                          onClick={() => {
                            setIsEditing(false);
                            setEditText(textContent);
                          }}
                          className="p-1.5 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                        >
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Press Enter to save, Esc to cancel</p>
                    </div>
                  );
                }
                
                return (
                  <div className={`inline-block px-4 py-2 rounded-2xl text-sm ${
                    isOwn 
                      ? 'bg-white text-black' 
                      : 'bg-[#262626] text-gray-300'
                  }`}>
                    <div className="flex items-end gap-2">
                      <span className="whitespace-pre-wrap break-words">
                        {textContent}
                      </span>
                      <span className={`text-[10px] whitespace-nowrap ${
                        isOwn ? 'text-gray-600' : 'text-gray-500'
                      }`}>
                        {formatTime(message.timestamp)}
                      </span>
                      {isOwn && (() => {
                        const status = message.id.startsWith('temp-') ? 'sending' :
                          message.status || (
                            message.read && message.read.length > 0 ? 'read' :
                            message.delivered && message.delivered.length > 0 ? 'delivered' :
                            'sent'
                          );
                        
                        // Debug logging
                        if (message.id && !message.id.startsWith('temp-')) {
                          console.log(`📬 Message ${message.id} status:`, {
                            status,
                            read: message.read,
                            delivered: message.delivered,
                            hasRead: message.read && message.read.length > 0,
                            hasDelivered: message.delivered && message.delivered.length > 0
                          });
                        }
                        
                        return (
                          <MessageStatus 
                            status={status}
                            className="inline-flex"
                          />
                        );
                      })()}
                    </div>
                  </div>
                );
              }
            })()}
          </div>
          
          {/* Reactions */}
          {message.reactions && (() => {
            console.log(`🎨 Rendering reactions for message ${message.id}:`, message.reactions);
            const validReactions = Object.entries(message.reactions)
              .filter(([key, users]) => {
                // Filter out non-emoji keys (like delete, clear, add, set)
                // Only show actual emoji reactions that have users
                const invalidKeys = ['delete', 'clear', 'add', 'set', 'remove'];
                const userArray = Array.isArray(users) ? users : [];
                const isValid = !invalidKeys.includes(key) && userArray.length > 0;
                if (!isValid && userArray.length === 0) {
                  console.log(`🚫 Filtering out reaction ${key} with no users`);
                }
                return isValid;
              });
            
            return validReactions.length > 0 ? (
              <div className="flex flex-wrap gap-1 mt-2">
                {validReactions.map(([emoji, users]) => {
                  // Ensure users is an array
                  const userArray = Array.isArray(users) ? users : [];
                  return (
                    <button
                      key={emoji}
                      onClick={() => onReact?.(message.id, emoji)}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-colors ${
                        userArray.includes(currentUserId)
                          ? 'bg-blue-500/20'
                          : 'bg-[#1a1a1a] hover:bg-[#262626]'
                      }`}
                    >
                      <span>{emoji}</span>
                      <span className="text-gray-400">{userArray.length}</span>
                    </button>
                  );
                })}
              </div>
            ) : null;
          })()}
          
          {/* Edited indicator only */}
          {message.edited && (
            <div className={`text-xs mt-0.5 ${isOwn ? 'text-right' : 'text-left'}`}>
              <span className="text-gray-500 italic">(edited)</span>
            </div>
          )}
        </div>
        
        {/* Combined Action Buttons - positioned next to message */}
        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              {/* Message Actions Menu */}
              <div className="relative">
                <button
                  onClick={() => setShowActions(!showActions)}
                  className="p-0.5 hover:bg-[#262626] rounded transition-colors"
                >
                  <MoreVertical className="w-3 h-3 text-gray-400" />
                </button>
            
            {showActions && (
            <div className="absolute z-10 mt-1 bg-[#1a1a1a] border border-[#262626] rounded-lg shadow-lg py-1 min-w-[150px] right-0">
              <button
                onClick={() => {
                  onReply?.(message);
                  setShowActions(false);
                }}
                className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-[#262626] flex items-center gap-2"
              >
                <Reply className="w-3 h-3" />
                Reply
              </button>
              
              {isOwn && (
                <button
                  onClick={() => {
                    setIsEditing(true);
                    setShowActions(false);
                  }}
                  className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-[#262626] flex items-center gap-2"
                >
                  <Edit2 className="w-3 h-3" />
                  Edit
                </button>
              )}
              
              <button
                onClick={() => {
                  navigator.clipboard.writeText(message.text || '');
                  setShowActions(false);
                }}
                className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-[#262626] flex items-center gap-2"
              >
                <Copy className="w-3 h-3" />
                Copy
              </button>
              
              {isOwn && (
                <button
                  onClick={() => {
                    onDelete?.(message.id);
                    setShowActions(false);
                  }}
                  className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-[#262626] flex items-center gap-2"
                >
                  <Trash2 className="w-3 h-3" />
                  Delete
                </button>
              )}
            </div>
          )}
          </div>
          
              {/* Quick Reactions */}
              <div className="relative">
                <button
                  onClick={() => setShowReactions(!showReactions)}
                  className="p-0.5 hover:bg-[#262626] rounded transition-colors"
                >
                  <Smile className="w-3 h-3 text-gray-400" />
                </button>
            
            {showReactions && (
              <div className="absolute z-10 mt-1 bg-[#1a1a1a] border border-[#262626] rounded-lg shadow-lg p-2 flex gap-1 right-0">
                {quickReactions.map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => {
                      onReact?.(message.id, emoji);
                      setShowReactions(false);
                    }}
                    className="p-1 hover:bg-[#262626] rounded transition-colors text-lg"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
              </div>
        </div>
      </div>
    </div>
  );
};