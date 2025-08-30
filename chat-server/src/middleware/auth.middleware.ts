/**
 * Authentication middleware for Socket.io connections
 * Verifies Firebase ID tokens and extracts user data
 */

import { Socket } from 'socket.io';
import { ExtendedError } from 'socket.io/dist/namespace';
import { firebaseService } from '../services/firebase.service';
import { logger } from '../services/logger.service';

// Declare global variable for test user counter
declare global {
  var testUserCounter: number | undefined;
}

export interface AuthenticatedSocket extends Socket {
  data: {
    userId: string;
    email: string;
    tier: string;
    displayName?: string;
    photoURL?: string;
  };
}

/**
 * Socket.io authentication middleware
 * Verifies Firebase ID token and attaches user data to socket
 */
export const authenticateSocket = async (
  socket: Socket, 
  next: (err?: ExtendedError) => void
): Promise<void> => {
  try {
    const token = socket.handshake.auth?.token;
    
    logger.info(`🔐 Authentication attempt for socket: ${socket.id}`);
    
    if (!token) {
      logger.warn(`🚫 No authentication token provided for socket: ${socket.id}`);
      return next(new Error('Authentication token required'));
    }

    logger.info(`🔑 Token received (first 20 chars): ${token.substring(0, 20)}...`);

    // Verify Firebase auth token
    const decodedToken = await firebaseService.verifyIdToken(token);
    
    logger.info(`✅ Token verified for user: ${decodedToken.uid}`);
    
    // Try to get user profile from Firestore, but don't fail if it doesn't work
    let userProfile = null;
    try {
      userProfile = await firebaseService.getUserData(decodedToken.uid);
      logger.info(`📋 User profile fetched: ${userProfile ? 'Found' : 'Not found'}`);
    } catch (profileError: any) {
      logger.warn(`⚠️ Could not fetch user profile from Firestore:`, profileError.message);
      logger.warn(`⚠️ Using data from ID token instead`);
    }
    
    (socket as AuthenticatedSocket).data = {
      userId: decodedToken.uid,
      email: decodedToken.email || '',
      tier: userProfile?.tier || 'starter',
      displayName: userProfile?.displayName || decodedToken.name || decodedToken.email?.split('@')[0] || 'User',
      photoURL: userProfile?.photoURL || decodedToken.picture || '/default-avatar.png'
    };
    
    logger.info(`✅ Socket authenticated via Firebase for user: ${decodedToken.uid}`);
    next();
  } catch (error: any) {
    logger.error(`❌ Socket authentication failed for ${socket.id}:`, error);
    logger.error(`❌ Error details:`, {
      message: error.message,
      code: error.code,
      stack: error.stack?.split('\n').slice(0, 3).join('\n')
    });
    next(new Error('Authentication failed'));
  }
};

/**
 * Middleware to check if user is member of conversation
 */
export const checkConversationMembership = async (
  socket: AuthenticatedSocket,
  conversationId: string
): Promise<boolean> => {
  try {
    const conversation = await firebaseService.getConversation(conversationId);
    const isMember = conversation.members?.includes(socket.data.userId);
    
    if (!isMember) {
      logger.warn(`🚫 User ${socket.data.userId} not a member of conversation: ${conversationId}`);
    }
    
    return isMember;
  } catch (error: any) {
    // If Firestore is not accessible, allow the operation for authenticated users
    if (error.code === 7 || error.message?.includes('PERMISSION_DENIED')) {
      logger.warn(`⚠️ Firestore permission denied, allowing authenticated user ${socket.data.userId} to proceed`);
      return true; // Allow authenticated users when Firestore is unavailable
    }
    logger.error(`❌ Failed to check conversation membership:`, error);
    return false;
  }
};

/**
 * Rate limiting middleware for message sending
 */
const messageCounts = new Map<string, { count: number; resetTime: number }>();
const MESSAGE_LIMIT = 60; // messages per minute
const WINDOW_MS = 60 * 1000; // 1 minute

export const rateLimitMessages = (socket: AuthenticatedSocket): boolean => {
  const userId = socket.data.userId;
  const now = Date.now();
  
  let userLimit = messageCounts.get(userId);
  
  if (!userLimit || now > userLimit.resetTime) {
    // Reset or initialize counter
    userLimit = {
      count: 1,
      resetTime: now + WINDOW_MS
    };
    messageCounts.set(userId, userLimit);
    logger.debug(`📊 Rate limit initialized for ${userId}: 1/${MESSAGE_LIMIT}`);
    return true;
  }
  
  if (userLimit.count >= MESSAGE_LIMIT) {
    logger.warn(`🚫 Rate limit exceeded for user: ${userId} (${userLimit.count}/${MESSAGE_LIMIT})`);
    return false;
  }
  
  userLimit.count++;
  messageCounts.set(userId, userLimit); // Update the map with new count
  logger.debug(`📊 Rate limit for ${userId}: ${userLimit.count}/${MESSAGE_LIMIT}`);
  return true;
};

/**
 * Clean up expired rate limit entries
 */
setInterval(() => {
  const now = Date.now();
  for (const [userId, limit] of messageCounts.entries()) {
    if (now > limit.resetTime) {
      messageCounts.delete(userId);
    }
  }
}, WINDOW_MS);

export default authenticateSocket;
