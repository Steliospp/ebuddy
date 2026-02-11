# Ebuddy - A Startup Friend You Can Talk To

An iOS MVP app where founders can chat with an AI companion specialized for startups, business, and mindset. Switch between Cofounder, Friend, and Advisor modes. Includes daily quotes, check-ins, and notifications.

## Tech Stack

- **iOS**: SwiftUI (iOS 17+)
- **Auth**: Firebase Auth (Google Sign-In + Apple Sign-In)
- **Database**: Cloud Firestore
- **Backend**: Firebase Cloud Functions (Node.js/TypeScript)
- **AI**: OpenAI API (gpt-4.1-nano / gpt-4o-mini) — called server-side only
- **Notifications**: Local notifications

## Prerequisites

- **Xcode 15+** (with iOS 17 SDK)
- **Node.js 18+**
- **Firebase CLI**: `npm install -g firebase-tools`
- **CocoaPods** (not needed — uses Swift Package Manager)
- A **Firebase project** with Blaze plan (for Cloud Functions)
- An **OpenAI API key**

## Setup

### 1. Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/) and create a new project (or use existing).
2. Enable **Authentication** > Sign-in method > **Google** and **Apple**.
3. Add an **iOS app**:
   - Bundle ID: `com.yourcompany.ebuddy` (change to match your team)
   - Download `GoogleService-Info.plist`
4. Enable **Cloud Firestore** in the Firebase console.

### 2. iOS App Setup

1. Place `GoogleService-Info.plist` into `ios/Ebuddy/Ebuddy/`.
2. Open `ios/Ebuddy/Ebuddy.xcodeproj` in Xcode.
3. In Xcode, go to the project target > **Signing & Capabilities**:
   - Set your Team and Bundle Identifier.
4. Configure **URL Schemes** for Google Sign-In:
   - In `GoogleService-Info.plist`, find `REVERSED_CLIENT_ID`.
   - Go to target > **Info** > **URL Types** > add a new entry with the `REVERSED_CLIENT_ID` as the URL scheme.
5. For **Apple Sign-In**: add the "Sign in with Apple" capability in Xcode.
6. Resolve Swift packages (Xcode should auto-resolve on open).

### 3. Cloud Functions Setup

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

### 4. Run Locally

**Start Firebase Emulators:**
```bash
firebase emulators:start
```

This starts Auth, Firestore, and Functions emulators.

**Run the iOS app:**
- Open Xcode, select a simulator or device.
- If using emulators, the app is configured to connect to `localhost` in debug builds.
- Press Run (Cmd+R).

### 5. Deploy to Firebase

```bash
# Deploy functions and Firestore rules
firebase deploy --only functions,firestore:rules

# Or deploy everything
firebase deploy
```

### 6. Firestore Indexes

If needed, deploy indexes:
```bash
firebase deploy --only firestore:indexes
```

## Project Structure

```
ebuddy/
├── ios/
│   └── Ebuddy/
│       ├── Ebuddy.xcodeproj
│       └── Ebuddy/
│           ├── EbuddyApp.swift          # App entry point
│           ├── Models/                   # Data models
│           ├── ViewModels/               # Business logic
│           ├── Views/                    # SwiftUI views
│           ├── Services/                 # Firebase, notifications
│           ├── Resources/                # Quotes JSON, assets
│           └── Extensions/               # Swift extensions
├── functions/
│   ├── src/
│   │   └── index.ts                     # Cloud Functions
│   ├── package.json
│   └── tsconfig.json
├── firestore.rules
├── firestore.indexes.json
├── firebase.json
└── README.md
```

## Cost Control

- **AI model**: Uses gpt-4.1-nano or gpt-4o-mini (cheap)
- **Context limit**: Only last 10 messages + rolling summary sent per request
- **Daily quota**: Free plan = 20 messages/day
- **Prompt size**: Startup playbook kept under 500 tokens

## App Store Checklist

- [ ] Add `NSUserNotificationsUsageDescription` to Info.plist
- [ ] Add privacy policy URL
- [ ] Add terms of service URL
- [ ] Include disclaimer: "Ebuddy is not a substitute for professional legal, financial, or medical advice"
- [ ] No overclaims about outcomes
- [ ] Review Apple's guidelines for AI-generated content
- [ ] Test on physical device before submission

## Disclaimer

Ebuddy is a startup thinking partner and companion. It does not provide therapy, financial advice, legal advice, or guaranteed outcomes. All AI responses are for informational and brainstorming purposes only.
