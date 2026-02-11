import {
  GoogleAuthProvider,
  OAuthProvider,
  signInWithCredential,
  signOut as firebaseSignOut,
} from "firebase/auth";
import * as Google from "expo-auth-session/providers/google";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import { auth } from "./firebase";

// Replace these with your own OAuth client IDs from Google Cloud Console.
// See README for setup instructions.
const GOOGLE_WEB_CLIENT_ID = "YOUR_WEB_CLIENT_ID.apps.googleusercontent.com";
const GOOGLE_IOS_CLIENT_ID = "YOUR_IOS_CLIENT_ID.apps.googleusercontent.com";
const GOOGLE_ANDROID_CLIENT_ID = "YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com";

export const googleAuthConfig = {
  webClientId: GOOGLE_WEB_CLIENT_ID,
  iosClientId: GOOGLE_IOS_CLIENT_ID,
  androidClientId: GOOGLE_ANDROID_CLIENT_ID,
};

/**
 * Sign in with Google using an ID token obtained from expo-auth-session.
 */
export async function signInWithGoogle(idToken: string): Promise<void> {
  const credential = GoogleAuthProvider.credential(idToken);
  await signInWithCredential(auth, credential);
}

/**
 * Sign in with Apple.
 * Uses expo-apple-authentication to get the credential,
 * then forwards it to Firebase Auth.
 */
export async function signInWithApple(): Promise<void> {
  // Generate a nonce
  const rawNonce = Array.from(
    { length: 32 },
    () => "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"[
      Math.floor(Math.random() * 62)
    ]
  ).join("");

  const hashedNonce = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    rawNonce
  );

  const appleCredential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
    nonce: hashedNonce,
  });

  const { identityToken } = appleCredential;
  if (!identityToken) throw new Error("No identity token from Apple");

  const provider = new OAuthProvider("apple.com");
  const oauthCredential = provider.credential({
    idToken: identityToken,
    rawNonce,
  });

  await signInWithCredential(auth, oauthCredential);
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(auth);
}
