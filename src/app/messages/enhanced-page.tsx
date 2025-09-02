"use client";

import React, { useEffect, useState } from "react";
import { Plus, Search, Users, Mic, Settings, Bell } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useChatStore } from "@/stores/chatStore";
import { ConversationList } from "@/components/chat/ConversationList";
import { MessageInput } from "@/components/chat/MessageInput";
import { MessageSearch } from "@/components/chat/MessageSearch";
import { VoiceRecorder } from "@/components/chat/VoiceRecorder";
import { VirtualMessageList } from "@/components/chat/VirtualMessageList";
import { keyExchangeService } from "@/services/chat/key-exchange.service";
import { presenceService } from "@/services/chat/presence.service";
import { socketService } from "@/services/chat/socket.service";
import { offlineQueue } from "@/services/chat/offline-queue.service";

export default function EnhancedMessagesPage() {
  const { user } = useAuth();
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'fallback'>('connecting');
  
  const {
    conversations,
    messages,
    activeConversationId,
    typing,
    presence,
    loadConversations,
    loadMessages,
    setActiveConversation,
    sendMessage,
    initializeSocket,
    initializeEncryption,
    updateTyping,
    markAsRead,
    reset
  } = useChatStore();

  // Initialize chat system
  useEffect(() => {
    if (!user) return;

    const initializeChat = async () => {
      try {
        // Initialize encryption
        await initializeEncryption(user.uid);
        
        // Initialize key exchange
        await keyExchangeService.initializeUserKeys(user.uid);
        
        // Initialize presence
        presenceService.initializePresence(user.uid);
        
        // Initialize socket connection
        const socket = await socketService.initialize(user.uid);
        if (socket) {
          initializeSocket(socket);
          
          // Set connection status
          socket.on('connect', () => {
          setConnectionStatus('connected');
          console.log('✅ Real-time connection established');
        });
        
          socket.on('disconnect', () => {
            setConnectionStatus('fallback');
            console.log('⚠️ Falling back to Firestore');
          });
        }
        
        // Load conversations
        await loadConversations();
        
        // Monitor offline queue
        const queueStatus = offlineQueue.getStatus();
        if (queueStatus.queueSize > 0) {
          console.log(`📦 ${queueStatus.queueSize} messages in offline queue`);
        }
        
      } catch (error) {
        console.error('Failed to initialize chat:', error);
        setConnectionStatus('fallback');
      }
    };

    initializeChat();

    return () => {
      presenceService.cleanup();
      socketService.disconnect();
      reset();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Load messages for active conversation
  useEffect(() => {
    if (activeConversationId) {
      loadMessages(activeConversationId);
      
      // Mark messages as read
      const conversationMessages = messages.get(activeConversationId) || [];
      const unreadIds = conversationMessages
        .filter(m => m.senderId !== user?.uid && !m.read?.includes(user?.uid || ''))
        .map(m => m.id);
      
      if (unreadIds.length > 0) {
        markAsRead(unreadIds, user?.uid || '');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConversationId]);

  const activeConversation = activeConversationId ? conversations.get(activeConversationId) : null;
  const rawMessages = activeConversationId ? messages.get(activeConversationId) || [] : [];
  // Map Message type to ChatMessage type for VirtualMessageList
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const activeMessages = rawMessages.map((msg: any) => ({
    ...msg,
    text: msg.decryptedContent || msg.content || msg.text || '',
    readBy: msg.read || msg.readBy || [],
    deliveredTo: msg.delivered || msg.deliveredTo || []
  }));
  const typingUsers = activeConversationId ? typing.get(activeConversationId) || [] : [];

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || !activeConversationId) return;
    await sendMessage(text, 'text');
  };

  const handleVoiceSend = async (audioBlob: Blob, duration: number) => {
    if (!activeConversationId) return;
    
    // Convert blob to base64
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Audio = reader.result as string;
      await sendMessage(base64Audio, 'voice', {
        duration,
        mimeType: 'audio/webm'
      });
    };
    reader.readAsDataURL(audioBlob);
    
    setShowVoiceRecorder(false);
  };

  const handleTyping = (isTyping: boolean) => {
    if (activeConversationId) {
      updateTyping(activeConversationId, isTyping);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-white">Please sign in to access messages</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-900">
      {/* Conversations Sidebar */}
      <div className="w-80 bg-gray-800 border-r border-gray-700 flex flex-col">
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">Messages</h2>
            <div className="flex items-center gap-2">
              <MessageSearch />
              <button type="button" aria-label="Notifications" className="p-2 hover:bg-gray-700 rounded-lg transition-colors">
                <Bell className="w-5 h-5 text-gray-400" />
              </button>
              <button type="button" aria-label="Add new" className="p-2 hover:bg-gray-700 rounded-lg transition-colors">
                <Plus className="w-5 h-5 text-gray-400" />
              </button>
            </div>
          </div>
          
          {/* Connection Status */}
          <div className={`text-xs px-2 py-1 rounded-full text-center ${
            connectionStatus === 'connected' ? 'bg-green-900 text-green-300' :
            connectionStatus === 'fallback' ? 'bg-yellow-900 text-yellow-300' :
            'bg-gray-900 text-gray-400'
          }`}>
            {connectionStatus === 'connected' ? '🟢 Real-time' :
             connectionStatus === 'fallback' ? '🟡 Firestore Mode' :
             '⏳ Connecting...'}
          </div>
          
          {/* Offline Queue Status */}
          {offlineQueue.getQueueSize() > 0 && (
            <div className="mt-2 text-xs px-2 py-1 bg-orange-900 text-orange-300 rounded-full text-center">
              📦 {offlineQueue.getQueueSize()} messages queued
            </div>
          )}
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto">
          <ConversationList
            conversations={Array.from(conversations.values())}
            activeId={activeConversationId || ''}
            onSelect={(c) => setActiveConversation(c.id)}
            currentUserId={user.uid}
          />
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {activeConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-700 bg-gray-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/default-avatar.png"
                      alt="User"
                      className="w-10 h-10 rounded-full"
                    />
                    {presence.get(activeConversation.members.find(id => id !== user.uid) || '') && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-800"></div>
                    )}
                  </div>
                  <div>
                    <h3 className="text-white font-semibold">
                      {activeConversation.groupInfo?.name || 'Direct Message'}
                    </h3>
                    {typingUsers.length > 0 && (
                      <p className="text-xs text-gray-400">
                        {typingUsers.length === 1 ? 'typing...' : `${typingUsers.length} people typing...`}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button type="button" aria-label="Search messages" className="p-2 hover:bg-gray-700 rounded-lg transition-colors">
                    <Search className="w-5 h-5 text-gray-400" />
                  </button>
                  <button type="button" aria-label="Settings" className="p-2 hover:bg-gray-700 rounded-lg transition-colors">
                    <Settings className="w-5 h-5 text-gray-400" />
                  </button>
                </div>
              </div>
            </div>

            {/* Messages Area with Virtual Scrolling */}
            <div className="flex-1 overflow-hidden bg-gray-900">
              <VirtualMessageList
                messages={activeMessages}
                currentUserId={user.uid}
                height={window.innerHeight - 200}
                onLoadMore={() => {
                  // Load more messages
                  const oldest = activeMessages[0];
                  if (oldest && activeConversationId) {
                    loadMessages(activeConversationId, {
                      limit: 50,
                      before: oldest.id
                    });
                  }
                }}
              />
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-gray-700 bg-gray-800">
              {showVoiceRecorder ? (
                <VoiceRecorder
                  onSend={handleVoiceSend}
                  onCancel={() => setShowVoiceRecorder(false)}
                />
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    aria-label="Voice recording"
                    onClick={() => setShowVoiceRecorder(true)}
                    className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <Mic className="w-5 h-5 text-gray-400" />
                  </button>
                  <MessageInput
                    onSend={handleSendMessage}
                    onTyping={handleTyping}
                    placeholder="Type a message..."
                    conversationId={activeConversationId || undefined}
                  />
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl text-gray-400 mb-2">Select a conversation</h3>
              <p className="text-gray-500">Choose a conversation from the list to start messaging</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}