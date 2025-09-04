import * as admin from 'firebase-admin';
import { NextRequest } from 'next/server';

// Initialize Firebase Admin SDK
let firebaseAdminInitialized = false;

try {
  if (!admin.apps.length) {
    // Check if service account environment variables are available
    const hasServiceAccount = process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL;
    
    console.log('🔧 Initializing Firebase Admin SDK...');
    console.log('📋 Has service account:', hasServiceAccount);
    console.log('📋 Project ID:', process.env.FIREBASE_PROJECT_ID);
    
    if (hasServiceAccount) {
      const serviceAccount = {
        type: "service_account",
        project_id: process.env.FIREBASE_PROJECT_ID || "pxl-perfect-1",
        private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
        private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        client_id: process.env.FIREBASE_CLIENT_ID,
        auth_uri: "https://accounts.google.com/o/oauth2/auth",
        token_uri: "https://oauth2.googleapis.com/token",
        auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
        client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.FIREBASE_CLIENT_EMAIL}`,
        universe_domain: "googleapis.com"
      };

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
        databaseURL: process.env.FIREBASE_DATABASE_URL || "https://pxl-perfect-1-default-rtdb.firebaseio.com"
      });
      
      firebaseAdminInitialized = true;
      console.log('✅ Firebase Admin SDK initialized with service account');
    } else {
      console.log('⚠️ Service account not found, cannot initialize Firebase Admin SDK');
      console.log('📋 FIREBASE_PRIVATE_KEY exists:', !!process.env.FIREBASE_PRIVATE_KEY);
      console.log('📋 FIREBASE_CLIENT_EMAIL exists:', !!process.env.FIREBASE_CLIENT_EMAIL);
    }
  } else {
    firebaseAdminInitialized = true;
    console.log('✅ Firebase Admin SDK already initialized');
  }
} catch (error) {
  console.error('❌ Failed to initialize Firebase Admin SDK:', error);
  firebaseAdminInitialized = false;
}

// Export admin services only if initialized
export const adminAuth = firebaseAdminInitialized ? admin.auth() : null;
export const adminDb = firebaseAdminInitialized ? admin.firestore() : null;

/**
 * Verify Firebase ID token from request headers
 */
export async function verifyAuthToken(request: NextRequest): Promise<admin.auth.DecodedIdToken | null> {
  try {
    if (!adminAuth) {
      console.error('❌ Firebase Admin SDK not initialized - cannot verify tokens');
      return null;
    }

    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ No valid Authorization header found');
      return null;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    console.log(`🔐 Verifying Firebase token: ${token.substring(0, 20)}...`);
    
    const decodedToken = await adminAuth.verifyIdToken(token);
    console.log(`✅ Token verified for user: ${decodedToken.uid}`);
    
    return decodedToken;
  } catch (error) {
    console.error('❌ Token verification failed:', error);
    return null;
  }
}

/**
 * Get authenticated user from request
 */
export async function getAuthenticatedUser(request: NextRequest): Promise<{ uid: string; email?: string } | null> {
  const decodedToken = await verifyAuthToken(request);
  if (!decodedToken) {
    return null;
  }

  return {
    uid: decodedToken.uid,
    email: decodedToken.email
  };
}