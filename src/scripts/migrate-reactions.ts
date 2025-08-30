/**
 * Migration script to add reactions field to all existing messages
 * Run this once to fix messages that were created before reactions were implemented
 */

import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase-config';

async function migrateReactions() {
  console.log('🔄 Starting reactions migration...');
  
  try {
    // Get all conversations
    const conversationsSnapshot = await getDocs(collection(db, 'conversations'));
    let totalMessages = 0;
    let migratedMessages = 0;
    
    for (const convDoc of conversationsSnapshot.docs) {
      const conversationId = convDoc.id;
      console.log(`📂 Processing conversation: ${conversationId}`);
      
      // Get all messages in this conversation
      const messagesSnapshot = await getDocs(
        collection(db, 'conversations', conversationId, 'messages')
      );
      
      for (const msgDoc of messagesSnapshot.docs) {
        totalMessages++;
        const messageData = msgDoc.data();
        
        // Check if reactions field exists
        if (!('reactions' in messageData)) {
          console.log(`  ➕ Adding reactions field to message: ${msgDoc.id}`);
          
          // Add reactions field using setDoc with merge
          await setDoc(
            doc(db, 'conversations', conversationId, 'messages', msgDoc.id),
            { reactions: {} },
            { merge: true }
          );
          
          migratedMessages++;
        } else {
          console.log(`  ✓ Message ${msgDoc.id} already has reactions field`);
        }
      }
    }
    
    console.log('✅ Migration complete!');
    console.log(`📊 Stats: ${migratedMessages}/${totalMessages} messages migrated`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

// Run the migration
migrateReactions();