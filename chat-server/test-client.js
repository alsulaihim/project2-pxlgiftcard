const io = require('socket.io-client');

console.log('🧪 Testing Socket.IO connection to http://localhost:8080');

// Test with a mock Firebase token
const mockToken = 'test-firebase-token-' + Date.now();

const socket = io('http://localhost:8080', {
  auth: { token: mockToken },
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 5,
  timeout: 10000,
  forceNew: true,
  upgrade: true,
  rememberUpgrade: false
});

socket.on('connect', () => {
  console.log('✅ Connected successfully!');
  console.log('   Socket ID:', socket.id);
  console.log('   Transport:', socket.io.engine.transport.name);
  
  // Test joining a conversation
  const testConversationId = 'direct_6NmJ13Xl01eLrOZ3HhAbEMYULI72_NkTmPMpaTiTNw6RmhdITwCbmf6r2';
  console.log('\n📋 Testing conversation join...');
  
  socket.emit('conversation:join', testConversationId, (response) => {
    if (response.success) {
      console.log('✅ Joined conversation successfully:', response);
      
      // Test sending a message
      console.log('\n📤 Testing message send...');
      socket.emit('message:send', {
        conversationId: testConversationId,
        type: 'text',
        text: 'Test message from client',
        nonce: 'test-nonce'
      }, (msgResponse) => {
        if (msgResponse.success) {
          console.log('✅ Message sent successfully:', msgResponse);
        } else {
          console.log('❌ Message send failed:', msgResponse);
        }
        
        // Test health check ping
        console.log('\n🏓 Testing health check ping...');
        socket.emit('ping', { timestamp: Date.now() });
      });
    } else {
      console.log('❌ Failed to join conversation:', response);
    }
  });
});

socket.on('pong', (data) => {
  console.log('✅ Pong received:', data);
  const latency = Date.now() - data.clientTimestamp;
  console.log('   Latency:', latency + 'ms');
  
  console.log('\n✅ All tests completed successfully!');
  console.log('🔌 Disconnecting...');
  socket.disconnect();
  process.exit(0);
});

socket.on('message:new', (message) => {
  console.log('📨 Received message:', message);
});

socket.on('auth:success', (data) => {
  console.log('🔐 Authentication successful:', data);
});

socket.on('connect_error', (error) => {
  console.error('❌ Connection error:', error.message);
  console.error('   Error type:', error.type);
  if (error.data) {
    console.error('   Error data:', error.data);
  }
  process.exit(1);
});

socket.on('disconnect', (reason) => {
  console.log('🔌 Disconnected:', reason);
});

socket.on('error', (error) => {
  console.error('❌ Socket error:', error);
});

// Timeout after 10 seconds
setTimeout(() => {
  console.error('⏱️ Test timed out after 10 seconds');
  socket.disconnect();
  process.exit(1);
}, 10000);