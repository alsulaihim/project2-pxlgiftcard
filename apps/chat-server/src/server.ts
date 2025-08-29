/**
 * Socket.io Chat Server Implementation
 * As specified in chat-architecture.mdc - Hybrid Firebase + Socket.io architecture
 * Provides sub-200ms message delivery with Firebase fallback
 */

import { createServer } from 'http';
import express from 'express';
import { Server } from 'socket.io';
import cors from 'cors';
import admin from 'firebase-admin';
import { createAdapter } from '@socket.io/redis-adapter';
import { Redis } from 'ioredis';
import { authenticateSocket } from './middleware/auth.middleware';
import { MessageHandler } from './handlers/message.handler';
import { PresenceHandler } from './handlers/presence.handler';
import { FirebaseService } from './services/firebase.service';

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: process.env.FIREBASE_PROJECT_ID,
  });
}

const app = express();
const httpServer = createServer(app);

// CORS configuration
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:3000",
  credentials: true
}));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Initialize Socket.io server
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000
});

// Redis adapter for horizontal scaling (if Redis URL provided)
if (process.env.REDIS_URL) {
  const pubClient = new Redis(process.env.REDIS_URL);
  const subClient = pubClient.duplicate();
  io.adapter(createAdapter(pubClient, subClient));
  console.log('✅ Redis adapter configured for horizontal scaling');
}

// Initialize services
const firebaseService = new FirebaseService();
const messageHandler = new MessageHandler(firebaseService);
const presenceHandler = new PresenceHandler(firebaseService);

// Authentication middleware
io.use(authenticateSocket);

// Connection handler
io.on('connection', (socket) => {
  const userId = socket.data.userId;
  const tier = socket.data.tier;
  
  console.log(`✅ User connected: ${userId} (${tier} tier)`);
  
  // Join user's personal room
  socket.join(`user:${userId}`);
  
  // Join tier room for tier-based features
  socket.join(`tier:${tier}`);
  
  // Set user online
  presenceHandler.setUserOnline(socket, userId);
  
  // Message handling
  socket.on('message:send', (data) => messageHandler.handleSendMessage(socket, data));
  socket.on('message:delivered', (data) => messageHandler.handleMessageDelivered(socket, data));
  socket.on('message:read', (data) => messageHandler.handleMessageRead(socket, data));
  
  // Conversation management
  socket.on('conversation:join', (conversationId) => {
    socket.join(`conversation:${conversationId}`);
    console.log(`User ${userId} joined conversation: ${conversationId}`);
  });
  
  socket.on('conversation:leave', (conversationId) => {
    socket.leave(`conversation:${conversationId}`);
    console.log(`User ${userId} left conversation: ${conversationId}`);
  });
  
  // Typing indicators
  socket.on('typing:start', (conversationId) => {
    socket.to(`conversation:${conversationId}`).emit('typing:update', {
      conversationId,
      userId,
      typing: true
    });
  });
  
  socket.on('typing:stop', (conversationId) => {
    socket.to(`conversation:${conversationId}`).emit('typing:update', {
      conversationId,
      userId,
      typing: false
    });
  });
  
  // Presence updates
  socket.on('presence:online', () => presenceHandler.setUserOnline(socket, userId));
  socket.on('presence:offline', () => presenceHandler.setUserOffline(socket, userId));
  
  // Disconnect handler
  socket.on('disconnect', (reason) => {
    console.log(`❌ User disconnected: ${userId} (${reason})`);
    presenceHandler.setUserOffline(socket, userId);
    
    // Notify others of offline status
    io.emit('presence:update', {
      userId,
      online: false,
      lastSeen: new Date().toISOString()
    });
  });
  
  // Error handling
  socket.on('error', (error) => {
    console.error(`Socket error for user ${userId}:`, error);
  });
});

// Global error handling
io.engine.on('connection_error', (err) => {
  console.error('Connection error:', err.req);
  console.error('Error code:', err.code);
  console.error('Error message:', err.message);
  console.error('Error context:', err.context);
});

const PORT = process.env.PORT || 8080;

httpServer.listen(PORT, () => {
  console.log(`🚀 Socket.io Chat Server running on port ${PORT}`);
  console.log(`📡 WebSocket endpoint: ws://localhost:${PORT}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log(`🔥 Firebase Project: ${process.env.FIREBASE_PROJECT_ID}`);
  console.log(`🌐 CORS Origin: ${process.env.CLIENT_URL || "http://localhost:3000"}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  httpServer.close(() => {
    console.log('✅ HTTP server closed');
    process.exit(0);
  });
});

export { io };


