'use client';

import { useState } from 'react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDoc, Timestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase-config';

export default function SetupTestUserPage() {
  const [status, setStatus] = useState<string[]>([]);
  const [error, setError] = useState('');
  
  const addStatus = (msg: string) => {
    setStatus(prev => [...prev, msg]);
    console.log(msg);
  };

  const createTestUser = async () => {
    const email = 'testuser@example.com';
    const password = 'testpass123';
    
    try {
      addStatus('🔐 Attempting to create user...');
      
      // Try to create the user
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        addStatus(`✅ User created: ${userCredential.user.uid}`);
      } catch (createError: any) {
        if (createError.code === 'auth/email-already-in-use') {
          addStatus('ℹ️ User already exists, signing in...');
          const userCredential = await signInWithEmailAndPassword(auth, email, password);
          addStatus(`✅ Signed in: ${userCredential.user.uid}`);
        } else {
          throw createError;
        }
      }
      
      // Now set up the user profile in Firestore
      const user = auth.currentUser;
      if (!user) {
        throw new Error('No authenticated user after sign in');
      }
      
      addStatus('📝 Setting up user profile in Firestore...');
      
      // Check if user document exists
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        // Create user profile
        const userProfile = {
          uid: user.uid,
          email: user.email,
          username: 'testuser',
          profile: {
            firstName: 'Test',
            lastName: 'User',
            phone: '+1234567890',
            countryCode: '+1',
            country: 'US',
            region: 'California',
            gender: 'Male' as const,
            kycStatus: 'verified' as const
          },
          tier: {
            current: 'starter',
            pxlBalance: 0,
            nextTierThreshold: 1000,
            tierBenefits: {},
            progressHistory: []
          },
          wallets: {
            pxl: {
              balance: 100,
              lockedBalance: 0,
              totalEarned: 100,
              totalSpent: 0,
              totalSent: 0,
              totalReceived: 0
            },
            usd: {
              balance: 0
            }
          },
          preferences: {},
          timestamps: {
            created: Timestamp.now(),
            updated: Timestamp.now()
          }
        };
        
        await setDoc(userDocRef, userProfile);
        addStatus('✅ User profile created in Firestore');
      } else {
        addStatus('ℹ️ User profile already exists in Firestore');
      }
      
      // Create a test conversation
      addStatus('💬 Creating test conversation...');
      const conversationId = `direct_${user.uid}_testuserid`;
      const conversationRef = doc(db, 'conversations', conversationId);
      const conversationDoc = await getDoc(conversationRef);
      
      if (!conversationDoc.exists()) {
        await setDoc(conversationRef, {
          type: 'direct',
          members: [user.uid, 'testuserid'],
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        });
        addStatus('✅ Test conversation created');
      } else {
        addStatus('ℹ️ Test conversation already exists');
      }
      
      addStatus('🎉 Setup complete! You can now test the chat.');
      addStatus(`Email: ${email}`);
      addStatus(`Password: ${password}`);
      
    } catch (err: any) {
      console.error('Setup failed:', err);
      setError(err.message);
    }
  };

  const loginAsAdmin = async () => {
    try {
      addStatus('🔐 Logging in as admin...');
      await signInWithEmailAndPassword(auth, 'coco1@sample.com', 'admin1234');
      addStatus('✅ Logged in as admin');
    } catch (err: any) {
      setError(`Admin login failed: ${err.message}`);
    }
  };

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold mb-6">Setup Test User</h1>
        
        <div className="space-y-4">
          <button
            onClick={createTestUser}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Create Test User & Setup Profile
          </button>
          
          <button
            onClick={loginAsAdmin}
            className="w-full px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
          >
            Login as Admin (coco1@sample.com)
          </button>
          
          <button
            onClick={() => window.location.href = '/messages'}
            className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Go to Messages
          </button>
        </div>
        
        {status.length > 0 && (
          <div className="mt-6 p-4 bg-gray-100 rounded">
            <h3 className="font-semibold mb-2">Status:</h3>
            {status.map((msg, i) => (
              <div key={i} className="text-sm py-1">{msg}</div>
            ))}
          </div>
        )}
        
        {error && (
          <div className="mt-4 p-4 bg-red-50 rounded">
            <p className="text-red-600">{error}</p>
          </div>
        )}
        
        <div className="mt-6 p-4 bg-blue-50 rounded">
          <h3 className="font-semibold mb-2">Current Auth Status:</h3>
          <p className="text-sm">
            {auth.currentUser ? `Logged in as: ${auth.currentUser.email}` : 'Not logged in'}
          </p>
        </div>
      </div>
    </div>
  );
}