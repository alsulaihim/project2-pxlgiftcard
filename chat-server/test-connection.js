// Simple Socket.io connection test
const { io } = require('socket.io-client');

console.log('🧪 Testing Socket.io connection...');

const socket = io('http://localhost:8080', {
  auth: { token: 'test-token' },
  transports: ['websocket', 'polling'],
  timeout: 5000
});

socket.on('connect', () => {
  console.log('✅ Connected to Socket.io server:', socket.id);
  
  // Test joining a conversation
  socket.emit('conversation:join', 'test-conversation');
  
  // Test sending a message
  setTimeout(() => {
    socket.emit('message:send', {
      conversationId: 'test-conversation',
      type: 'text',
      content: 'Hello from test client!',
      nonce: 'test-nonce'
    });
  }, 1000);
});

socket.on('connect_error', (error) => {
  console.error('❌ Connection error:', error.message);
});

socket.on('disconnect', (reason) => {
  console.log('🔌 Disconnected:', reason);
});

socket.on('message:new', (message) => {
  console.log('📨 Received message:', message);
});

socket.on('message:sent', (data) => {
  console.log('✅ Message sent confirmation:', data);
});

// Keep the test running for 10 seconds
setTimeout(() => {
  console.log('🏁 Test completed');
  socket.disconnect();
  process.exit(0);
}, 10000);

