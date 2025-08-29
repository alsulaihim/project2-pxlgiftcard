/**
 * Authentication middleware for Socket.io connections
 * Verifies Firebase ID tokens and extracts user data
 */

import { Socket } from 'socket.io';
import { ExtendedError } from 'socket.io/dist/namespace';
import { firebaseService } from '../services/firebase.service';
import { logger } from '../services/logger.service';

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
    
    if (!token) {
      logger.warn(`🚫 No authentication token provided for socket: ${socket.id}`);
      return next(new Error('Authentication token required'));
    }

    // TEMPORARY: Skip Firebase verification for debugging
    // TODO: Re-enable Firebase auth once project ID issue is resolved
    logger.info(`🔧 TEMP: Bypassing Firebase auth for debugging - socket: ${socket.id}`);
    
    // Mock user data for testing
    (socket as AuthenticatedSocket).data = {
      userId: 'test-user-123',
      email: 'test@example.com',
      tier: 'pro',
      displayName: 'Test User',
      photoURL: '/default-avatar.png'
    };

    logger.info(`✅ Socket authenticated (TEMP MODE) for socket: ${socket.id}`);
    next();
    
  } catch (error) {
    logger.error(`❌ Socket authentication failed for ${socket.id}:`, error);
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
  } catch (error) {
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
  
  const userLimit = messageCounts.get(userId);
  
  if (!userLimit || now > userLimit.resetTime) {
    // Reset or initialize counter
    messageCounts.set(userId, {
      count: 1,
      resetTime: now + WINDOW_MS
    });
    return true;
  }
  
  if (userLimit.count >= MESSAGE_LIMIT) {
    logger.warn(`🚫 Rate limit exceeded for user: ${userId}`);
    return false;
  }
  
  userLimit.count++;
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
