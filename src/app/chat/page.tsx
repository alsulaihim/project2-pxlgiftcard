"use client";

import React, { useState, useEffect, useRef } from "react";
import { Send, Paperclip, Search, Plus } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { db } from "@/lib/firebase-config";
import { collection, addDoc, query, orderBy, onSnapshot, Timestamp, updateDoc, doc } from "firebase/firestore";
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

const suggestedQuestions = [
  // Platform-focused quick actions and FAQs
  "Show my PXL balance and today’s exchange rate",
  "Buy PXL with my card — how does the bonus PXL work?",
  "Purchase an Amazon $100 giftcard using PXL",
  "What are my tier benefits and how do I level up?",
  "Send 500 PXL to @friend with a message",
  "View my recent orders and giftcards",
  "Help me complete KYC verification",
  "Join my tier chat channel and set up chat",
  "Show my PXL transactions (purchases, transfers, cashback)",
  "Create a support ticket for a failed payment"
];

export default function ChatPage() {
  const { user, platformUser } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [session, setSession] = useState<ChatSession | null>(null);
  const [showInitialScreen, setShowInitialScreen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Suggestions stay until user sends first message
  const hasUserMessage = messages.some((m) => m.sender === "user");

  // Initialize chat session
  const initializeSession = async (): Promise<ChatSession | null> => {
    try {
      console.log("🔍 Initializing chat session...");
      console.log("🔍 User authenticated:", !!user);
      console.log("🔍 User UID:", user?.uid);
      console.log("🔍 Platform user:", !!platformUser);
      
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
      } else {
        sessionData.userTier = "guest";
      }

      console.log("🔍 Session data:", sessionData);
      console.log("🔍 Attempting to create chat session document...");
      console.log("🔍 Firebase project:", db.app.options.projectId);
      console.log("🔍 Collection path: chat-sessions");
      
      const docRef = await addDoc(collection(db, "chat-sessions"), sessionData);
      console.log("✅ Chat session created successfully:", docRef.id);
      
      const newSession = { id: docRef.id, ...sessionData } as ChatSession;
      setSession(newSession);

      // Send initial greeting
      const greeting = tierGreetings[sessionData.userTier || "guest"];
      const greetingMessage: Partial<Message> = {
        content: greeting,
        sender: "agent",
        timestamp: Timestamp.now(),
      };

      console.log("🔍 Attempting to add greeting message...");
      console.log("🔍 Messages collection path:", `chat-sessions/${docRef.id}/messages`);
      console.log("🔍 Greeting message data:", greetingMessage);
      await addDoc(collection(db, "chat-sessions", docRef.id, "messages"), greetingMessage);
      console.log("✅ Greeting message added successfully");
      
      setShowInitialScreen(false);
      return newSession;
    } catch (error) {
      console.error("❌ Error initializing chat session:", error);
      console.error("❌ Error details:", {
        code: error?.code,
        message: error?.message,
        name: error?.name
      });
      return null;
    }
  };

  // Load messages for session
  useEffect(() => {
    if (!session) return;

    console.log("🔍 Setting up message listener for session:", session.id);
    const q = query(
      collection(db, "chat-sessions", session.id, "messages"),
      orderBy("timestamp", "asc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      console.log("🔍 Message snapshot received, docs count:", snapshot.docs.length);
      const newMessages: Message[] = [];
      snapshot.forEach((doc) => {
        newMessages.push({ id: doc.id, ...doc.data() } as Message);
      });
      console.log("🔍 Processed messages:", newMessages.length);
      setMessages(newMessages);
    }, (error) => {
      console.error("❌ Error in message listener:", error);
      console.error("❌ Error details:", {
        code: error?.code,
        message: error?.message,
        name: error?.name
      });
    });

    return () => unsubscribe();
  }, [session]);

  // Initialize session on component mount if user is authenticated
  useEffect(() => {
    if (user && platformUser && !session) {
      initializeSession();
    }
  }, [user, platformUser]);

  // Send message to OpenAI and get response
  const getAIResponse = async (userMessage: string): Promise<string> => {
    const context = {
      userTier: platformUser?.tier?.current || (user ? "starter" : undefined),
      userName: platformUser?.username,
      userEmail: platformUser?.email,
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
        userEmail: platformUser?.email,
        userName: platformUser?.username,
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
  const handleSendMessage = async (messageText?: string) => {
    const messageToSend = messageText || inputMessage.trim();
    if (!messageToSend) return;

    console.log("🔍 Sending message:", messageToSend);
    console.log("🔍 Current session:", session?.id);

    // Initialize session if needed and wait for it
    let currentSession = session;
    if (!currentSession) {
      console.log("🔍 No session found, initializing...");
      currentSession = await initializeSession();
      
      // If still no session, there was an error in initialization
      if (!currentSession) {
        console.error("❌ Failed to initialize session");
        return;
      }
    }

    setInputMessage("");
    setIsTyping(true);

    // Add user message
    try {
      console.log("🔍 Adding user message to session:", currentSession.id);
      await addDoc(collection(db, "chat-sessions", currentSession.id, "messages"), {
        content: messageToSend,
        sender: "user",
        timestamp: Timestamp.now(),
      });
      console.log("✅ User message added");

      // Get AI response
      console.log("🔍 Getting AI response...");
      const aiResponse = await getAIResponse(messageToSend);

      // Add AI response
      console.log("🔍 Adding AI response...");
      await addDoc(collection(db, "chat-sessions", currentSession.id, "messages"), {
        content: aiResponse,
        sender: "agent",
        timestamp: Timestamp.now(),
      });
      console.log("✅ AI response added");

      // Update session last message time
      console.log("🔍 Updating session last activity...");
      await updateDoc(doc(db, "chat-sessions", currentSession.id), {
        lastMessageAt: Timestamp.now(),
      });
      console.log("✅ Session updated");
    } catch (error) {
      console.error("❌ Error sending message:", error);
      console.error("❌ Error details:", {
        code: error?.code,
        message: error?.message,
        name: error?.name
      });
    } finally {
      setIsTyping(false);
    }
  };

  // Format timestamp
  const formatTime = (timestamp: Timestamp) => {
    const date = timestamp.toDate();
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  return (
    <div className="bg-black flex overflow-hidden" style={{ height: 'calc(100vh - 64px)', overflow: 'hidden' }}>
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-6 py-2">
          <div className="max-w-3xl mx-auto">
            {/* Initial Screen Content */}
            {showInitialScreen && !session ? (
              <div className="flex flex-col items-center pt-8">
                <h2 className="text-3xl font-bold text-white mb-2">Hello there!</h2>
                <p className="text-gray-400 mb-4">How can I help you today?</p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div className={`max-w-[70%] ${message.sender === "user" ? "order-2" : ""}`}>
                      <div
                        className={`rounded-2xl px-4 py-3 ${
                          message.sender === "user"
                            ? "bg-blue-600 text-white"
                            : "bg-gray-900 text-gray-100"
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      </div>
                      <p className={`text-xs text-gray-500 mt-1 px-2 ${
                        message.sender === "user" ? "text-right" : "text-left"
                      }`}>
                        {formatTime(message.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-gray-900 rounded-2xl px-4 py-3">
                      <div className="flex space-x-2">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </div>

        {/* Suggested Questions - Above Input (visible until first user message) */}
        {!hasUserMessage && (
          <div className="px-6 pb-4 flex-shrink-0">
            <div className="max-w-3xl mx-auto">
              <div className="grid grid-cols-2 gap-4">
                {suggestedQuestions.map((question, index) => (
                  <button
                    key={index}
                    onClick={() => handleSendMessage(question)}
                    className="bg-gray-900 hover:bg-gray-800 rounded-lg p-4 text-left transition-colors"
                  >
                    <p className="text-sm text-gray-300">{question}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="px-6 py-2 flex-shrink-0">
          <div className="max-w-3xl mx-auto">
            <div className="relative">
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*,.pdf,.doc,.docx"
              />
              <div className="relative bg-gray-900 rounded-2xl px-4 py-4">
              <textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Send a message..."
                className="w-full bg-transparent text-white placeholder-gray-400 resize-none focus:outline-none focus:ring-0 focus:border-none pr-20 min-h-[80px] max-h-40"
                rows={3}
                style={{ 
                  height: 'auto',
                  minHeight: '80px',
                  outline: 'none',
                  border: 'none',
                  boxShadow: 'none'
                }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = Math.min(target.scrollHeight, 160) + 'px';
                }}
              />
                
                {/* Buttons inside input */}
                <div className="absolute right-3 bottom-3 flex items-center space-x-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-gray-800"
                    aria-label="Attach file"
                  >
                    <Paperclip className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleSendMessage()}
                    disabled={!inputMessage.trim() || isTyping}
                    className={`p-2 rounded-lg transition-colors ${
                      inputMessage.trim() && !isTyping
                        ? "bg-blue-600 text-white hover:bg-blue-700"
                        : "bg-gray-700 text-gray-500 cursor-not-allowed"
                    }`}
                    aria-label="Send message"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between mt-1">
              <p className="text-xs text-gray-500">
                {user ? `Logged in as ${platformUser?.username || user.email}` : "Chatting as guest"}
              </p>
              <p className="text-xs text-gray-500">
                Press Enter to send • Shift+Enter for new line
              </p>
            </div>
          </div>
        </div>
      </div>


    </div>
  );
}
