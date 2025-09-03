const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const admin = require('firebase-admin');
const path = require('path');

const app = express();
const httpServer = createServer(app);

// Socket.io with CORS
const io = new Server(httpServer, {
  cors: {
    origin: ["http://localhost:3009", "http://localhost:3000"],
    methods: ["GET", "POST"],
    credentials: true,
    allowedHeaders: ["*"]
  },
  allowEIO3: true, // Allow Engine.IO v3 clients
  
  // Socket.IO v4 optimizations
  connectionStateRecovery: {
    // Enable connection state recovery
    maxDisconnectionDuration: 2 * 60 * 1000, // 2 minutes
    skipMiddlewares: true,
  },
  
  // v4 Transport configuration
  transports: ['websocket', 'polling'],
  upgradeTimeout: 10000,
  
  // v4 Packet buffering
  maxHttpBufferSize: 1e6, // 1MB
  
  // Performance optimizations
  pingTimeout: 60000, // 60 seconds
  pingInterval: 25000, // 25 seconds
  
  // Enable compression
  compression: true,
  httpCompression: true
});

// Initialize Firebase Admin (dev)
function initAdmin() {
  try {
    if (admin.apps.length === 0) {
      const saPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
        ? (path.isAbsolute(process.env.GOOGLE_APPLICATION_CREDENTIALS)
            ? process.env.GOOGLE_APPLICATION_CREDENTIALS
            : path.join(process.cwd(), process.env.GOOGLE_APPLICATION_CREDENTIALS))
        : path.join(__dirname, 'serviceAccountKey.json');
      const serviceAccount = require(saPath);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: process.env.FIREBASE_PROJECT_ID || serviceAccount.project_id || 'pxl-perfect-1'
      });
      console.log('✅ Firebase Admin initialized (minimal-server)');
    }
  } catch (e) {
    console.log('⚠️ Firebase Admin init failed, continuing with mock auth:', e.message);
  }
}
initAdmin();

// Normalize a direct conversation room id so both participants compute the same room
function normalizeConversationId(conversationId) {
  try {
    if (typeof conversationId !== 'string') return conversationId;
    const prefix = 'direct_';
    if (!conversationId.startsWith(prefix)) return conversationId;
    const rest = conversationId.slice(prefix.length);
    const parts = rest.split('_');
    if (parts.length < 2) return conversationId;
    const [a, b] = [parts[0], parts[1]];
    // Lexicographic order to stabilize room name
    const [minId, maxId] = a < b ? [a, b] : [b, a];
    return `${prefix}${minId}_${maxId}`;
  } catch (_) {
    return conversationId;
  }
}

function extractUserIdsFromConversationId(conversationId) {
  try {
    if (typeof conversationId !== 'string') return [];
    const prefix = 'direct_';
    if (!conversationId.startsWith(prefix)) return [];
    const rest = conversationId.slice(prefix.length);
    const parts = rest.split('_');
    if (parts.length < 2) return [];
    const [a, b] = [parts[0], parts[1]];
    return [a, b];
  } catch (_) {
    return [];
  }
}

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    connections: io.engine.clientsCount
  });
});

// Socket.io authentication middleware (STRICT)
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      console.log(`🚫 No token provided for socket: ${socket.id}`);
      return next(new Error('Authentication token required'));
    }
    initAdmin();
    if (!admin.apps.length) {
      return next(new Error('Server auth not initialized'));
    }
    const decoded = await admin.auth().verifyIdToken(token);
    const uid = decoded.uid;
    console.log(`✅ Socket authenticated via Firebase: ${socket.id} uid=${uid}`);
    socket.data = {
      userId: uid,
      email: decoded.email || '',
      tier: 'starter',
      displayName: decoded.name || decoded.email || uid,
      socketId: socket.id,
      connectedAt: new Date().toISOString()
    };
    return next();
  } catch (error) {
    console.error(`❌ Authentication error for socket ${socket.id}:`, error && error.message ? error.message : error);
    next(new Error('Authentication failed'));
  }
});

// Socket.io connection handler
io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id} (User: ${socket.data.userId})`);
  
  // Join user's own room for direct messaging (important for message delivery)
  socket.join(`user:${socket.data.userId}`);
  console.log(`🔑 User ${socket.data.userId} joined their personal room: user:${socket.data.userId}`);
  
  // Handle message sending with Socket.IO v4 acknowledgements
  socket.on('message:send', (data, callback) => {
    try {
      if (!data || !data.conversationId) {
        console.error(`❌ Invalid message data from ${socket.data.userId}:`, data);
        const error = { success: false, error: 'Invalid message data' };
        if (callback) callback(error);
        socket.emit('error', error);
        return;
      }
      
      // Normalize room id to ensure both sides share the same room
      const normalizedConversationId = normalizeConversationId(data.conversationId);
      if (normalizedConversationId !== data.conversationId) {
        console.log(`🔁 Normalized conversation id: ${data.conversationId} -> ${normalizedConversationId}`);
      }

      console.log(`📨 Message from ${socket.data.userId} (${socket.data.displayName}) to conversation ${normalizedConversationId}`);
      
      const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Create message object with sender info (no plaintext fields)
      const message = {
        id: messageId,
        conversationId: normalizedConversationId,
        senderId: socket.data.userId,
        senderName: socket.data.displayName,
        type: data.type || 'text',
        // Recipient-encrypted version only
        text: data.text || '',
        nonce: data.nonce || '',
        // Back-compat field mirrors encrypted text
        content: data.text || '',
        timestamp: new Date().toISOString(),
        delivered: [socket.data.userId],
        read: []
      };
      
      // Send acknowledgement back to sender with message details
      const ackResponse = {
        success: true,
        messageId: messageId,
        timestamp: message.timestamp,
        deliveredTo: []
      };
      
      // Extract user IDs from direct conversation
      const [uidA, uidB] = extractUserIdsFromConversationId(normalizedConversationId);
      
      // Primary delivery: Send to conversation room (for users who have joined)
      const roomsInConversation = io.sockets.adapter.rooms.get(normalizedConversationId);
      const memberCount = roomsInConversation ? roomsInConversation.size : 0;
      console.log(`📡 Broadcasting to conversation ${normalizedConversationId}, room has ${memberCount} members`);
      
      if (memberCount > 1) {
        // Broadcast to other members in the conversation room
        socket.to(normalizedConversationId).emit('message:new', message);
        console.log(`✅ Message ${messageId} broadcast to ${memberCount - 1} other members in conversation room`);
      } else {
        console.log(`ℹ️ Only sender in conversation room, trying user room delivery`);
      }
      
      // Fallback delivery: Always send to recipient's personal user room
      // This ensures delivery even if recipient hasn't joined the conversation room yet
      if (uidA && uidB) {
        const otherUserId = socket.data.userId === uidA ? uidB : uidA;
        if (otherUserId) {
          // Check if the other user has any active sockets
          const recipientRoom = io.sockets.adapter.rooms.get(`user:${otherUserId}`);
          if (recipientRoom && recipientRoom.size > 0) {
            socket.to(`user:${otherUserId}`).emit('message:new', message);
            console.log(`📬 Message ${messageId} delivered to user:${otherUserId} (${recipientRoom.size} sockets)`);
            ackResponse.deliveredTo = [otherUserId];
          } else {
            console.warn(`⚠️ User ${otherUserId} not online, message ${messageId} will be retrieved from Firestore`);
          }
        }
      }
      
      // Send acknowledgement to sender (Node-style: err, response)
      if (callback) {
        callback(null, { ...ackResponse, conversationId: normalizedConversationId });
      } else {
        socket.emit('message:sent', { ...ackResponse, conversationId: normalizedConversationId });
      }
      
    } catch (error) {
      console.error(`❌ Error handling message from ${socket.data.userId}:`, error);
      const errorResponse = { success: false, error: 'Failed to send message' };
      if (callback) callback(errorResponse);
      socket.emit('error', errorResponse);
    }
  });
  
  // Handle conversation joining with acknowledgement
  socket.on('conversation:join', (conversationId, callback) => {
    try {
      const normalizedConversationId = normalizeConversationId(conversationId);
      if (normalizedConversationId !== conversationId) {
        console.log(`🔁 Normalized conversation id on join: ${conversationId} -> ${normalizedConversationId}`);
      }
      console.log(`👥 User ${socket.data.userId} joining conversation: ${normalizedConversationId}`);
      socket.join(normalizedConversationId);
      
      // Note: User already joined their own user:${userId} room on connection
      // This ensures they receive messages even if they haven't explicitly joined the conversation
      
      const response = { 
        success: true, 
        conversationId: normalizedConversationId,
        joinedAt: new Date().toISOString(),
        memberCount: io.sockets.adapter.rooms.get(normalizedConversationId)?.size || 1
      };
      
      // Send acknowledgement
      if (callback) {
        callback(response);
      } else {
        socket.emit('conversation:joined', response);
      }
      
      // Log all rooms this socket is in
      console.log(`📋 Socket ${socket.id} is now in rooms:`, Array.from(socket.rooms));
      
    } catch (error) {
      console.error(`❌ Error joining conversation ${conversationId}:`, error);
      const errorResponse = { success: false, error: 'Failed to join conversation' };
      if (callback) callback(errorResponse);
      socket.emit('error', errorResponse);
    }
  });
  
  // Handle message delivery acknowledgement from recipients
  socket.on('message:delivered', (payload, callback) => {
    const normalized = typeof payload === 'string' ? { messageId: payload } : (payload || {});
    const messageId = normalized.messageId || payload || '';
    const conversationId = normalized.conversationId;
    console.log(`📬 Message ${messageId} delivered to ${socket.data.userId}`);
    
    // Notify sender about delivery (both event names for compatibility)
    const deliveryPayload = {
      messageId,
      deliveredTo: socket.data.userId,
      userId: socket.data.userId,
      conversationId,
      timestamp: new Date().toISOString()
    };
    socket.broadcast.emit('message:delivery:update', deliveryPayload);
    socket.broadcast.emit('message:delivered', deliveryPayload);
    
    if (callback) callback({ success: true });
  });
  
  // Handle message read acknowledgement
  socket.on('message:read', (payload, callback) => {
    const messageIds = Array.isArray(payload) ? payload : (payload?.messageIds || []);
    const conversationId = Array.isArray(payload) ? undefined : payload?.conversationId;
    console.log(`👀 Messages read by ${socket.data.userId}:`, messageIds);
    
    // Notify sender about read status (both event names for compatibility)
    const readPayload = {
      messageIds,
      readBy: socket.data.userId,
      conversationId,
      timestamp: new Date().toISOString()
    };
    socket.broadcast.emit('message:read:update', readPayload);
    // Also emit per-message events expected by some clients
    (messageIds || []).forEach((mid) => {
      socket.broadcast.emit('message:read', {
        messageId: mid,
        userId: socket.data.userId,
        conversationId,
        timestamp: new Date().toISOString()
      });
    });
    
    if (callback) callback({ success: true });
  });
  
  // Handle typing indicators
  socket.on('typing:start', (payload) => {
    const conversationId = typeof payload === 'string' ? payload : (payload?.conversationId || '');
    if (!conversationId) return;
    socket.to(conversationId).emit('typing:update', {
      conversationId,
      userId: socket.data.userId,
      typing: true
    });
  });
  
  socket.on('typing:stop', (payload) => {
    const conversationId = typeof payload === 'string' ? payload : (payload?.conversationId || '');
    if (!conversationId) return;
    socket.to(conversationId).emit('typing:update', {
      conversationId,
      userId: socket.data.userId,
      typing: false
    });
  });
  
  // Handle recording indicators
  socket.on('recording:start', (conversationId) => {
    console.log(`🎤 User ${socket.data.userId} started recording in ${conversationId}`);
    socket.to(conversationId).emit('recording:update', {
      conversationId,
      userId: socket.data.userId,
      recording: true
    });
  });
  
  socket.on('recording:stop', (conversationId) => {
    console.log(`🎤 User ${socket.data.userId} stopped recording in ${conversationId}`);
    socket.to(conversationId).emit('recording:update', {
      conversationId,
      userId: socket.data.userId,
      recording: false
    });
  });
  
  // Handle new conversation notification
  socket.on('notify-user-new-conversation', (data) => {
    console.log(`🔔 New conversation notification for user ${data.userId}: ${data.conversationId}`);
    
    // Find the socket for the target user
    io.sockets.sockets.forEach((targetSocket) => {
      if (targetSocket.data && targetSocket.data.userId === data.userId) {
        console.log(`📤 Sending new conversation notification to user ${data.userId}`);
        targetSocket.emit('notify-user-new-conversation', { conversationId: data.conversationId });
      }
    });
  });
  
  // Handle ping/pong for connection health check
  socket.on('ping', (data) => {
    socket.emit('pong', { timestamp: Date.now(), clientTimestamp: data.timestamp });
  });
  
  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`❌ Client disconnected: ${socket.id}`);
  });
});

const PORT = 8080;
httpServer.listen(PORT, () => {
  console.log(`🚀 Minimal Chat Server started successfully`);
  console.log(`📡 Server running on port: ${PORT}`);
  console.log(`🌐 CORS origin: http://localhost:3009`);
  console.log(`🔌 WebSocket endpoint: ws://localhost:${PORT}/socket.io/`);
  console.log(`💚 Health check: http://localhost:${PORT}/health`);
});
