'use client';

import { useState } from 'react';
import { collection, getDocs, doc, getDoc, setDoc, updateDoc, deleteField } from 'firebase/firestore';
import { db } from '@/lib/firebase-config';

export default function DebugReactionsPage() {
  const [messageId, setMessageId] = useState('');
  const [conversationId, setConversationId] = useState('direct_6NmJ13Xl01eLrOZ3HhAbEMYULI72_NkTmPMpaTiTNw6RmhdITwCbmf6r2');
  const [messageData, setMessageData] = useState<any>(null);
  const [status, setStatus] = useState('');
  
  const checkMessage = async () => {
    try {
      setStatus('Checking message...');
      const messageRef = doc(db, 'conversations', conversationId, 'messages', messageId);
      const messageDoc = await getDoc(messageRef);
      
      if (!messageDoc.exists()) {
        setStatus('Message not found');
        setMessageData(null);
        return;
      }
      
      const data = messageDoc.data();
      setMessageData(data);
      setStatus('Message loaded successfully');
      
      console.log('Message data:', data);
      console.log('Has reactions field:', 'reactions' in data);
      console.log('Reactions value:', data.reactions);
      console.log('Reactions type:', typeof data.reactions);
      
    } catch (error) {
      console.error('Error checking message:', error);
      setStatus(`Error: ${error}`);
    }
  };
  
  const fixReactionsField = async () => {
    try {
      setStatus('Fixing reactions field...');
      const messageRef = doc(db, 'conversations', conversationId, 'messages', messageId);
      
      // Method 1: Delete field completely then re-add
      await updateDoc(messageRef, {
        reactions: deleteField()
      });
      
      console.log('Deleted reactions field');
      
      // Wait a moment
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Re-add with empty object
      await updateDoc(messageRef, {
        reactions: {}
      });
      
      console.log('Re-added reactions field');
      setStatus('Reactions field fixed - try adding reactions now');
      
      // Re-check the message
      await checkMessage();
      
    } catch (error) {
      console.error('Error fixing reactions:', error);
      setStatus(`Error: ${error}`);
    }
  };
  
  const addTestReaction = async () => {
    try {
      setStatus('Adding test reaction...');
      const messageRef = doc(db, 'conversations', conversationId, 'messages', messageId);
      
      // Get current data
      const messageDoc = await getDoc(messageRef);
      if (!messageDoc.exists()) {
        setStatus('Message not found');
        return;
      }
      
      const data = messageDoc.data();
      const reactions = data.reactions || {};
      
      // Add a test reaction
      reactions['👍'] = ['test-user-id'];
      
      // Update with the new reactions
      await updateDoc(messageRef, {
        reactions: reactions
      });
      
      setStatus('Test reaction added');
      
      // Re-check the message
      await checkMessage();
      
    } catch (error) {
      console.error('Error adding test reaction:', error);
      setStatus(`Error: ${error}`);
    }
  };
  
  const checkAllMessages = async () => {
    try {
      setStatus('Checking all messages...');
      const messagesSnapshot = await getDocs(
        collection(db, 'conversations', conversationId, 'messages')
      );
      
      const results: any[] = [];
      messagesSnapshot.forEach(doc => {
        const data = doc.data();
        results.push({
          id: doc.id,
          hasReactions: 'reactions' in data,
          reactionsValue: data.reactions,
          reactionsType: typeof data.reactions
        });
      });
      
      console.log('All messages check:', results);
      setStatus(`Checked ${results.length} messages - see console for details`);
      
    } catch (error) {
      console.error('Error checking all messages:', error);
      setStatus(`Error: ${error}`);
    }
  };
  
  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Debug Reactions</h1>
        
        <div className="bg-gray-900 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Check Specific Message</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Conversation ID:</label>
              <input
                type="text"
                value={conversationId}
                onChange={(e) => setConversationId(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 rounded-lg"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Message ID (e.g., Gfn2zM5Ua4aI63uH9vqX):</label>
              <input
                type="text"
                value={messageId}
                onChange={(e) => setMessageId(e.target.value)}
                placeholder="Enter message ID"
                className="w-full px-3 py-2 bg-gray-800 rounded-lg"
              />
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={checkMessage}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg"
              >
                Check Message
              </button>
              
              <button
                onClick={fixReactionsField}
                disabled={!messageId}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded-lg"
              >
                Fix Reactions Field
              </button>
              
              <button
                onClick={addTestReaction}
                disabled={!messageId}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 rounded-lg"
              >
                Add Test Reaction
              </button>
              
              <button
                onClick={checkAllMessages}
                className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-lg"
              >
                Check All Messages
              </button>
            </div>
          </div>
        </div>
        
        {status && (
          <div className="bg-gray-900 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-2">Status</h2>
            <p className="text-gray-300">{status}</p>
          </div>
        )}
        
        {messageData && (
          <div className="bg-gray-900 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Message Data</h2>
            <pre className="text-xs overflow-auto bg-gray-800 p-4 rounded">
              {JSON.stringify(messageData, null, 2)}
            </pre>
            <div className="mt-4 space-y-2">
              <p>Has reactions field: {('reactions' in messageData).toString()}</p>
              <p>Reactions type: {typeof messageData.reactions}</p>
              <p>Reactions value: {JSON.stringify(messageData.reactions)}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}