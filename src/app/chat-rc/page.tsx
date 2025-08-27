"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { rocketChatClient } from "@/services/rocket-chat-client";
import { FullPageLoader, LoadingDots } from "@/components/ui/loader";
import { Paperclip, Send } from "lucide-react";

/**
 * Rocket.Chat Full Page (scaffold UI)
 * - Sidebar: channels (general + tier channel if applicable)
 * - Messages: scrollable list
 * - Composer: sticky input with attach + send
 * Notes:
 * - Uses scaffold client that no-ops until SDK/OAuth are wired.
 */
export default function RocketChatPage() {
  const { user, platformUser, loading } = useAuth();
  const [initializing, setInitializing] = useState(true);
  const [channels, setChannels] = useState<{ id: string; name: string }[]>([]);
  const [activeRoom, setActiveRoom] = useState<string>("general");
  const [messages, setMessages] = useState<{ id: string; text: string; ts: number; sender?: string }[]>([]);
  const [text, setText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const configured = rocketChatClient.isConfigured();
  const tier = platformUser?.tier?.current;

  useEffect(() => {
    const run = async () => {
      if (loading) return;
      if (!user) {
        setInitializing(false);
        return;
      }
      await rocketChatClient.initialize();
      const base = await rocketChatClient.listChannels();
      const tierRooms = await rocketChatClient.listTierChannels(tier);
      const all = [...base, ...tierRooms];
      setChannels(all);
      setActiveRoom(all[0]?.id || "general");
      setInitializing(false);
    };
    run();
  }, [loading, user, tier]);

  useEffect(() => {
    const load = async () => {
      if (!activeRoom) return;
      const msgs = await rocketChatClient.fetchMessages(activeRoom);
      setMessages(msgs);
    };
    load();
  }, [activeRoom]);

  const handleSend = async () => {
    const content = text.trim();
    if (!content) return;
    await rocketChatClient.sendMessage(activeRoom, content);
    setMessages(prev => [...prev, { id: `${Date.now()}`, text: content, ts: Date.now(), sender: platformUser?.username }]);
    setText("");
  };

  if (loading) return <FullPageLoader label="Loading chat" />;

  return (
    <div className="bg-black h-[calc(100vh-64px)] flex overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 hidden md:flex flex-col border-r border-gray-800 bg-gray-950">
        <div className="px-4 py-3 border-b border-gray-800">
          <h2 className="text-white font-medium">Channels</h2>
        </div>
        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
          {initializing ? (
            <LoadingDots label="Loading channels" />
          ) : channels.length === 0 ? (
            <p className="text-xs text-gray-500 px-2">No channels available</p>
          ) : (
            channels.map((c) => (
              <button
                key={c.id}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  activeRoom === c.id ? "bg-white text-black" : "text-gray-300 hover:bg-gray-900"
                }`}
                onClick={() => setActiveRoom(c.id)}
              >
                {c.name}
              </button>
            ))
          )}
        </div>
      </aside>

      {/* Main chat area */}
      <section className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-800 bg-gray-950">
          <h1 className="text-white text-base font-medium">
            {channels.find(c => c.id === activeRoom)?.name || "Chat"}
          </h1>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {initializing ? (
            <LoadingDots label="Connecting" />
          ) : messages.length === 0 ? (
            <div className="text-center text-gray-500 py-8">No messages yet</div>
          ) : (
            messages.map((m) => (
              <div key={m.id} className={`flex ${m.sender ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[70%] ${m.sender ? "bg-blue-600 text-white" : "bg-gray-900 text-gray-100"} rounded-2xl px-4 py-2`}>
                  <p className="text-sm whitespace-pre-wrap">{m.text}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Composer */}
        <div className="px-4 py-3 border-t border-gray-800 bg-gray-950">
          {!configured && (
            <div className="mb-2 text-xs text-yellow-400">
              Rocket.Chat is not configured. Set NEXT_PUBLIC_ROCKETCHAT_HOST to enable.
            </div>
          )}
          <div className="relative bg-black/30 border border-gray-700 rounded-2xl px-3 py-3">
            <input type="file" ref={fileInputRef} className="hidden" aria-label="Attach file" />
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Message"
              rows={2}
              className="w-full bg-transparent text-white placeholder-gray-400 resize-none focus:outline-none pr-20"
              aria-label="Chat input"
            />
            <div className="absolute right-2 bottom-2 flex items-center gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800"
                aria-label="Attach file"
              >
                <Paperclip className="h-4 w-4" />
              </button>
              <button
                onClick={handleSend}
                disabled={!text.trim()}
                className={`p-2 rounded-lg ${text.trim() ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-gray-700 text-gray-500"}`}
                aria-label="Send message"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}


