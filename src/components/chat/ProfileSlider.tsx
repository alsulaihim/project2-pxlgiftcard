"use client";

import React, { useState, useEffect } from 'react';
import { X, Mail, Calendar, Image as ImageIcon, File, Video, Music, Link, MapPin } from 'lucide-react';
import { format } from 'date-fns';

interface SharedMedia {
  images: Array<{ id: string; url: string; timestamp: Date }>;
  videos: Array<{ id: string; url: string; thumbnail?: string; timestamp: Date }>;
  files: Array<{ id: string; name: string; size: number; timestamp: Date }>;
  links: Array<{ id: string; url: string; title?: string; timestamp: Date }>;
}

interface ProfileSliderProps {
  isOpen: boolean;
  onClose: () => void;
  user: {
    uid: string;
    displayName?: string;
    email?: string;
    photoURL?: string;
    tier?: 'starter' | 'rising' | 'pro' | 'pixlbeast' | 'pixlionaire';
    createdAt?: Date;
    lastSeen?: Date;
    country?: string;
    region?: string;
  };
  isOnline?: boolean;
  conversationId?: string;
  messages?: any[];
}

export function ProfileSlider({ 
  isOpen, 
  onClose, 
  user, 
  isOnline = false,
  conversationId,
  messages = []
}: ProfileSliderProps) {
  const [activeTab, setActiveTab] = useState<'media' | 'files' | 'links'>('media');
  const [sharedMedia, setSharedMedia] = useState<SharedMedia>({
    images: [],
    videos: [],
    files: [],
    links: []
  });

  // Extract shared media from messages
  useEffect(() => {
    if (!messages || messages.length === 0) return;

    const media: SharedMedia = {
      images: [],
      videos: [],
      files: [],
      links: []
    };

    messages.forEach(msg => {
      if (msg.type === 'image' && msg.metadata?.downloadUrl) {
        media.images.push({
          id: msg.id,
          url: msg.metadata.downloadUrl,
          timestamp: msg.timestamp
        });
      } else if (msg.type === 'video' && msg.metadata?.downloadUrl) {
        media.videos.push({
          id: msg.id,
          url: msg.metadata.downloadUrl,
          thumbnail: msg.metadata.thumbnailUrl,
          timestamp: msg.timestamp
        });
      } else if (msg.type === 'file' && msg.metadata?.downloadUrl) {
        media.files.push({
          id: msg.id,
          name: msg.metadata.fileName || 'Unknown file',
          size: msg.metadata.fileSize || 0,
          timestamp: msg.timestamp
        });
      } else if (msg.type === 'text' && msg.text) {
        // Extract URLs from text messages
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const urls = msg.text.match(urlRegex);
        if (urls) {
          urls.forEach((url: string) => {
            media.links.push({
              id: `${msg.id}_${url}`,
              url,
              title: new URL(url).hostname,
              timestamp: msg.timestamp
            });
          });
        }
      }
    });

    // Sort by timestamp (newest first)
    media.images.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    media.videos.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    media.files.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    media.links.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    setSharedMedia(media);
  }, [messages]);

  const getTierColor = (tier?: string) => {
    switch(tier) {
      case 'pixlionaire': return 'text-purple-400 bg-purple-900/20';
      case 'pixlbeast': return 'text-amber-400 bg-amber-900/20';
      case 'pro': return 'text-green-400 bg-green-900/20';
      case 'rising': return 'text-blue-400 bg-blue-900/20';
      default: return 'text-gray-400 bg-gray-900/20';
    }
  };


  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <>
      {/* Overlay */}
      <div 
        className={`fixed inset-0 bg-black/50 transition-opacity z-40 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Slider */}
      <div className={`fixed right-0 top-0 h-full w-96 bg-[#0a0a0a] border-l border-[#262626] transform transition-transform duration-300 z-50 flex flex-col ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}>
        {/* Header */}
        <div className="p-6 border-b border-[#262626]">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-white">Profile Info</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-[#1a1a1a] rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Profile Section */}
          <div className="flex flex-col items-center">
            <div className="relative mb-4">
              <img
                src={user.photoURL || '/default-avatar.png'}
                alt={user.displayName || 'User'}
                className="w-32 h-32 rounded-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/default-avatar.png';
                }}
              />
              {isOnline && (
                <span className="absolute bottom-2 right-2 w-6 h-6 bg-green-500 rounded-full border-4 border-[#0a0a0a]" />
              )}
            </div>

            <h3 className="text-2xl font-semibold text-white mb-1">
              {user.displayName || 'Unknown User'}
            </h3>

            {user.tier && (
              <span className={`text-sm px-3 py-1 rounded-full ${getTierColor(user.tier)} mb-3`}>
                {user.tier.charAt(0).toUpperCase() + user.tier.slice(1)} Tier
              </span>
            )}

            <div className="flex flex-col items-center gap-2 text-sm text-gray-400">
              {user.email && (
                <div className="flex items-center gap-1">
                  <Mail className="w-4 h-4" />
                  <span>{user.email}</span>
                </div>
              )}
              
              {(user.country || user.region) && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  <span>
                    {[user.region, user.country].filter(Boolean).join(', ')}
                  </span>
                </div>
              )}
            </div>

            {user.createdAt && (
              <div className="flex items-center gap-1 text-sm text-gray-400 mt-2">
                <Calendar className="w-4 h-4" />
                <span>Joined {(() => {
                  try {
                    const date = user.createdAt instanceof Date ? user.createdAt : new Date(user.createdAt);
                    return isNaN(date.getTime()) ? 'Unknown' : format(date, 'MMM yyyy');
                  } catch {
                    return 'Unknown';
                  }
                })()}</span>
              </div>
            )}

            <div className="text-sm text-gray-500 mt-2">
              {isOnline ? (
                <span className="text-green-400">● Currently online</span>
              ) : user.lastSeen ? (
                <span>Last seen {format(new Date(user.lastSeen), 'MMM d, h:mm a')}</span>
              ) : (
                <span>Offline</span>
              )}
            </div>
          </div>
        </div>

        {/* Shared Media Section */}
        <div className="flex-1 flex flex-col">
          {/* Tabs */}
          <div className="flex border-b border-[#262626]">
            <button
              onClick={() => setActiveTab('media')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'media' 
                  ? 'text-white border-b-2 border-white' 
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              Media ({sharedMedia.images.length + sharedMedia.videos.length})
            </button>
            <button
              onClick={() => setActiveTab('files')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'files' 
                  ? 'text-white border-b-2 border-white' 
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              Files ({sharedMedia.files.length})
            </button>
            <button
              onClick={() => setActiveTab('links')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'links' 
                  ? 'text-white border-b-2 border-white' 
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              Links ({sharedMedia.links.length})
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {activeTab === 'media' && (
              <div className="grid grid-cols-3 gap-2">
                {sharedMedia.images.map((image) => (
                  <div key={image.id} className="relative aspect-square group cursor-pointer">
                    <img
                      src={image.url}
                      alt="Shared media"
                      className="w-full h-full object-cover rounded-lg"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                      <ImageIcon className="w-6 h-6 text-white" />
                    </div>
                  </div>
                ))}
                {sharedMedia.videos.map((video) => (
                  <div key={video.id} className="relative aspect-square group cursor-pointer">
                    {video.thumbnail ? (
                      <img
                        src={video.thumbnail}
                        alt="Video thumbnail"
                        className="w-full h-full object-cover rounded-lg"
                      />
                    ) : (
                      <div className="w-full h-full bg-[#1a1a1a] rounded-lg flex items-center justify-center">
                        <Video className="w-8 h-8 text-gray-500" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                      <Video className="w-6 h-6 text-white" />
                    </div>
                  </div>
                ))}
                {sharedMedia.images.length === 0 && sharedMedia.videos.length === 0 && (
                  <div className="col-span-3 text-center py-8 text-gray-500">
                    No media shared yet
                  </div>
                )}
              </div>
            )}

            {activeTab === 'files' && (
              <div className="space-y-2">
                {sharedMedia.files.map((file) => (
                  <div key={file.id} className="flex items-center gap-3 p-3 bg-[#1a1a1a] rounded-lg hover:bg-[#262626] transition-colors cursor-pointer">
                    <File className="w-5 h-5 text-gray-400" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{file.name}</p>
                      <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                    </div>
                  </div>
                ))}
                {sharedMedia.files.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No files shared yet
                  </div>
                )}
              </div>
            )}

            {activeTab === 'links' && (
              <div className="space-y-2">
                {sharedMedia.links.map((link) => (
                  <a
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 bg-[#1a1a1a] rounded-lg hover:bg-[#262626] transition-colors"
                  >
                    <Link className="w-5 h-5 text-gray-400" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{link.title}</p>
                      <p className="text-xs text-gray-500 truncate">{link.url}</p>
                    </div>
                  </a>
                ))}
                {sharedMedia.links.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No links shared yet
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}