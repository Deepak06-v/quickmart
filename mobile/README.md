# QuickMart Mobile Application (Android-First, Premium iOS-Inspired UI)

The official customer mobile application for QuickMart Hyperlocal Grocery Shopping and Delivery. Built with React Native, Expo 52, TypeScript, Expo Router, TanStack Query, and Zustand.

---

## Key Features

1. **iOS-Inspired Clean Design on Native Android**:
   - Spacious minimalist layouts with subtle soft elevations and card radius.
   - Smooth active state transitions and native Android back-button compatibility.
   - Carefully tuned touch targets and typography.

2. **Hyperlocal Geofencing & Location Permissions**:
   - Location permission requested on first launch.
   - Coordinates checked against backend-configured rural delivery zones.
   - Manual area and village selection fallback if GPS permission is denied.
   - Browsing permitted outside delivery zone, with checkout validation.

3. **Product Discovery & Shopping Experience**:
   - Category filtering with animated category pills.
   - Super Saver Offers section with discount percentage badges and strikethroughs.
   - Daily Essentials recommendation carousel.
   - 2-Column responsive grid with instant search debounce.
   - Interactive Add to Cart buttons that morph into `[ - ] count [ + ]` quantity controllers.

4. **Guest Shopping & Cart Persistence**:
   - Full browsing and cart manipulation without forced login.
   - Local persistence via `@react-native-async-storage/async-storage`.
   - Seamless cart merging when customer signs in.

5. **Phone-Number-Based Authentication**:
   - Mobile number + SMS OTP verification.
   - Automatic rate limiting and resend timers.
   - Secure token storage via `expo-secure-store`.

6. **Cash on Delivery (COD) Only with 2nd OTP Verification**:
   - Payment method restricted strictly to Cash on Delivery.
   - Dedicated separate second OTP generated and verified specifically for confirming the order.
   - Backend recalculates and enforces prices, discounts, and delivery charges.

7. **Active Order Tracking**:
   - Live status progression banner directly in the Cart tab.
   - Detailed timeline tracking (`Order Placed` ➔ `Order Accepted` ➔ `Preparing Your Order` ➔ `Out for Delivery` ➔ `Delivered`).
   - Illustrative route visualization with store fulfillment hub, customer address, and vehicle icon (clearly labeled illustrative, not fake live GPS).
   - Order cancellation option before store acceptance.

8. **Profile & Account Management**:
   - Profile photo selection and upload using `expo-image-picker` with initials fallback.
   - Saved addresses management.
   - Full account deletion workflow with OTP verification.

---

## Directory Structure

```text
mobile/
├── app/
│   ├── (tabs)/
│   │   ├── _layout.tsx      # 3 Primary bottom tabs: Shop, Cart, Account
│   │   ├── index.tsx        # Home shopping catalog
│   │   ├── cart.tsx         # Cart & Active order progress
│   │   └── profile.tsx      # Customer account & options
│   ├── category/
│   │   └── [slug].tsx       # Category product listings
│   ├── product/
│   │   └── [id].tsx         # Product details & related items
│   ├── orders/
│   │   ├── index.tsx        # Order history
│   │   └── [id].tsx         # Order tracking & illustrative map
│   ├── auth/
│   │   └── index.tsx        # Phone OTP login and signup
│   ├── legal/
│   │   ├── privacy.tsx      # Privacy Policy
│   │   ├── terms.tsx        # Terms & Conditions
│   │   └── about.tsx        # Support & App details
│   ├── checkout.tsx         # Delivery address & server revalidation
│   ├── order-otp.tsx        # 2nd OTP verification for COD
│   ├── order-success.tsx    # Order confirmed screen
│   ├── search.tsx           # Instant search modal
│   └── _layout.tsx          # Root provider stack
├── src/
│   ├── api/client.ts        # Typed fetch client with Bearer auth injection
│   ├── components/          # Reusable UI widgets (ProductCard, Header, IllustrativeMap, etc.)
│   ├── store/               # Zustand stores (cartStore, authStore, locationStore)
│   ├── theme/               # iOS-inspired colors, typography, spacing, shadows
│   ├── types/               # TypeScript interfaces
│   └── utils/storage.ts     # Expo SecureStore & AsyncStorage helpers
├── assets/                  # App icon, splash, adaptive icon
├── app.json                 # Expo configuration & Android permissions
├── package.json
└── tsconfig.json
```

---

## Getting Started

### 1. Install Dependencies

```bash
cd mobile
npm install
```

### 2. Configure Environment Variables

Create `.env` based on `.env.example`:

```bash
cp .env.example .env
```

Set `EXPO_PUBLIC_API_URL` according to your test environment:
- **Android Emulator**: `http://10.0.2.2:5000/api` (points to host localhost)
- **Physical Android Phone (via Expo Go on Wi-Fi)**: `http://<YOUR_COMPUTER_LOCAL_IP>:5000/api` (e.g. `http://192.168.1.15:5000/api`)
- **Web / iOS Simulator**: `http://localhost:5000/api`

### 3. Start the Application

```bash
npm start
```

Press `a` in the terminal to launch on a connected Android device or emulator.

---

## Play Store Readiness & Android Release Build

### 1. Application Identity Configuration (`app.json`)
- **Package ID**: `com.quickmart.app`
- **Application Name**: QuickMart
- **Version**: 1.0.0 (Version code 1)
- **Permissions**:
  - `ACCESS_COARSE_LOCATION` & `ACCESS_FINE_LOCATION` (with user disclosure)
  - `CAMERA` & `READ_EXTERNAL_STORAGE` (for optional profile photo)

### 2. Mandatory Policy Requirements Met
- **Privacy Policy Screen**: Implemented at `/legal/privacy` (explains location usage, OTP handling, and data retention).
- **Account Deletion**: Functional in-app account deletion workflow verified via phone OTP with personal data purging.
- **Support Contact**: Available at `/legal/about` with one-tap dialer and email links.

### 3. Generating Production Android Build (AAB / APK)

To build a production Android App Bundle (AAB) for Google Play Console submission:

```bash
# Install EAS CLI globally if not already installed
npm install -g eas-cli

# Log in to Expo account
eas login

# Configure and build Android App Bundle
eas build -p android --profile production
```

Alternatively, to generate a local standalone APK for testing on physical devices:

```bash
npx expo run:android --variant release
```
