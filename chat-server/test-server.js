const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:3009",
    methods: ["GET", "POST"]
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Simple Socket.io handler
io.on('connection', (socket) => {
  console.log('✅ Client connected:', socket.id);
  
  socket.on('test', (data) => {
    console.log('📨 Received test message:', data);
    socket.emit('test-response', { message: 'Hello from server!' });
  });
  
  socket.on('disconnect', () => {
    console.log('❌ Client disconnected:', socket.id);
  });
});

const PORT = 8080;
httpServer.listen(PORT, () => {
  console.log(`🚀 Test server running on port ${PORT}`);
  console.log(`💚 Health check: http://localhost:${PORT}/health`);
});

