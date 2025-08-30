'use client';

import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase-config';
import { useRouter } from 'next/navigation';

export default function QuickLoginPage() {
  const [email, setEmail] = useState('coco1@sample.com');
  const [password, setPassword] = useState('admin1234');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async () => {
    setStatus('Logging in...');
    setError('');
    
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      console.log('Login successful:', result.user);
      setStatus(`✅ Logged in as: ${result.user.email}`);
      
      // Wait a moment for auth to propagate
      setTimeout(() => {
        router.push('/messages');
      }, 1000);
    } catch (err: any) {
      console.error('Login failed:', err);
      setError(`❌ Login failed: ${err.message}`);
      setStatus('');
    }
  };

  const checkAuthStatus = () => {
    const user = auth.currentUser;
    if (user) {
      setStatus(`Currently logged in as: ${user.email}`);
    } else {
      setStatus('Not logged in');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
        <div>
          <h2 className="text-3xl font-bold text-center">Quick Login</h2>
          <p className="text-center text-gray-600 mt-2">Test Firebase Authentication</p>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
              placeholder="Enter email"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
              placeholder="Enter password"
            />
          </div>
          
          <button
            onClick={handleLogin}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
          >
            Login
          </button>
          
          <button
            onClick={checkAuthStatus}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            Check Auth Status
          </button>
        </div>
        
        {status && (
          <div className="p-4 bg-green-50 rounded-md">
            <p className="text-green-800">{status}</p>
          </div>
        )}
        
        {error && (
          <div className="p-4 bg-red-50 rounded-md">
            <p className="text-red-800">{error}</p>
          </div>
        )}
        
        <div className="text-sm text-gray-500 text-center">
          <p>Default credentials:</p>
          <p>Email: coco1@sample.com</p>
          <p>Password: admin1234</p>
        </div>
      </div>
    </div>
  );
}