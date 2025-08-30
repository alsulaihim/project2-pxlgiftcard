'use client';

import { useEffect, useState } from 'react';
import { auth, db } from '@/lib/firebase-config';
import { collection, getDocs, query, where, limit } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

export default function TestFirebasePage() {
  const [authStatus, setAuthStatus] = useState<string>('Checking...');
  const [user, setUser] = useState<any>(null);
  const [firestoreTest, setFirestoreTest] = useState<string>('Not tested');
  const [conversationsTest, setConversationsTest] = useState<string>('Not tested');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    // Monitor auth state
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      console.log('Auth state changed:', currentUser);
      
      if (currentUser) {
        setUser({
          uid: currentUser.uid,
          email: currentUser.email,
          emailVerified: currentUser.emailVerified,
          metadata: currentUser.metadata
        });
        setAuthStatus(`Authenticated as: ${currentUser.email}`);
        
        // Test Firestore access
        await testFirestoreAccess(currentUser.uid);
      } else {
        setUser(null);
        setAuthStatus('Not authenticated');
        setFirestoreTest('Cannot test - not authenticated');
        setConversationsTest('Cannot test - not authenticated');
      }
    }, (error) => {
      console.error('Auth state error:', error);
      setAuthStatus(`Auth error: ${error.message}`);
      setError(error.message);
    });

    return () => unsubscribe();
  }, []);

  const testFirestoreAccess = async (userId: string) => {
    // Test 1: Try to read user document
    try {
      console.log('Testing user document access...');
      const userDoc = await getDocs(query(
        collection(db, 'users'),
        where('uid', '==', userId),
        limit(1)
      ));
      
      if (!userDoc.empty) {
        setFirestoreTest(`✅ Can read user document (${userDoc.docs[0].id})`);
      } else {
        setFirestoreTest('⚠️ User document not found');
      }
    } catch (error: any) {
      console.error('User document test failed:', error);
      setFirestoreTest(`❌ User document: ${error.message}`);
      setError(prev => prev + '\n' + error.message);
    }

    // Test 2: Try to read conversations
    try {
      console.log('Testing conversations access...');
      const conversationsQuery = query(
        collection(db, 'conversations'),
        where('members', 'array-contains', userId),
        limit(5)
      );
      
      const snapshot = await getDocs(conversationsQuery);
      setConversationsTest(`✅ Can read conversations (found ${snapshot.size})`);
    } catch (error: any) {
      console.error('Conversations test failed:', error);
      setConversationsTest(`❌ Conversations: ${error.message}`);
      setError(prev => prev + '\n' + error.message);
    }
  };

  const refreshToken = async () => {
    if (auth.currentUser) {
      try {
        const token = await auth.currentUser.getIdToken(true);
        console.log('Token refreshed:', token.substring(0, 20) + '...');
        alert('Token refreshed successfully!');
        // Retry tests
        await testFirestoreAccess(auth.currentUser.uid);
      } catch (error: any) {
        console.error('Token refresh failed:', error);
        alert(`Token refresh failed: ${error.message}`);
      }
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Firebase Authentication & Firestore Test</h1>
      
      <div className="space-y-4">
        <div className="p-4 bg-gray-100 rounded">
          <h2 className="font-semibold mb-2">Auth Status:</h2>
          <p className={authStatus.includes('Authenticated') ? 'text-green-600' : 'text-red-600'}>
            {authStatus}
          </p>
        </div>

        {user && (
          <div className="p-4 bg-blue-50 rounded">
            <h2 className="font-semibold mb-2">User Details:</h2>
            <pre className="text-sm">{JSON.stringify(user, null, 2)}</pre>
          </div>
        )}

        <div className="p-4 bg-gray-100 rounded">
          <h2 className="font-semibold mb-2">Firestore Tests:</h2>
          <p className="mb-2">User Document: {firestoreTest}</p>
          <p>Conversations: {conversationsTest}</p>
        </div>

        {error && (
          <div className="p-4 bg-red-50 rounded">
            <h2 className="font-semibold mb-2 text-red-700">Errors:</h2>
            <pre className="text-sm text-red-600 whitespace-pre-wrap">{error}</pre>
          </div>
        )}

        <div className="flex gap-4">
          <button
            onClick={refreshToken}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            disabled={!user}
          >
            Refresh Token
          </button>
          
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Reload Page
          </button>
        </div>

        <div className="p-4 bg-yellow-50 rounded">
          <h2 className="font-semibold mb-2">Debug Info:</h2>
          <p>Project ID: {process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}</p>
          <p>Auth Domain: {process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN}</p>
          <p>Check browser console for detailed logs</p>
        </div>
      </div>
    </div>
  );
}