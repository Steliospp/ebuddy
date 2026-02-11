import { useEffect } from "react";
import { ActivityIndicator, View, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";

/** Root screen: redirects based on auth state. */
export default function Index() {
  const { authState } = useAuth();
  const router = useRouter();

  useEffect(() => {
    switch (authState) {
      case "signedOut":
        router.replace("/login");
        break;
      case "needsProfile":
        router.replace("/profile-setup");
        break;
      case "signedIn":
        router.replace("/(tabs)");
        break;
    }
  }, [authState]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#4170FB" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
});
