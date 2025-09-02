// Firebase Auth Manager - Ensures proper auth state initialization
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './firebase-config';

class FirebaseAuthManager {
  private static instance: FirebaseAuthManager;
  private authReady: Promise<User | null>;
  private authReadyResolve: ((value: User | null) => void) | null = null;
  private currentUser: User | null = null;
  private authStateListeners: Set<(user: User | null) => void> = new Set();
  private isInitialized = false;

  private constructor() {
    // Create a promise that resolves when auth state is determined
    this.authReady = new Promise((resolve) => {
      this.authReadyResolve = resolve;
    });

    // Initialize auth state listener
    this.initializeAuthListener();
  }

  public static getInstance(): FirebaseAuthManager {
    if (!FirebaseAuthManager.instance) {
      FirebaseAuthManager.instance = new FirebaseAuthManager();
    }
    return FirebaseAuthManager.instance;
  }

  private initializeAuthListener(): void {
    console.log('🔐 Initializing Firebase Auth Manager...');
    
    // Set up persistent auth state listener
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log('🔐 Auth state changed:', {
        uid: user?.uid,
        email: user?.email,
        isInitialized: this.isInitialized
      });

      this.currentUser = user;

      // Resolve the authReady promise on first auth state
      if (!this.isInitialized) {
        this.isInitialized = true;
        if (this.authReadyResolve) {
          this.authReadyResolve(user);
          this.authReadyResolve = null;
        }
      }

      // Notify all listeners
      this.authStateListeners.forEach(listener => listener(user));
    }, (error) => {
      console.error('🔐 Auth state error:', error);
      // Still resolve the promise to prevent hanging
      if (!this.isInitialized && this.authReadyResolve) {
        this.isInitialized = true;
        this.authReadyResolve(null);
        this.authReadyResolve = null;
      }
    });

    // Store unsubscribe for cleanup if needed
    if (typeof window !== 'undefined') {
      (window as any).__authUnsubscribe = unsubscribe;
    }
  }

  /**
   * Wait for Firebase Auth to be fully initialized
   * This ensures we have determined whether a user is logged in or not
   */
  public async waitForAuth(): Promise<User | null> {
    const user = await this.authReady;
    console.log('🔐 Auth ready:', { 
      uid: user?.uid, 
      email: user?.email,
      hasToken: !!user?.getIdToken
    });
    return user;
  }

  /**
   * Get current user synchronously (may be null if not initialized)
   */
  public getCurrentUser(): User | null {
    return this.currentUser;
  }

  /**
   * Add auth state change listener
   */
  public addAuthStateListener(listener: (user: User | null) => void): () => void {
    this.authStateListeners.add(listener);
    // Call immediately with current state
    listener(this.currentUser);
    
    // Return unsubscribe function
    return () => {
      this.authStateListeners.delete(listener);
    };
  }

  /**
   * Ensure auth token is fresh and valid
   */
  public async ensureFreshToken(): Promise<string | null> {
    const user = await this.waitForAuth();
    if (!user) {
      console.log('🔐 No user for token refresh');
      return null;
    }

    try {
      // Force token refresh to ensure it's fresh
      const token = await user.getIdToken(true);
      console.log('🔐 Token refreshed successfully');
      return token;
    } catch (error) {
      console.error('🔐 Failed to refresh token:', error);
      return null;
    }
  }

  /**
   * Check if user is authenticated (async)
   */
  public async isAuthenticated(): Promise<boolean> {
    const user = await this.waitForAuth();
    return !!user;
  }

  /**
   * Get user ID (async, guaranteed to wait for auth)
   */
  public async getUserId(): Promise<string | null> {
    const user = await this.waitForAuth();
    return user?.uid || null;
  }
}

// Export singleton instance
export const authManager = FirebaseAuthManager.getInstance();