'use client';

import { useState } from 'react';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase-config';

export default function MigrateReactionsPage() {
  const [status, setStatus] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<{total: number, migrated: number} | null>(null);
  
  const runMigration = async () => {
    setIsRunning(true);
    setStatus('Starting migration...');
    setResults(null);
    
    try {
      // Get all conversations
      const conversationsSnapshot = await getDocs(collection(db, 'conversations'));
      let totalMessages = 0;
      let migratedMessages = 0;
      
      for (const convDoc of conversationsSnapshot.docs) {
        const conversationId = convDoc.id;
        setStatus(`Processing conversation: ${conversationId}`);
        
        // Get all messages in this conversation
        const messagesSnapshot = await getDocs(
          collection(db, 'conversations', conversationId, 'messages')
        );
        
        for (const msgDoc of messagesSnapshot.docs) {
          totalMessages++;
          const messageData = msgDoc.data();
          
          // Check if fields exist and add them if missing
          const updates: any = {};
          let needsUpdate = false;
          
          if (!('reactions' in messageData)) {
            updates.reactions = {};
            needsUpdate = true;
          }
          
          if (!('deliveredTo' in messageData)) {
            updates.deliveredTo = [];
            needsUpdate = true;
          }
          
          if (!('readBy' in messageData)) {
            updates.readBy = [];
            needsUpdate = true;
          }
          
          if (needsUpdate) {
            setStatus(`Updating message: ${msgDoc.id}`);
            
            // Add missing fields using setDoc with merge
            await setDoc(
              doc(db, 'conversations', conversationId, 'messages', msgDoc.id),
              updates,
              { merge: true }
            );
            
            migratedMessages++;
          }
        }
      }
      
      setResults({ total: totalMessages, migrated: migratedMessages });
      setStatus('Migration complete!');
      
    } catch (error) {
      console.error('Migration failed:', error);
      setStatus(`Migration failed: ${error}`);
    } finally {
      setIsRunning(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Migrate Reactions Field</h1>
        
        <div className="bg-gray-900 rounded-lg p-6 mb-6">
          <p className="mb-4">
            This migration will add the reactions field to all existing messages that don't have it.
            This fixes the issue where reactions aren't persisting on older messages.
          </p>
          
          <button
            onClick={runMigration}
            disabled={isRunning}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded-lg font-medium"
          >
            {isRunning ? 'Running Migration...' : 'Run Migration'}
          </button>
        </div>
        
        {status && (
          <div className="bg-gray-900 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-2">Status</h2>
            <p className="text-gray-300">{status}</p>
          </div>
        )}
        
        {results && (
          <div className="bg-gray-900 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Results</h2>
            <div className="space-y-2">
              <p>Total messages: {results.total}</p>
              <p>Messages migrated: {results.migrated}</p>
              <p>Messages already had reactions: {results.total - results.migrated}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}