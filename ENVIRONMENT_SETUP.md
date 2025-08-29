# Environment Setup Guide

## Required Environment Variables

Create a `.env.local` file in the root directory with the following variables:

### Firebase Configuration
```bash
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef
```

### Firebase Admin SDK (for server-side operations)
```bash
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
```

### Payment Processing
```bash
# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# PayPal
NEXT_PUBLIC_PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_CLIENT_SECRET=your_paypal_client_secret
```

### AI Support Chat
```bash
OPENAI_API_KEY=sk-...
```

### Socket.io Configuration (Optional)
The P2P chat system can work in two modes:

1. **Firestore-only mode** (default): Real-time messaging via Firestore listeners
2. **Socket.io mode**: Enhanced real-time messaging with WebSocket connections

To enable Socket.io mode, add:
```bash
NEXT_PUBLIC_SOCKET_URL=http://localhost:8080
# or for production:
# NEXT_PUBLIC_SOCKET_URL=https://your-socket-server.run.app
```

**Note**: If `NEXT_PUBLIC_SOCKET_URL` is not set, the chat system will automatically use Firestore-only mode, which provides reliable messaging without requiring a separate Socket.io server.

### Development Environment
```bash
NODE_ENV=development
NEXT_PUBLIC_ENV=development
```

## Chat System Architecture

The chat system uses a **hybrid architecture**:

- **Primary**: Firestore real-time listeners for reliable message delivery
- **Enhancement**: Socket.io for sub-200ms message delivery when available
- **Fallback**: Automatic fallback to Firestore-only mode if Socket.io server is unavailable

This ensures the chat system works reliably even without the Socket.io server running.

## Optional Services

### Email Configuration
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### SMS Configuration
```bash
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1234567890
```

## Getting Started

1. Copy the required environment variables to your `.env.local` file
2. Replace placeholder values with your actual configuration
3. Start the development server: `npm run dev`
4. The chat system will automatically detect available services and configure itself accordingly


