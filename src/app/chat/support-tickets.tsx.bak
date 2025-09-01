"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import {
  SupportTicket,
  SupportMessage,
  createTicket,
  listUserTickets,
  sendSupportMessage,
  subscribeTicketMessages,
} from "@/services/support/support.service";
import { MessageInput } from "@/components/chat/MessageInput";

export default function SupportPage() {
  const { user, platformUser } = useAuth();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [active, setActive] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [creating, setCreating] = useState(false);
  const [subject, setSubject] = useState("");

  useEffect(() => {
    if (!user) return;
    (async () => {
      const list = await listUserTickets(user.uid);
      setTickets(list);
      if (list.length > 0) setActive(list[0]);
    })();
  }, [user]);

  useEffect(() => {
    if (!active) return;
    const unsub = subscribeTicketMessages(active.id, setMessages);
    return () => unsub();
  }, [active]);

  const handleCreate = async () => {
    if (!user || !subject.trim() || creating) return;
    try {
      setCreating(true);
      const t = await createTicket(user.uid, subject.trim(), user.email || undefined);
      setTickets((prev) => [t, ...prev]);
      setActive(t);
      setSubject("");
    } finally {
      setCreating(false);
    }
  };

  const handleSend = async (text: string) => {
    if (!user || !active) return;
    await sendSupportMessage(active.id, user.uid, text);
  };

  if (!user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-gray-400">
        Please sign in to contact Support.
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-64px)] bg-black flex">
      {/* Sidebar: tickets */}
      <aside className="w-72 border-r border-gray-900 bg-gray-950 p-3">
        <h2 className="text-sm font-semibold text-white mb-3">Support Tickets</h2>
        <div className="mb-3 space-y-2">
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-gray-700"
            placeholder="Briefly describe your issue"
          />
          <button
            onClick={handleCreate}
            disabled={!subject.trim() || creating}
            className="w-full rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-3 py-2 text-sm text-white"
          >
            New Ticket
          </button>
        </div>
        <div className="space-y-1">
          {tickets.map((t) => (
            <button
              key={t.id}
              onClick={() => setActive(t)}
              className={`w-full text-left px-3 py-2 rounded-lg border ${
                active?.id === t.id ? "border-gray-700 bg-gray-900" : "border-gray-900 hover:border-gray-800"
              } text-gray-200`}
            >
              <div className="text-sm font-medium truncate">{t.subject}</div>
              <div className="text-xs text-gray-400 capitalize">{t.status}</div>
            </button>
          ))}
          {tickets.length === 0 && (
            <div className="text-xs text-gray-500">No tickets yet.</div>
          )}
        </div>
      </aside>

      {/* Main: ticket chat */}
      <main className="flex-1 flex flex-col">
        <div className="border-b border-gray-900 bg-gray-950 p-3">
          <h1 className="text-white text-sm font-semibold">
            {active ? active.subject : "Create a ticket to start"}
          </h1>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.senderId === user.uid ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${m.senderId === user.uid ? "bg-blue-600 text-white rounded-br-sm" : "bg-gray-800 text-gray-100 rounded-bl-sm"}`}>
                <p>{m.text}</p>
              </div>
            </div>
          ))}
          {active && messages.length === 0 && (
            <div className="text-xs text-gray-500">No messages yet.</div>
          )}
        </div>
        {active && <MessageInput onSend={handleSend} />}
      </main>
    </div>
  );
}


