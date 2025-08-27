'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendEmailVerification,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { auth, db, googleProvider, facebookProvider, appleProvider } from '@/lib/firebase-config';
import { calculateTier } from '@/lib/pxl-currency';

// User profile interface based on PRD requirements
export interface UserProfile {
  firstName: string;              // Required
  lastName: string;               // Required
  phone: string;                  // Required, with country code
  countryCode: string;            // Auto-selected based on country/region
  country: string;                // Required, ISO 3166-1 alpha-2
  region: string;                 // Required
  gender: 'Male' | 'Female';      // Required, only two options per PRD
  dateOfBirth?: string;           // ISO date string
  avatarUrl?: string;             // Profile picture with tier ring overlay in chat
  kycStatus: 'pending' | 'verified' | 'rejected';
  kycDocuments?: any[];
}

export interface UserTier {
  current: 'starter' | 'rising' | 'pro' | 'pixlbeast' | 'pixlionaire';
  pxlBalance: number;             // Current PXL balance
  nextTierThreshold?: number;     // PXL needed for next tier
  tierBenefits: any;
  progressHistory: any[];
}

export interface UserWallets {
  pxl: {
    balance: number;
    lockedBalance: number;        // For pending transactions
    totalEarned: number;          // Total PXL earned (purchases + transfers received)
    totalSpent: number;           // Total PXL spent on giftcards
    totalSent: number;            // Total PXL sent to other users
    totalReceived: number;        // Total PXL received from other users
  };
  usd: {
    balance: number;              // Store credit balance
  };
}

export interface PlatformUser {
  uid: string;                    // Firebase Auth UID
  email: string;                  // Required, unique
  username: string;               // @username format, required, unique, used in Rocket.Chat
  profile: UserProfile;           // Extended profile with all mandatory fields
  tier: UserTier;
  wallets: UserWallets;
  preferences: any;
  rocketchat?: any;               // Enhanced chat integration with SSO and profile sync
  timestamps: {
    created: any; // Firestore Timestamp
    updated: any; // Firestore Timestamp
  };
}

interface AuthContextType {
  user: User | null;
  platformUser: PlatformUser | null;
  loading: boolean;
  isAdmin: boolean;
  signUp: (email: string, password: string) => Promise<User>;
  signIn: (email: string, password: string) => Promise<User>;
  signInWithGoogle: () => Promise<User>;
  signInWithFacebook: () => Promise<User>;
  signInWithApple: () => Promise<User>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateUserProfile: (profileData: Partial<UserProfile>) => Promise<void>;
  setupUserProfile: (username: string, profileData: UserProfile) => Promise<void>;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Admin email list - in production, this should come from Firestore admin-users collection
const ADMIN_EMAILS = ['coco1@sample.com'];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [platformUser, setPlatformUser] = useState<PlatformUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // Load platform user data from Firestore
  const loadPlatformUser = async (firebaseUser: User) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data() as PlatformUser;
        
        // Recalculate tier based on actual PXL balance
        const currentBalance = userData.wallets?.pxl?.balance || 0;
        const correctTier = calculateTier(currentBalance);
        
        // If tier is incorrect, update it
        if (userData.tier.current !== correctTier) {
          console.log(`Tier mismatch detected. Current: ${userData.tier.current}, Should be: ${correctTier}`);
          
          // Update in Firestore
          await updateDoc(doc(db, 'users', firebaseUser.uid), {
            'tier.current': correctTier,
            'tier.pxlBalance': currentBalance,
            'timestamps.updated': Timestamp.now()
          });
          
          // Update local data
          userData.tier.current = correctTier;
          userData.tier.pxlBalance = currentBalance;
        }
        
        setPlatformUser(userData);
        
        // Check if user is admin
        setIsAdmin(ADMIN_EMAILS.includes(userData.email));
      } else {
        // User exists in Firebase Auth but not in Firestore - needs profile setup
        setPlatformUser(null);
        setIsAdmin(false);
      }
    } catch (error) {
      console.error('Error loading platform user:', error);
      setPlatformUser(null);
    }
  };

  // Monitor authentication state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser) {
        await loadPlatformUser(firebaseUser);
      } else {
        setPlatformUser(null);
        setIsAdmin(false);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Sign up with email and password
  const signUp = async (email: string, password: string): Promise<User> => {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    
    // Send email verification
    await sendEmailVerification(result.user);
    
    return result.user;
  };

  // Sign in with email and password
  const signIn = async (email: string, password: string): Promise<User> => {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return result.user;
  };

  // Sign in with Google
  const signInWithGoogle = async (): Promise<User> => {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  };

  // Sign in with Facebook
  const signInWithFacebook = async (): Promise<User> => {
    const result = await signInWithPopup(auth, facebookProvider);
    return result.user;
  };

  // Sign in with Apple
  const signInWithApple = async (): Promise<User> => {
    const result = await signInWithPopup(auth, appleProvider);
    return result.user;
  };

  // Logout
  const logout = async (): Promise<void> => {
    await signOut(auth);
    setIsAdmin(false);
  };

  // Reset password
  const resetPassword = async (email: string): Promise<void> => {
    await sendPasswordResetEmail(auth, email);
  };
  
  // Refresh user data from Firestore
  const refreshUserData = async (): Promise<void> => {
    if (user) {
      await loadPlatformUser(user);
    }
  };

  // Setup user profile (called after registration)
  // Helper function to remove undefined values from objects
  const removeUndefinedValues = (obj: any): any => {
    const cleaned: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          cleaned[key] = removeUndefinedValues(value);
        } else {
          cleaned[key] = value;
        }
      }
    }
    return cleaned;
  };

  const setupUserProfile = async (username: string, profileData: UserProfile): Promise<void> => {
    if (!user) throw new Error('No authenticated user');

    // Clean profile data to remove undefined values
    const cleanedProfileData = removeUndefinedValues(profileData);

    // Create initial platform user data
    const newPlatformUser: PlatformUser = {
      uid: user.uid,
      email: user.email!,
      username,
      profile: cleanedProfileData,
      tier: {
        current: 'starter',
        pxlBalance: 0,
        nextTierThreshold: 1000, // Example threshold for rising tier
        tierBenefits: {},
        progressHistory: []
      },
      wallets: {
        pxl: {
          balance: 0,
          lockedBalance: 0,
          totalEarned: 0,
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

    // Save to Firestore - clean the data before saving
    const dataToSave = removeUndefinedValues(newPlatformUser);
    await setDoc(doc(db, 'users', user.uid), dataToSave);
    
    // Update Firebase Auth profile
    await updateProfile(user, {
      displayName: `${profileData.firstName} ${profileData.lastName}`
    });

    // Set the platform user state immediately
    setPlatformUser(newPlatformUser);
    
    // Force reload platform user data to ensure consistency
    await loadPlatformUser(user);
  };

  // Update user profile
  const updateUserProfile = async (profileData: Partial<UserProfile>): Promise<void> => {
    if (!user || !platformUser) throw new Error('No authenticated user');

    // Clean profile data to remove undefined values
    const cleanedProfileData = removeUndefinedValues(profileData);
    const updatedProfile = { ...platformUser.profile, ...cleanedProfileData };
    
    const updatedUser = {
      ...platformUser,
      profile: updatedProfile,
      timestamps: {
        ...platformUser.timestamps,
        updated: Timestamp.now()
      }
    };

    // Clean the entire user object before saving
    const cleanedUpdatedUser = removeUndefinedValues(updatedUser);

    await updateDoc(doc(db, 'users', user.uid), cleanedUpdatedUser);
    setPlatformUser(updatedUser);
  };

  const value: AuthContextType = {
    user,
    platformUser,
    loading,
    isAdmin,
    signUp,
    signIn,
    signInWithGoogle,
    signInWithFacebook,
    signInWithApple,
    logout,
    resetPassword,
    updateUserProfile,
    setupUserProfile,
    refreshUserData
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
