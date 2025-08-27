"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { X, Send, Minimize2, Maximize2, Paperclip, SmilePlus } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { db } from "@/lib/firebase-config";
import { collection, addDoc, query, orderBy, onSnapshot, Timestamp, where, getDocs, updateDoc, doc } from "firebase/firestore";
import { formatDistanceToNow } from "date-fns";
import { generateAIResponse, shouldCreateTicket, extractTicketInfo } from "@/lib/openai-service";

interface Message {
  id: string;
  content: string;
  sender: "user" | "agent";
  timestamp: Timestamp;
  attachments?: string[];
}

interface ChatSession {
  id: string;
  userId?: string;
  userEmail?: string;
  userName?: string;
  userTier?: string;
  status: "active" | "closed";
  createdAt: Timestamp;
  lastMessageAt: Timestamp;
}

const tierGreetings = {
  starter: "Welcome! 👋 How can I assist you today with your giftcard needs?",
  rising: "Hello Rising member! 🌟 Great to see you. How can I help enhance your experience today?",
  pro: "Welcome back, Pro member! 💎 I'm here to provide you with premium support. What can I do for you?",
  pixlbeast: "Greetings, Pixlbeast! 🦁 Your dedication is inspiring. How may I provide VIP assistance today?",
  pixlionaire: "Welcome, esteemed Pixlionaire! 👑 It's an honor to assist you. How may I serve you today?",
  guest: "Hello! 👋 Welcome to PXL Giftcard Platform. I'm here to help. How can I assist you today?"
};

export default function ChatWidget() {
  const { user, platformUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [session, setSession] = useState<ChatSession | null>(null);
  const [guestInfo, setGuestInfo] = useState({ name: "", email: "" });
  const [showGuestForm, setShowGuestForm] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize chat session
  const initializeSession = async () => {
    try {
      const sessionData: Partial<ChatSession> = {
        status: "active",
        createdAt: Timestamp.now(),
        lastMessageAt: Timestamp.now(),
      };

      if (user && platformUser) {
        sessionData.userId = user.uid;
        sessionData.userEmail = platformUser.email;
        sessionData.userName = platformUser.username;
        sessionData.userTier = platformUser.tier.current;
      } else if (guestInfo.email) {
        sessionData.userEmail = guestInfo.email;
        sessionData.userName = guestInfo.name;
        sessionData.userTier = "guest";
      }

      const docRef = await addDoc(collection(db, "chat-sessions"), sessionData);
      const newSession = { id: docRef.id, ...sessionData } as ChatSession;
      setSession(newSession);

      // Send initial greeting
      const greeting = tierGreetings[sessionData.userTier || "guest"];
      const greetingMessage: Partial<Message> = {
        content: greeting,
        sender: "agent",
        timestamp: Timestamp.now(),
      };

      await addDoc(collection(db, "chat-sessions", docRef.id, "messages"), greetingMessage);
    } catch (error) {
      console.error("Error initializing chat session:", error);
    }
  };

  // Load messages for session
  useEffect(() => {
    if (!session) return;

    const q = query(
      collection(db, "chat-sessions", session.id, "messages"),
      orderBy("timestamp", "asc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newMessages: Message[] = [];
      snapshot.forEach((doc) => {
        newMessages.push({ id: doc.id, ...doc.data() } as Message);
      });
      setMessages(newMessages);
    });

    return () => unsubscribe();
  }, [session]);

  // Handle opening chat
  const handleOpenChat = () => {
    setIsOpen(true);
    if (!user && !guestInfo.email) {
      setShowGuestForm(true);
    } else if (!session) {
      initializeSession();
    }
  };

  // Handle guest form submission
  const handleGuestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (guestInfo.name && guestInfo.email) {
      setShowGuestForm(false);
      initializeSession();
    }
  };

  // Send message to OpenAI and get response
  const getAIResponse = async (userMessage: string): Promise<string> => {
    const context = {
      userTier: platformUser?.tier?.current || (user ? "starter" : undefined),
      userName: platformUser?.username || guestInfo.name,
      userEmail: platformUser?.email || guestInfo.email,
      isAuthenticated: !!user
    };
    
    // Check if we should create a support ticket
    if (shouldCreateTicket(userMessage)) {
      await createSupportTicket(userMessage);
      return "I've created a support ticket for you. A human agent will review your request and get back to you soon. Your ticket has been logged in our system. Is there anything else I can help you with in the meantime?";
    }
    
    // Generate AI response based on context
    return await generateAIResponse(userMessage, context);
  };

  // Create support ticket
  const createSupportTicket = async (issue: string) => {
    try {
      const { summary, priority } = extractTicketInfo([...messages, { content: issue, sender: "user" }]);
      
      const ticketData = {
        sessionId: session?.id,
        userId: user?.uid || null,
        userEmail: platformUser?.email || guestInfo.email,
        userName: platformUser?.username || guestInfo.name,
        userTier: platformUser?.tier?.current || "guest",
        issue: summary,
        status: "open",
        priority: priority,
        createdAt: Timestamp.now(),
        messages: messages.map(m => ({
          content: m.content,
          sender: m.sender,
          timestamp: m.timestamp
        }))
      };

      await addDoc(collection(db, "support-tickets"), ticketData);
    } catch (error) {
      console.error("Error creating support ticket:", error);
    }
  };

  // Send message
  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !session) return;

    const userMessage = inputMessage.trim();
    setInputMessage("");
    setIsTyping(true);

    // Add user message
    try {
      await addDoc(collection(db, "chat-sessions", session.id, "messages"), {
        content: userMessage,
        sender: "user",
        timestamp: Timestamp.now(),
      });

      // Get AI response
      const aiResponse = await getAIResponse(userMessage);

      // Add AI response
      await addDoc(collection(db, "chat-sessions", session.id, "messages"), {
        content: aiResponse,
        sender: "agent",
        timestamp: Timestamp.now(),
      });

      // Update session last message time
      await updateDoc(doc(db, "chat-sessions", session.id), {
        lastMessageAt: Timestamp.now(),
      });
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setIsTyping(false);
    }
  };

  // Close chat
  const handleCloseChat = async () => {
    if (session) {
      try {
        await updateDoc(doc(db, "chat-sessions", session.id), {
          status: "closed",
        });
      } catch (error) {
        console.error("Error closing session:", error);
      }
    }
    setIsOpen(false);
    setSession(null);
    setMessages([]);
    setGuestInfo({ name: "", email: "" });
  };

  return (
    <>
      {/* Chat Button */}
      {!isOpen && (
        <button
          onClick={handleOpenChat}
          className="fixed bottom-6 right-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full p-4 shadow-lg hover:scale-105 transition-transform z-50"
          aria-label="Open chat support"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M12 2C6.48 2 2 6.48 2 12C2 13.19 2.23 14.32 2.64 15.36L2 22L8.64 21.36C9.68 21.77 10.81 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM17 14H15V16H9V14H7V8H9V6H15V8H17V14Z"
              fill="currentColor"
            />
          </svg>
        </button>
      )}

      {/* Chat Widget */}
      {isOpen && (
        <div
          ref={chatContainerRef}
          className={`fixed ${
            isMinimized ? "bottom-6 right-6 w-80 h-14" : "bottom-6 right-6 w-96 h-[600px]"
          } bg-gray-900 rounded-2xl shadow-2xl border border-gray-800 flex flex-col transition-all duration-300 z-50`}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 rounded-t-2xl flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <SmilePlus className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-white font-semibold">PXL Support</h3>
                <p className="text-white/80 text-xs">Always here to help</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="text-white/80 hover:text-white transition-colors"
                aria-label={isMinimized ? "Maximize chat" : "Minimize chat"}
              >
                {isMinimized ? <Maximize2 className="h-5 w-5" /> : <Minimize2 className="h-5 w-5" />}
              </button>
              <button
                onClick={handleCloseChat}
                className="text-white/80 hover:text-white transition-colors"
                aria-label="Close chat"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Guest Form */}
              {showGuestForm ? (
                <div className="flex-1 p-6 flex items-center justify-center">
                  <form onSubmit={handleGuestSubmit} className="w-full space-y-4">
                    <h4 className="text-lg font-semibold text-white mb-4">Let's get started!</h4>
                    <input
                      type="text"
                      placeholder="Your name"
                      value={guestInfo.name}
                      onChange={(e) => setGuestInfo({ ...guestInfo, name: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                      required
                    />
                    <input
                      type="email"
                      placeholder="Your email"
                      value={guestInfo.email}
                      onChange={(e) => setGuestInfo({ ...guestInfo, email: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                      required
                    />
                    <button
                      type="submit"
                      className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
                    >
                      Start Chat
                    </button>
                  </form>
                </div>
              ) : (
                <>
                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[80%] p-3 rounded-2xl ${
                            message.sender === "user"
                              ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white"
                              : "bg-gray-800 text-gray-200"
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                          <p className="text-xs opacity-70 mt-1">
                            {formatDistanceToNow(message.timestamp.toDate(), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    ))}
                    {isTyping && (
                      <div className="flex justify-start">
                        <div className="bg-gray-800 p-3 rounded-2xl">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Input */}
                  <div className="p-4 border-t border-gray-800">
                    <div className="flex items-center space-x-2">
                      <button
                        className="text-gray-400 hover:text-gray-300 transition-colors"
                        aria-label="Attach file"
                      >
                        <Paperclip className="h-5 w-5" />
                      </button>
                      <input
                        type="text"
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                        placeholder="Type your message..."
                        className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-full text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                      />
                      <button
                        onClick={handleSendMessage}
                        disabled={!inputMessage.trim() || isTyping}
                        className="p-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
                        aria-label="Send message"
                      >
                        <Send className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}
    </>
  );
}
