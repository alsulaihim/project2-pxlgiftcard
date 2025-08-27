"use client";

import React, { useState, useEffect, useRef } from "react";
import { Send, Paperclip, MoreVertical, Search, Plus } from "lucide-react";
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
  "What are the advantages of using Next.js?",
  "Write code to demonstrate Dijkstra's algorithm",
  "What is the weather in San Francisco?",
  "Help me write an essay about silicon valley"
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
      } else {
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
      setShowInitialScreen(false);
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

    // Initialize session if needed
    if (!session) {
      await initializeSession();
    }

    setInputMessage("");
    setIsTyping(true);

    // Add user message
    try {
      await addDoc(collection(db, "chat-sessions", session!.id, "messages"), {
        content: messageToSend,
        sender: "user",
        timestamp: Timestamp.now(),
      });

      // Get AI response
      const aiResponse = await getAIResponse(messageToSend);

      // Add AI response
      await addDoc(collection(db, "chat-sessions", session!.id, "messages"), {
        content: aiResponse,
        sender: "agent",
        timestamp: Timestamp.now(),
      });

      // Update session last message time
      await updateDoc(doc(db, "chat-sessions", session!.id), {
        lastMessageAt: Timestamp.now(),
      });
    } catch (error) {
      console.error("Error sending message:", error);
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
    <div className="flex h-screen bg-black">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-semibold text-white">PXL Support Chat</h1>
            <span className="text-sm text-gray-400">Always here to help</span>
          </div>
          <button className="text-gray-400 hover:text-white">
            <MoreVertical className="h-5 w-5" />
          </button>
        </div>

        {/* Messages Area or Initial Screen */}
        {showInitialScreen && !session ? (
          <div className="flex-1 flex flex-col items-center justify-center px-6">
            <h2 className="text-3xl font-bold text-white mb-2">Hello there!</h2>
            <p className="text-gray-400 mb-8">How can I help you today?</p>
            
            <div className="grid grid-cols-2 gap-4 max-w-2xl w-full mb-8">
              {suggestedQuestions.map((question, index) => (
                <button
                  key={index}
                  onClick={() => handleSendMessage(question)}
                  className="bg-gray-900 hover:bg-gray-800 border border-gray-700 rounded-lg p-4 text-left transition-colors"
                >
                  <p className="text-sm text-gray-300">{question}</p>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <div className="max-w-3xl mx-auto space-y-4">
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
                          : "bg-gray-900 text-gray-100 border border-gray-800"
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
                  <div className="bg-gray-900 border border-gray-800 rounded-2xl px-4 py-3">
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
          </div>
        )}

        {/* Input Area */}
        <div className="border-t border-gray-800 px-6 py-4">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center space-x-2">
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*,.pdf,.doc,.docx"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-2 text-gray-400 hover:text-white transition-colors"
                aria-label="Attach file"
              >
                <Paperclip className="h-5 w-5" />
              </button>
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
                placeholder="Send a message..."
                className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-gray-600"
              />
              <button
                onClick={() => handleSendMessage()}
                disabled={!inputMessage.trim() || isTyping}
                className={`p-2 rounded-lg transition-colors ${
                  inputMessage.trim() && !isTyping
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "bg-gray-800 text-gray-500 cursor-not-allowed"
                }`}
                aria-label="Send message"
              >
                <Send className="h-5 w-5" />
              </button>
            </div>
            <div className="flex items-center justify-between mt-2">
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

      {/* Right Sidebar - Chat Info */}
      <div className="w-80 bg-gray-900 border-l border-gray-800 p-6 hidden lg:block">
        <div className="space-y-6">
          {/* User Info */}
          {user && platformUser && (
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-3">Your Info</h3>
              <div className="bg-gray-800 rounded-lg p-4 space-y-3">
                <div>
                  <p className="text-xs text-gray-500">Username</p>
                  <p className="text-sm text-white">{platformUser.username}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Tier</p>
                  <p className="text-sm text-white capitalize">{platformUser.tier.current}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">PXL Balance</p>
                  <p className="text-sm text-white">{platformUser.wallets?.pxl?.balance || 0} PXL</p>
                </div>
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div>
            <h3 className="text-sm font-medium text-gray-400 mb-3">Quick Actions</h3>
            <div className="space-y-2">
              <button
                onClick={() => handleSendMessage("I need help with my account")}
                className="w-full text-left bg-gray-800 hover:bg-gray-700 rounded-lg px-4 py-3 text-sm text-gray-300 transition-colors"
              >
                Account Help
              </button>
              <button
                onClick={() => handleSendMessage("Tell me about PXL currency")}
                className="w-full text-left bg-gray-800 hover:bg-gray-700 rounded-lg px-4 py-3 text-sm text-gray-300 transition-colors"
              >
                PXL Information
              </button>
              <button
                onClick={() => handleSendMessage("How do tiers work?")}
                className="w-full text-left bg-gray-800 hover:bg-gray-700 rounded-lg px-4 py-3 text-sm text-gray-300 transition-colors"
              >
                Tier Benefits
              </button>
              <button
                onClick={() => handleSendMessage("I want to speak to a human agent")}
                className="w-full text-left bg-gray-800 hover:bg-gray-700 rounded-lg px-4 py-3 text-sm text-gray-300 transition-colors"
              >
                Human Support
              </button>
            </div>
          </div>

          {/* Platform Features */}
          <div>
            <h3 className="text-sm font-medium text-gray-400 mb-3">Platform Features</h3>
            <ul className="space-y-2 text-sm text-gray-500">
              <li>• 5-tier progression system</li>
              <li>• Up to 13% discount on giftcards</li>
              <li>• PXL currency with appreciation</li>
              <li>• Instant giftcard delivery</li>
              <li>• 24/7 AI support</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
