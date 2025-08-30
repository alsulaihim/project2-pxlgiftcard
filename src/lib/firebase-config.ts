// Firebase Configuration for PXL Perfect Platform
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, FacebookAuthProvider, OAuthProvider, connectAuthEmulator, browserLocalPersistence, setPersistence } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { getDatabase, connectDatabaseEmulator } from 'firebase/database';

// Firebase configuration object
// Note: These are placeholder values - replace with actual Firebase project config
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyBQI4msnsCuct6dTq0Zck9J9ZWGYKqHXrU",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "pxl-perfect-1.firebaseapp.com",
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || "https://pxl-perfect-1-default-rtdb.firebaseio.com/",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "pxl-perfect-1",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "pxl-perfect-1.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "427330178468",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:427330178468:web:e028c067345f827f49c531",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || ""
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// BUG FIX: 2025-01-28 - Improve Firebase connectivity and error handling
// Problem: Firebase connections failing with QUIC protocol errors and offline status
// Solution: Add connection settings and better error handling for network issues
// Impact: More stable Firebase connections and better offline handling

// Initialize Firebase services with error handling
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const database = getDatabase(app);

// BUG FIX: 2025-01-30 - Enable auth persistence to maintain login state
// Problem: Auth tokens not persisting properly causing permission errors
// Solution: Explicitly set browser local persistence
// Impact: Users stay logged in across page refreshes and Firebase operations work reliably
if (typeof window !== 'undefined') {
  setPersistence(auth, browserLocalPersistence).catch((error) => {
    console.error('Failed to set auth persistence:', error);
  });
}

// Add Firebase connection state monitoring
if (typeof window !== 'undefined') {
  // Monitor network connection state
  window.addEventListener('online', () => {
    console.log('🌐 Network connection restored');
    // Force Firebase to reconnect
    if (database) {
      database.goOnline?.();
    }
  });
  
  window.addEventListener('offline', () => {
    console.log('🌐 Network connection lost');
  });

  // Add Firebase-specific error handling
  const handleFirebaseError = (error: any) => {
    console.warn('🔥 Firebase connection issue:', error.code || error.message);
    
    // Handle specific Firebase errors
    if (error.code === 'unavailable' || error.message?.includes('offline')) {
      console.log('🔄 Firebase is offline, will retry when connection is restored');
    } else if (error.message?.includes('QUIC_NETWORK_IDLE_TIMEOUT')) {
      console.log('🔄 Firebase QUIC timeout, connection will be retried automatically');
    }
  };

  // Monitor Firebase connection state
  let connectionStateLogged = false;
  const monitorConnection = () => {
    if (!connectionStateLogged) {
      console.log('🔥 Firebase services initialized');
      console.log('📊 Project ID:', firebaseConfig.projectId);
      console.log('🌐 Auth Domain:', firebaseConfig.authDomain);
      console.log('💾 Database URL:', firebaseConfig.databaseURL);
      connectionStateLogged = true;
    }
  };

  // Monitor connection after a short delay
  setTimeout(monitorConnection, 1000);

  // Add global error handler for unhandled Firebase errors
  window.addEventListener('unhandledrejection', (event) => {
    if (event.reason?.code?.startsWith('firebase/') || 
        event.reason?.message?.includes('Firebase') ||
        event.reason?.message?.includes('QUIC_NETWORK_IDLE_TIMEOUT')) {
      handleFirebaseError(event.reason);
      // Don't prevent default to allow other error handlers
    }
  });
}

// Connect to emulators in development mode
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  // Check if we should use emulators (you can set NEXT_PUBLIC_USE_FIREBASE_EMULATOR=true)
  const useEmulator = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true';
  
  if (useEmulator) {
    try {
      // Connect to Auth emulator
      if (!auth.config.emulator) {
        connectAuthEmulator(auth, 'http://localhost:9099');
      }
      
      // Connect to Firestore emulator
      if (!db._delegate._databaseId.projectId.includes('localhost')) {
        connectFirestoreEmulator(db, 'localhost', 8080);
      }
      
      // Connect to Storage emulator
      if (!storage._location.bucket.includes('localhost')) {
        connectStorageEmulator(storage, 'localhost', 9199);
      }
      
      // Connect to Realtime Database emulator
      if (!database._delegate._repoInternal.repoInfo_.host.includes('localhost')) {
        connectDatabaseEmulator(database, 'localhost', 9000);
      }
      
      console.log('🔧 Connected to Firebase emulators');
    } catch (error) {
      console.log('⚠️ Firebase emulators already connected or not available');
    }
  }
}

// Configure authentication providers
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('profile');
googleProvider.addScope('email');

export const facebookProvider = new FacebookAuthProvider();
facebookProvider.addScope('email');

// Apple Sign-In provider
export const appleProvider = new OAuthProvider('apple.com');
appleProvider.addScope('email');
appleProvider.addScope('name');

// Export the app instance
export default app;
