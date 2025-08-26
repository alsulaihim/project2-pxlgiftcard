# Firebase Setup Guide for PXL Perfect Platform

## Project Information
- **Firebase Project ID:** `pxl-perfect-1`
- **Project Console:** https://console.firebase.google.com/project/pxl-perfect-1/overview

## Required Setup Steps

### 1. Get Firebase Configuration
1. Go to [Firebase Console](https://console.firebase.google.com/project/pxl-perfect-1/settings/general)
2. Scroll down to "Your apps" section
3. Click "Add app" and select "Web" (</>) 
4. Register app with name "PXL Platform Web App"
5. Copy the Firebase configuration object

### 2. Create Environment Variables
Create a `.env.local` file in the project root with the following variables:

```bash
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=pxl-perfect-1.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=pxl-perfect-1
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=pxl-perfect-1.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id_here
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id_here
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id_here

# Existing Stripe Configuration
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_key

# Existing PayPal Configuration  
NEXT_PUBLIC_PAYPAL_CLIENT_ID=your_paypal_client_id

# Environment
NEXT_PUBLIC_ENV=development
```

### 3. Enable Authentication Providers
1. Go to [Authentication > Sign-in method](https://console.firebase.google.com/project/pxl-perfect-1/authentication/providers)
2. Enable the following providers:

#### Email/Password
- Click "Email/Password" 
- Enable "Email/Password"
- Enable "Email link (passwordless sign-in)" (optional)
- Save

#### Google
- Click "Google"
- Enable Google sign-in
- Set project support email
- Save

#### Apple  
- Click "Apple"
- Enable Apple sign-in
- Configure Apple Developer settings (requires Apple Developer account)
- Save

#### Facebook
- Click "Facebook" 
- Enable Facebook Login
- Add your Facebook App ID and App Secret
- Save

### 4. Configure Authorized Domains
1. Go to Authentication > Settings > Authorized domains
2. Add your domains:
   - `localhost` (for development)
   - Your production domain when ready

### 5. Test Authentication
1. Start the development server: `npm run dev -- -p 3009`
2. Navigate to `http://localhost:3009/auth/signup`
3. Test each authentication method:
   - Email/password registration
   - Google sign-in
   - Apple sign-in (if configured)
   - Facebook sign-in (if configured)

### 6. Verify Database Access
1. Go to [Firestore Database](https://console.firebase.google.com/project/pxl-perfect-1/firestore)
2. After successful registration, check that user documents are created in the `users` collection
3. Verify the document structure matches the PRD requirements

## Firestore Security Rules
The security rules have been deployed and include:
- Users can read/write their own profile data
- Public read access to giftcards and PXL currency data
- Admin-only write access to system data

## Next Steps
After completing authentication setup:
1. Implement giftcard marketplace
2. Add PXL currency management
3. Integrate Rocket.Chat for community features
4. Set up payment processing with Stripe/PayPal

## Troubleshooting
- If authentication fails, check the browser console for Firebase errors
- Ensure all environment variables are set correctly
- Verify Firebase project permissions and billing status
- Check that authentication providers are properly configured

## Support
- Firebase Documentation: https://firebase.google.com/docs
- Authentication Guide: https://firebase.google.com/docs/auth/web/start
