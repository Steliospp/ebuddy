import { initializeApp } from "firebase/app";
import {
  initializeAuth,
  getReactNativePersistence,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Replace with your Firebase project config.
// You can find these values in Firebase Console > Project Settings.
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
};

const app = initializeApp(firebaseConfig);

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

export const db = getFirestore(app);
export const functions = getFunctions(app);

// Uncomment to use emulators during local development:
// import { connectAuthEmulator } from "firebase/auth";
// import { connectFirestoreEmulator } from "firebase/firestore";
// import { connectFunctionsEmulator } from "firebase/functions";
// connectAuthEmulator(auth, "http://localhost:9099");
// connectFirestoreEmulator(db, "localhost", 8080);
// connectFunctionsEmulator(functions, "localhost", 5001);
