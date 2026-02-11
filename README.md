# Ebuddy - A Startup Friend You Can Talk To

A cross-platform mobile app (React Native / Expo) where founders can chat with an AI companion specialized for startups, business, and mindset. Switch between Cofounder, Friend, and Advisor modes. Includes daily quotes, check-ins, and notifications.

## Tech Stack

- **Mobile**: React Native (Expo SDK 51) — runs on iOS and Android
- **Navigation**: Expo Router (file-based routing)
- **Auth**: Firebase Auth (Google Sign-In via expo-auth-session + Apple Sign-In)
- **Database**: Cloud Firestore (Firebase JS SDK v10)
- **Backend**: Firebase Cloud Functions (Node.js/TypeScript)
- **AI**: OpenAI API (gpt-4.1-nano / gpt-4o-mini) — called server-side only
- **Notifications**: expo-notifications (local)

## Prerequisites

- **Node.js 18+**
- **Expo CLI**: `npx expo` (included with Expo SDK)
- **Firebase CLI**: `npm install -g firebase-tools`
- **Expo Go** app on your phone (for development), OR EAS Build for native builds
- A **Firebase project** with Blaze plan (for Cloud Functions)
- An **OpenAI API key**

## Setup

### 1. Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/) and create a new project (or use existing).
2. Enable **Authentication** > Sign-in method > **Google** and **Apple**.
3. Add a **Web app** in Firebase (the JS SDK uses the web config):
   - Copy the `firebaseConfig` object.
   - Paste it into `services/firebase.ts`.
4. Enable **Cloud Firestore** in the Firebase console.

### 2. Google Sign-In Setup

1. In [Google Cloud Console](https://console.cloud.google.com/), find your Firebase project.
2. Go to **APIs & Services** > **Credentials**.
3. Create OAuth 2.0 Client IDs for:
   - **Web** (required for expo-auth-session)
   - **iOS** (optional, for native builds)
   - **Android** (optional, for native builds)
4. Copy the client IDs into `services/auth.ts`.

### 3. App Configuration

1. Edit `services/firebase.ts` — replace the placeholder Firebase config with your own.
2. Edit `services/auth.ts` — replace the placeholder Google OAuth client IDs.
3. Edit `app.json` — update `bundleIdentifier` and `package` to match your Firebase app.

### 4. Cloud Functions Setup

```bash
cd functions
npm install
```

#### Set OpenAI API Key

**For emulator (local development):**
```bash
cp .env.example .env
# Edit .env and set OPENAI_API_KEY=sk-...
```

**For production deployment:**
```bash
firebase functions:secrets:set OPENAI_API_KEY
# Enter your key when prompted
```

### 5. Run Locally

**Start Firebase Emulators:**
```bash
firebase emulators:start
```

**Uncomment emulator connectors** in `services/firebase.ts` to point the app at local emulators.

**Run the app:**
```bash
# Install dependencies
npm install

# Start Expo dev server
npx expo start
```

Then scan the QR code with Expo Go (iOS/Android), or press `i` for iOS Simulator / `a` for Android Emulator.

### 6. Deploy to Firebase

```bash
# Deploy functions and Firestore rules
firebase deploy --only functions,firestore:rules

# Or deploy everything
firebase deploy
```

### 7. Build for App Stores (EAS Build)

```bash
# Install EAS CLI
npm install -g eas-cli

# Configure
eas build:configure

# Build
eas build --platform ios
eas build --platform android
```

## Project Structure

```
ebuddy/
├── app/                        # Expo Router screens
│   ├── _layout.tsx             # Root layout + AuthProvider
│   ├── index.tsx               # Auth redirect
│   ├── login.tsx               # Login screen
│   ├── profile-setup.tsx       # Startup profile form
│   └── (tabs)/                 # Main tab navigator
│       ├── _layout.tsx         # Tab bar config
│       ├── index.tsx           # Home (quote + check-in)
│       ├── chat.tsx            # Chat screen
│       ├── library.tsx         # Saved quotes + bookmarks
│       └── settings.tsx        # Settings + notifications
├── contexts/
│   └── AuthContext.tsx          # Auth state management
├── services/
│   ├── firebase.ts             # Firebase init
│   ├── firestore.ts            # Firestore CRUD
│   ├── auth.ts                 # Google + Apple auth
│   ├── quotes.ts               # Quote-of-the-day logic
│   └── notifications.ts        # Local notifications
├── types/
│   └── index.ts                # TypeScript types
├── data/
│   └── quotes.json             # 210 curated quotes
├── functions/                  # Firebase Cloud Functions
│   ├── src/index.ts
│   ├── package.json
│   └── tsconfig.json
├── firestore.rules
├── firestore.indexes.json
├── firebase.json
├── package.json
├── app.json
├── tsconfig.json
├── babel.config.js
└── README.md
```

## Cost Control

- **AI model**: Uses gpt-4.1-nano or gpt-4o-mini (cheap)
- **Context limit**: Only last 10 messages + rolling summary sent per request
- **Daily quota**: Free plan = 20 messages/day
- **Prompt size**: Startup playbook kept under 500 tokens

## App Store Checklist

- [ ] Replace placeholder Firebase config in `services/firebase.ts`
- [ ] Replace placeholder OAuth client IDs in `services/auth.ts`
- [ ] Add privacy policy URL (replace example.com links in settings)
- [ ] Add terms of service URL
- [ ] Include disclaimer: "Ebuddy is not a substitute for professional legal, financial, or medical advice"
- [ ] No overclaims about outcomes
- [ ] Review Apple's guidelines for AI-generated content
- [ ] Test on physical device before submission
- [ ] Add real app icon and splash screen in `assets/`

## Disclaimer

Ebuddy is a startup thinking partner and companion. It does not provide therapy, financial advice, legal advice, or guaranteed outcomes. All AI responses are for informational and brainstorming purposes only.
