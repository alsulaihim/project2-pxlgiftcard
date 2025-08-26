# Firebase Authentication Setup - Complete Guide

## ✅ COMPLETED: Firebase Project & Web App Configuration

I have successfully completed the following setup for you:

### Firebase Project Details
- **Project ID:** `pxl-perfect-1`
- **Web App ID:** `1:427330178468:web:e028c067345f827f49c531`
- **Web App Name:** "PXL Platform Web App"

### Firebase Configuration (Already Added to .env.local)
```bash
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyBQI4msnsCuct6dTq0Zck9J9ZWGYKqHXrU
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=pxl-perfect-1.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=pxl-perfect-1
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=pxl-perfect-1.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=427330178468
NEXT_PUBLIC_FIREBASE_APP_ID=1:427330178468:web:e028c067345f827f49c531
```

## 🔧 NEXT STEP: Enable Authentication Providers

You need to enable the authentication providers in the Firebase Console. Here are the direct links:

### 1. Enable Email/Password Authentication
**Link:** https://console.firebase.google.com/project/pxl-perfect-1/authentication/providers

**Steps:**
1. Click on "Email/Password"
2. Toggle "Enable" to ON
3. Optionally enable "Email link (passwordless sign-in)"
4. Click "Save"

### 2. Enable Google Sign-In
**Link:** https://console.firebase.google.com/project/pxl-perfect-1/authentication/providers

**Steps:**
1. Click on "Google"
2. Toggle "Enable" to ON
3. Set your project support email (your email address)
4. Click "Save"

### 3. Enable Apple Sign-In
**Link:** https://console.firebase.google.com/project/pxl-perfect-1/authentication/providers

**Steps:**
1. Click on "Apple"
2. Toggle "Enable" to ON
3. You'll need Apple Developer credentials (can skip for now if you don't have them)
4. Click "Save"

### 4. Enable Facebook Login
**Link:** https://console.firebase.google.com/project/pxl-perfect-1/authentication/providers

**Steps:**
1. Click on "Facebook"
2. Toggle "Enable" to ON
3. You'll need Facebook App ID and App Secret (can skip for now)
4. Click "Save"

## 🌐 Add Authorized Domains

**Link:** https://console.firebase.google.com/project/pxl-perfect-1/authentication/settings

**Steps:**
1. Go to Authentication > Settings > Authorized domains
2. Add these domains:
   - `localhost` (for development)
   - `127.0.0.1` (for development)
   - Your production domain when ready

## 🧪 Test Authentication

After enabling the providers, test the authentication:

1. **Start the server** (if not already running):
   ```bash
   npm run dev -- -p 3009
   ```

2. **Visit the signup page:**
   ```
   http://localhost:3009/auth/signup
   ```

3. **Test each method:**
   - ✅ Email/Password registration
   - ✅ Google Sign-In (after enabling)
   - ✅ Apple Sign-In (after enabling)
   - ✅ Facebook Login (after enabling)

## 🔍 Verify Database

After successful registration, check Firestore:
**Link:** https://console.firebase.google.com/project/pxl-perfect-1/firestore

You should see user documents created in the `users` collection with the structure defined in the PRD.

## 📱 What's Working Now

- ✅ Firebase project created and configured
- ✅ Web app registered with Firebase
- ✅ Environment variables set with real configuration
- ✅ Firestore database with security rules deployed
- ✅ Authentication pages created (signup/signin)
- ✅ User profile management system
- ✅ Dashboard for authenticated users

## 🚀 Ready to Test

Your authentication system is now ready! Just enable the providers in the Firebase Console using the links above, and you can start testing the complete authentication flow.

The system will:
1. Allow users to register with email/password or social login
2. Require completion of mandatory profile fields per PRD
3. Create user documents in Firestore with tier and wallet data
4. Redirect to dashboard after successful authentication
