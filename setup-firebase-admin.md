# Setting Up Firebase Admin SDK for Chat Server

## Quick Setup Guide

### Step 1: Download Service Account Key
1. Go to [Firebase Console](https://console.firebase.google.com/project/pxl-perfect-1/settings/serviceaccounts/adminsdk)
2. Click "Generate New Private Key"
3. Save the downloaded JSON file as `chat-server/serviceAccountKey.json`

### Step 2: Update Environment File
Add this line to `chat-server/.env`:
```
GOOGLE_APPLICATION_CREDENTIALS="./serviceAccountKey.json"
```

### Step 3: Restart Chat Server
The server will automatically detect the credentials and enable full Firebase features.

## Alternative: Use Environment Variables

If you prefer not to use a JSON file, extract these values from the downloaded JSON:

```env
# Add to chat-server/.env
FIREBASE_PROJECT_ID=pxl-perfect-1
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n[YOUR_PRIVATE_KEY_HERE]\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=[YOUR_SERVICE_ACCOUNT_EMAIL]
```

## What This Fixes
- ✅ Stable Socket.io connections
- ✅ Proper user authentication
- ✅ Real-time typing indicators
- ✅ Instant message delivery
- ✅ No more TEMP mode warnings

## Current Status
The server is currently running in TEMP mode with limited functionality:
- Messages work via Firestore fallback
- Typing indicators don't work reliably
- Socket connections are unstable

Once you add the credentials, all real-time features will work properly.