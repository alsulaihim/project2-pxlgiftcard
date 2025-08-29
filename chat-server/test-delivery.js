const io = require('socket.io-client');

// Test message delivery between two users
async function testMessageDelivery() {
  console.log('🧪 Testing message delivery between users\n');
  
  // Create two users
  const user1Token = 'test-token-alice-' + Date.now();
  const user2Token = 'test-token-bob-' + (Date.now() + 1);
  
  // Connect User 1 (Alice)
  const user1 = io('http://localhost:8080', {
    auth: { token: user1Token },
    transports: ['websocket'],
    forceNew: true
  });
  
  // Connect User 2 (Bob)
  const user2 = io('http://localhost:8080', {
    auth: { token: user2Token },
    transports: ['websocket'],
    forceNew: true
  });
  
  let user1Id = null;
  let user2Id = null;
  let messagesReceived = [];
  
  // Setup User 1 handlers
  user1.on('connect', () => {
    console.log('✅ User 1 connected');
  });
  
  user1.on('auth:success', (data) => {
    user1Id = data.userId;
    console.log(`👤 User 1 authenticated as: ${data.displayName} (${user1Id})`);
  });
  
  user1.on('message:new', (message) => {
    console.log(`📨 User 1 received message: "${message.content}" from ${message.senderName}`);
    messagesReceived.push({ user: 1, message });
  });
  
  // Setup User 2 handlers
  user2.on('connect', () => {
    console.log('✅ User 2 connected');
  });
  
  user2.on('auth:success', (data) => {
    user2Id = data.userId;
    console.log(`👤 User 2 authenticated as: ${data.displayName} (${user2Id})`);
  });
  
  user2.on('message:new', (message) => {
    console.log(`📨 User 2 received message: "${message.content}" from ${message.senderName}`);
    messagesReceived.push({ user: 2, message });
  });
  
  // Wait for both users to connect
  await new Promise(resolve => {
    let count = 0;
    const checkBoth = () => {
      count++;
      if (count === 2) resolve();
    };
    user1.once('auth:success', checkBoth);
    user2.once('auth:success', checkBoth);
  });
  
  await new Promise(resolve => setTimeout(resolve, 500));
  
  console.log('\n📋 Test Scenario 1: User 2 sends message without joining conversation');
  console.log('   (Testing user room delivery)');
  
  // User 2 sends a message WITHOUT joining the conversation first
  const conversationId = `direct_${user1Id}_${user2Id}`;
  user2.emit('message:send', {
    conversationId: conversationId,
    type: 'text',
    text: 'Hello from User 2 (no room join)',
    nonce: 'test-nonce-1'
  }, (response) => {
    console.log(`   Message sent:`, response.success ? '✅' : '❌', response.messageId || response.error);
  });
  
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  console.log('\n📋 Test Scenario 2: Both users join conversation, then send messages');
  console.log('   (Testing conversation room delivery)');
  
  // Both users join the conversation
  await new Promise(resolve => {
    let joined = 0;
    user1.emit('conversation:join', conversationId, (response) => {
      console.log(`   User 1 joined conversation:`, response.success ? '✅' : '❌');
      if (++joined === 2) resolve();
    });
    user2.emit('conversation:join', conversationId, (response) => {
      console.log(`   User 2 joined conversation:`, response.success ? '✅' : '❌');
      if (++joined === 2) resolve();
    });
  });
  
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // User 1 sends a message
  user1.emit('message:send', {
    conversationId: conversationId,
    type: 'text',
    text: 'Hello from User 1 (both in room)',
    nonce: 'test-nonce-2'
  }, (response) => {
    console.log(`   User 1 message sent:`, response.success ? '✅' : '❌', response.messageId || response.error);
  });
  
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // User 2 sends another message
  user2.emit('message:send', {
    conversationId: conversationId,
    type: 'text',
    text: 'Reply from User 2 (both in room)',
    nonce: 'test-nonce-3'
  }, (response) => {
    console.log(`   User 2 message sent:`, response.success ? '✅' : '❌', response.messageId || response.error);
  });
  
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  console.log('\n📋 Test Scenario 3: User 1 disconnects, User 2 sends message');
  console.log('   (Testing offline delivery fallback)');
  
  // Disconnect User 1
  user1.disconnect();
  console.log('   User 1 disconnected');
  
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // User 2 sends a message while User 1 is offline
  user2.emit('message:send', {
    conversationId: conversationId,
    type: 'text',
    text: 'Message while User 1 is offline',
    nonce: 'test-nonce-4'
  }, (response) => {
    console.log(`   User 2 message sent:`, response.success ? '✅' : '❌');
    if (response.deliveredTo && response.deliveredTo.length === 0) {
      console.log('   ⚠️ Message not delivered (user offline) - will be retrieved from Firestore');
    }
  });
  
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Summary
  console.log('\n📊 Test Summary:');
  console.log(`   Total messages received: ${messagesReceived.length}`);
  console.log(`   User 1 received: ${messagesReceived.filter(m => m.user === 1).length} messages`);
  console.log(`   User 2 received: ${messagesReceived.filter(m => m.user === 2).length} messages`);
  
  messagesReceived.forEach((item, i) => {
    console.log(`   ${i + 1}. User ${item.user} received: "${item.message.content}"`);
  });
  
  // Cleanup
  user2.disconnect();
  
  console.log('\n✅ Test completed!');
  process.exit(0);
}

// Run the test
testMessageDelivery().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});