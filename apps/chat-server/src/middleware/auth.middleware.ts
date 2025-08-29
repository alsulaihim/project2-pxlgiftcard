/**
 * Authentication middleware for Socket.io connections
 * Verifies Firebase ID tokens and extracts user data
 * As specified in chat-architecture.mdc
 */

import admin from 'firebase-admin';
import { Socket } from 'socket.io';

export interface AuthenticatedSocket extends Socket {
  data: {
    userId: string;
    email: string;
    tier: string;
    username?: string;
  };
}

/**
 * Authenticate Socket.io connections using Firebase ID tokens
 */
export const authenticateSocket = async (socket: Socket, next: (err?: Error) => void) => {
  const token = socket.handshake.auth.token;
  
  if (!token) {
    return next(new Error('No authentication token provided'));
  }
  
  try {
    // Verify Firebase ID token
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    // Get user's tier and profile from Firestore
    const userDoc = await admin.firestore()
      .collection('users')
      .doc(decodedToken.uid)
      .get();
    
    if (!userDoc.exists) {
      return next(new Error('User profile not found'));
    }
    
    const userData = userDoc.data();
    
    // Attach user data to socket
    socket.data = {
      userId: decodedToken.uid,
      email: decodedToken.email || '',
      tier: userData?.tier?.current || 'starter',
      username: userData?.username || ''
    };
    
    console.log(`🔐 Authenticated user: ${socket.data.userId} (${socket.data.tier})`);
    next();
    
  } catch (error) {
    console.error('Authentication failed:', error);
    next(new Error('Authentication failed'));
  }
};


