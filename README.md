# Giftcard + PXL Platform

A modern web platform for purchasing gift cards with a unique PXL currency system, featuring tier-based rewards, real-time exchange rates, and comprehensive payment integration.

![Platform Version](https://img.shields.io/badge/version-1.0.0-blue)
![Next.js](https://img.shields.io/badge/Next.js-14.0-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)
![Firebase](https://img.shields.io/badge/Firebase-10.7-orange)
![License](https://img.shields.io/badge/license-MIT-green)

## 🚀 Features

### Core Features
- **Dual Currency System**: Purchase with USD or PXL cryptocurrency
- **5-Tier Progression System**: Starter → Rising → Pro → Pixlbeast → Pixlionaire
- **Real-time Exchange Rates**: Dynamic PXL/USD conversion with live updates
- **Gift Card Marketplace**: Major brands with instant digital delivery
- **Dual Payment Processing**: Stripe + PayPal integration
- **User Profiles**: Complete profile management with avatar upload
- **Social Authentication**: Google, Apple, and Facebook login support
- **PXL Transfers**: Send PXL to other users via username or email

### Technical Features
- **Dark Theme UI**: Vercel-inspired design system
- **Real-time Updates**: WebSocket integration for live data
- **Mobile-First**: Fully responsive design
- **Firebase Integration**: Auth, Firestore, Storage
- **Type-Safe**: Full TypeScript implementation
- **Modern Stack**: Next.js 14 with App Router

## 📱 Screenshots

<details>
<summary>View Screenshots</summary>

### Dashboard
- Modern dashboard with PXL exchange rate chart
- Tier progress visualization
- Quick stats overview
- Buy Again section for frequent purchases

### Marketplace
- Browse gift cards by category
- Dual pricing display (USD/PXL)
- Real-time tier discounts
- Instant digital delivery

### Profile Management
- Complete profile with all required fields
- Avatar upload with optimization
- Country selection with flags
- KYC status tracking

</details>

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS, Custom Dark Theme
- **Backend**: Firebase (Auth, Firestore, Storage)
- **Payments**: Stripe, PayPal
- **State Management**: React Context + Zustand
- **Charts**: Custom SVG Sparkline Component
- **Icons**: Lucide React

## 🚦 Getting Started

### Prerequisites

- Node.js 18.18.0 or higher
- npm or pnpm
- Firebase account
- Stripe account (for production)
- PayPal account (for production)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
cd YOUR_REPO_NAME
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env.local` file:
```bash
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Use Firebase Emulator (set to false for production)
NEXT_PUBLIC_USE_FIREBASE_EMULATOR=true

# Payment Configuration (optional for development)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
NEXT_PUBLIC_PAYPAL_CLIENT_ID=your_paypal_client_id
```

4. Start the development server:
```bash
npm run dev
```

5. Open [http://localhost:3009](http://localhost:3009)

### Firebase Emulator Setup (Optional)

For local development without a Firebase project:

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Start emulators
npm run firebase:emulators
```

## 📝 Documentation

Comprehensive documentation is available in the `.cursor/rules/` directory:

- **[Product Requirements Document (PRD)](/.cursor/rules/prd.mdc)**: Complete product specifications
- **[Architecture Document](/.cursor/rules/architecture.mdc)**: Technical architecture and design decisions
- **[UI/UX Specification](/.cursor/rules/uiux.mdc)**: Design system and user experience guidelines
- **[API Documentation](/.cursor/rules/api.mdc)**: Complete API reference
- **[Payment Testing Guide](/PAYMENT_TESTING.md)**: How to test payment flows

## 🧪 Testing

### Payment Testing

The platform includes test credentials for development:

**Stripe Test Cards**:
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`

**PayPal Sandbox**:
- Uses PayPal's default sandbox environment
- No additional configuration needed for testing

See [PAYMENT_TESTING.md](./PAYMENT_TESTING.md) for detailed testing instructions.

## 🚀 Deployment

### Vercel Deployment (Recommended)

1. Push to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

### Firebase Deployment

Deploy security rules and functions:

```bash
firebase deploy --only firestore:rules
firebase deploy --only storage:rules
firebase deploy --only functions
```

## 📊 Project Structure

```
project2-pxlgiftcard/
├── src/
│   ├── app/              # Next.js app directory
│   ├── components/       # React components
│   ├── contexts/        # React contexts
│   ├── lib/            # Utilities and config
│   └── data/           # Static data
├── public/             # Static assets
├── .cursor/rules/      # Documentation
└── firebase/          # Firebase config
```

## 🔐 Security

- Firebase Security Rules implemented
- PCI compliance for payment processing
- Environment variables for sensitive data
- Input validation and sanitization
- HTTPS enforced in production

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Design inspired by [Vercel](https://vercel.com)
- Icons by [Lucide](https://lucide.dev)
- Built with [Next.js](https://nextjs.org)

## 📞 Support

For support, email support@pxlgiftcard.com or open an issue in this repository.

---

**Note**: This is a demonstration project. For production use, ensure you have proper payment processing agreements and comply with all relevant regulations.