import { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Switch,
  ScrollView,
  StyleSheet,
  Alert,
  Linking,
  ActivityIndicator,
  Platform,
} from "react-native";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { signOut } from "@/services/auth";
import {
  loadPreferences,
  savePreferences,
  resetMemory,
} from "@/services/firestore";
import {
  requestPermission,
  scheduleQuoteNotification,
  scheduleCheckinNotification,
} from "@/services/notifications";
import type { UserPreferences } from "@/types";
import { defaultPreferences } from "@/types";

export default function SettingsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [prefs, setPrefs] = useState<UserPreferences>(defaultPreferences);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);

  // Time picker state
  const [showQuotePicker, setShowQuotePicker] = useState(false);
  const [showCheckinPicker, setShowCheckinPicker] = useState(false);

  useEffect(() => {
    (async () => {
      await requestPermission();
      try {
        const p = await loadPreferences();
        setPrefs(p);
      } catch {}
      setLoading(false);
    })();
  }, []);

  const updatePrefs = async (partial: Partial<UserPreferences>) => {
    const updated = { ...prefs, ...partial };
    setPrefs(updated);
    await savePreferences(updated);
    scheduleQuoteNotification(updated.quoteNotifEnabled, updated.quoteNotifTime);
    scheduleCheckinNotification(updated.checkinNotifEnabled, updated.checkinNotifTime);
  };

  const parseTime = (str: string): Date => {
    const [h, m] = str.split(":").map(Number);
    const d = new Date();
    d.setHours(h ?? 8, m ?? 0, 0, 0);
    return d;
  };

  const formatTime = (date: Date): string => {
    const h = String(date.getHours()).padStart(2, "0");
    const m = String(date.getMinutes()).padStart(2, "0");
    return `${h}:${m}`;
  };

  const handleReset = () => {
    Alert.alert(
      "Reset Chat Memory",
      "This will delete all chat messages and the AI's memory of your conversations. Your startup profile will be kept.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: async () => {
            setResetting(true);
            await resetMemory().catch(() => {});
            setResetting(false);
            Alert.alert("Done", "Chat memory has been reset.");
          },
        },
      ]
    );
  };

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await signOut();
          router.replace("/login");
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4170FB" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Profile */}
      <Text style={styles.sectionHeader}>Startup Profile</Text>
      <TouchableOpacity
        style={styles.row}
        onPress={() => router.push({ pathname: "/profile-setup", params: { edit: "true" } })}
      >
        <Ionicons name="business" size={20} color="#4170FB" />
        <Text style={styles.rowLabel}>Edit Startup Profile</Text>
        <Ionicons name="chevron-forward" size={18} color="#ccc" />
      </TouchableOpacity>

      {/* Notifications */}
      <Text style={styles.sectionHeader}>Notifications</Text>
      <View style={styles.row}>
        <Ionicons name="sunny" size={20} color="#FF9500" />
        <Text style={styles.rowLabel}>Daily Quote</Text>
        <Switch
          value={prefs.quoteNotifEnabled}
          onValueChange={(v) => updatePrefs({ quoteNotifEnabled: v })}
          trackColor={{ true: "#4170FB" }}
        />
      </View>

      {prefs.quoteNotifEnabled && (
        <TouchableOpacity
          style={styles.timeRow}
          onPress={() => setShowQuotePicker(true)}
        >
          <Text style={styles.timeLabel}>Quote Time</Text>
          <Text style={styles.timeValue}>{prefs.quoteNotifTime}</Text>
        </TouchableOpacity>
      )}

      {showQuotePicker && (
        <DateTimePicker
          value={parseTime(prefs.quoteNotifTime)}
          mode="time"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={(_, date) => {
            setShowQuotePicker(Platform.OS === "ios");
            if (date) updatePrefs({ quoteNotifTime: formatTime(date) });
          }}
        />
      )}

      <View style={styles.row}>
        <Ionicons name="checkmark-circle" size={20} color="#34C759" />
        <Text style={styles.rowLabel}>Daily Check-in</Text>
        <Switch
          value={prefs.checkinNotifEnabled}
          onValueChange={(v) => updatePrefs({ checkinNotifEnabled: v })}
          trackColor={{ true: "#4170FB" }}
        />
      </View>

      {prefs.checkinNotifEnabled && (
        <TouchableOpacity
          style={styles.timeRow}
          onPress={() => setShowCheckinPicker(true)}
        >
          <Text style={styles.timeLabel}>Check-in Time</Text>
          <Text style={styles.timeValue}>{prefs.checkinNotifTime}</Text>
        </TouchableOpacity>
      )}

      {showCheckinPicker && (
        <DateTimePicker
          value={parseTime(prefs.checkinNotifTime)}
          mode="time"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={(_, date) => {
            setShowCheckinPicker(Platform.OS === "ios");
            if (date) updatePrefs({ checkinNotifTime: formatTime(date) });
          }}
        />
      )}

      {/* Chat */}
      <Text style={styles.sectionHeader}>Chat</Text>
      <TouchableOpacity style={styles.row} onPress={handleReset}>
        <Ionicons name="refresh" size={20} color="#e33" />
        <Text style={[styles.rowLabel, { color: "#e33" }]}>
          {resetting ? "Resetting..." : "Reset Chat Memory"}
        </Text>
      </TouchableOpacity>

      {/* Account */}
      <Text style={styles.sectionHeader}>Account</Text>
      {user?.email && (
        <View style={styles.row}>
          <Ionicons name="mail" size={20} color="#888" />
          <Text style={styles.rowLabel}>{user.email}</Text>
        </View>
      )}
      <TouchableOpacity style={styles.row} onPress={handleSignOut}>
        <Ionicons name="log-out" size={20} color="#e33" />
        <Text style={[styles.rowLabel, { color: "#e33" }]}>Sign Out</Text>
      </TouchableOpacity>

      {/* Legal */}
      <Text style={styles.sectionHeader}>Legal</Text>
      <TouchableOpacity
        style={styles.row}
        onPress={() => Linking.openURL("https://example.com/privacy")}
      >
        <Ionicons name="hand-left" size={20} color="#888" />
        <Text style={styles.rowLabel}>Privacy Policy</Text>
        <Ionicons name="open-outline" size={16} color="#ccc" />
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.row}
        onPress={() => Linking.openURL("https://example.com/terms")}
      >
        <Ionicons name="document-text" size={20} color="#888" />
        <Text style={styles.rowLabel}>Terms of Service</Text>
        <Ionicons name="open-outline" size={16} color="#ccc" />
      </TouchableOpacity>

      <Text style={styles.disclaimer}>
        Ebuddy is not a substitute for professional legal, financial, or medical
        advice.
      </Text>
      <Text style={styles.version}>Version 1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  container: { flex: 1, backgroundColor: "#f2f2f7" },
  content: { paddingBottom: 48 },
  sectionHeader: {
    fontSize: 13,
    fontWeight: "600",
    color: "#888",
    textTransform: "uppercase",
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#eee",
  },
  rowLabel: { flex: 1, fontSize: 15, color: "#222" },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    paddingHorizontal: 44,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#eee",
  },
  timeLabel: { fontSize: 14, color: "#555" },
  timeValue: { fontSize: 14, color: "#4170FB", fontWeight: "600" },
  disclaimer: {
    fontSize: 11,
    color: "#bbb",
    textAlign: "center",
    marginTop: 24,
    paddingHorizontal: 32,
    lineHeight: 16,
  },
  version: { fontSize: 11, color: "#ccc", textAlign: "center", marginTop: 4 },
});
