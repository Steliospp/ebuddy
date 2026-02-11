import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "@/services/firebase";
import { ensureUserDocument, loadStartupProfile } from "@/services/firestore";

type AuthState = "loading" | "signedOut" | "needsProfile" | "signedIn";

interface AuthContextValue {
  user: User | null;
  authState: AuthState;
  completeProfileSetup: () => void;
  refreshAuthState: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  authState: "loading",
  completeProfileSetup: () => {},
  refreshAuthState: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authState, setAuthState] = useState<AuthState>("loading");

  const checkProfile = async () => {
    try {
      await ensureUserDocument();
      const profile = await loadStartupProfile();
      if (profile && profile.companyName) {
        setAuthState("signedIn");
      } else {
        setAuthState("needsProfile");
      }
    } catch {
      // If Firestore fails, still let user proceed
      setAuthState("signedIn");
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        await checkProfile();
      } else {
        setAuthState("signedOut");
      }
    });
    return unsubscribe;
  }, []);

  const completeProfileSetup = () => setAuthState("signedIn");

  const refreshAuthState = async () => {
    if (user) await checkProfile();
  };

  return (
    <AuthContext.Provider
      value={{ user, authState, completeProfileSetup, refreshAuthState }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
