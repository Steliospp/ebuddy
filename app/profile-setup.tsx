import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import {
  loadStartupProfile,
  saveStartupProfile,
} from "@/services/firestore";
import type { StartupProfile, StartupStage, ChatMode } from "@/types";
import { emptyProfile, stageOptions, modeConfig } from "@/types";

export default function ProfileSetupScreen() {
  const router = useRouter();
  const { completeProfileSetup } = useAuth();
  const params = useLocalSearchParams<{ edit?: string }>();
  const isEdit = params.edit === "true";

  const [profile, setProfile] = useState<StartupProfile>(emptyProfile);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStartupProfile()
      .then((p) => { if (p) setProfile(p); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const update = (key: keyof StartupProfile, value: string) =>
    setProfile((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    if (!profile.companyName.trim()) {
      Alert.alert("Required", "Please enter at least a company name.");
      return;
    }
    setSaving(true);
    try {
      await saveStartupProfile(profile);
      if (isEdit) {
        router.back();
      } else {
        completeProfileSetup();
        router.replace("/(tabs)");
      }
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4170FB" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.heading}>
        {isEdit ? "Edit Startup Profile" : "Set Up Your Startup Profile"}
      </Text>
      <Text style={styles.subheading}>
        Help Ebuddy understand your startup so conversations are relevant from
        day one.
      </Text>

      <Text style={styles.sectionTitle}>Company Basics</Text>
      <Input label="Company Name *" value={profile.companyName} onChange={(v) => update("companyName", v)} />
      <Input label="One-liner (what you do)" value={profile.oneLiner} onChange={(v) => update("oneLiner", v)} />

      <Text style={styles.label}>Stage</Text>
      <View style={styles.chipRow}>
        {stageOptions.map((s) => (
          <Chip
            key={s}
            label={s}
            selected={profile.stage === s}
            onPress={() => setProfile((p) => ({ ...p, stage: s }))}
          />
        ))}
      </View>

      <Text style={styles.sectionTitle}>Customer & Business</Text>
      <Input label="Target Customer" value={profile.targetCustomer} onChange={(v) => update("targetCustomer", v)} />
      <Input label="Business Model" value={profile.businessModel} onChange={(v) => update("businessModel", v)} />
      <Input label="Pricing" value={profile.pricing} onChange={(v) => update("pricing", v)} />

      <Text style={styles.sectionTitle}>Progress</Text>
      <Input label="Traction Metrics" value={profile.tractionMetrics} onChange={(v) => update("tractionMetrics", v)} />
      <Input label="Current Goal" value={profile.currentGoal} onChange={(v) => update("currentGoal", v)} />
      <Input label="Current Blockers" value={profile.currentBlockers} onChange={(v) => update("currentBlockers", v)} />

      <Text style={styles.sectionTitle}>Default Chat Mode</Text>
      <View style={styles.chipRow}>
        {(Object.keys(modeConfig) as ChatMode[]).map((m) => (
          <Chip
            key={m}
            label={modeConfig[m].label}
            selected={profile.defaultMode === m}
            onPress={() => setProfile((p) => ({ ...p, defaultMode: m }))}
            color={modeConfig[m].color}
          />
        ))}
      </View>

      <TouchableOpacity
        style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
        onPress={handleSave}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveBtnText}>
            {isEdit ? "Save Changes" : "Get Started"}
          </Text>
        )}
      </TouchableOpacity>

      {isEdit && (
        <TouchableOpacity onPress={() => router.back()} style={styles.cancelBtn}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────

function Input({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        placeholder={label.replace(" *", "")}
        placeholderTextColor="#bbb"
      />
    </View>
  );
}

function Chip({
  label,
  selected,
  onPress,
  color = "#4170FB",
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  color?: string;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.chip,
        selected && { backgroundColor: color, borderColor: color },
      ]}
      onPress={onPress}
    >
      <Text style={[styles.chipText, selected && { color: "#fff" }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  container: { flex: 1, backgroundColor: "#fff" },
  content: { padding: 24, paddingBottom: 48 },
  heading: { fontSize: 24, fontWeight: "700", marginBottom: 4 },
  subheading: { fontSize: 14, color: "#888", marginBottom: 24, lineHeight: 20 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginTop: 24,
    marginBottom: 8,
    color: "#333",
  },
  inputGroup: { marginBottom: 12 },
  label: { fontSize: 13, fontWeight: "600", color: "#555", marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    backgroundColor: "#fafafa",
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#f5f5f5",
  },
  chipText: { fontSize: 14, fontWeight: "500", color: "#555" },
  saveBtn: {
    marginTop: 32,
    backgroundColor: "#4170FB",
    borderRadius: 12,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  cancelBtn: { marginTop: 12, alignItems: "center" },
  cancelText: { color: "#888", fontSize: 15 },
});
