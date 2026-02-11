import { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import { signInWithGoogle, signInWithApple, googleAuthConfig } from "@/services/auth";

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const [loading, setLoading] = useState(false);

  const [, googleResponse, googlePromptAsync] = Google.useIdTokenAuthRequest({
    clientId: googleAuthConfig.webClientId,
    iosClientId: googleAuthConfig.iosClientId,
    androidClientId: googleAuthConfig.androidClientId,
  });

  useEffect(() => {
    if (googleResponse?.type === "success") {
      const { id_token } = googleResponse.params;
      setLoading(true);
      signInWithGoogle(id_token)
        .catch((e) => Alert.alert("Sign-in Error", e.message))
        .finally(() => setLoading(false));
    }
  }, [googleResponse]);

  const handleAppleSignIn = async () => {
    try {
      setLoading(true);
      await signInWithApple();
    } catch (e: any) {
      if (e.code !== "ERR_CANCELED") {
        Alert.alert("Sign-in Error", e.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <Ionicons name="chatbubbles" size={72} color="#4170FB" />
        <Text style={styles.title}>Ebuddy</Text>
        <Text style={styles.subtitle}>
          A startup friend{"\n"}you can talk to
        </Text>
      </View>

      <View style={styles.buttons}>
        <TouchableOpacity
          style={styles.googleBtn}
          onPress={() => googlePromptAsync()}
          disabled={loading}
        >
          <Ionicons name="logo-google" size={22} color="#333" />
          <Text style={styles.googleText}>Continue with Google</Text>
        </TouchableOpacity>

        {Platform.OS === "ios" && (
          <TouchableOpacity
            style={styles.appleBtn}
            onPress={handleAppleSignIn}
            disabled={loading}
          >
            <Ionicons name="logo-apple" size={22} color="#fff" />
            <Text style={styles.appleText}>Continue with Apple</Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.disclaimer}>
        Not therapy. Not financial or legal advice.{"\n"}A thinking partner for
        your startup journey.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
    backgroundColor: "#fff",
  },
  hero: { alignItems: "center", marginBottom: 48 },
  title: { fontSize: 34, fontWeight: "800", marginTop: 16 },
  subtitle: {
    fontSize: 18,
    color: "#666",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 26,
  },
  buttons: { width: "100%", gap: 12 },
  googleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#fff",
    gap: 10,
  },
  googleText: { fontSize: 16, fontWeight: "600", color: "#333" },
  appleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 50,
    borderRadius: 12,
    backgroundColor: "#000",
    gap: 10,
  },
  appleText: { fontSize: 16, fontWeight: "600", color: "#fff" },
  disclaimer: {
    fontSize: 11,
    color: "#aaa",
    textAlign: "center",
    marginTop: 32,
    lineHeight: 16,
  },
});
