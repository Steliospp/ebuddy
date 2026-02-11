import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Share,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { getQuoteOfTheDay, getDateString } from "@/services/quotes";
import {
  saveDailyQuote,
  saveQuote,
  unsaveQuote,
  isQuoteSaved,
  saveCheckin,
} from "@/services/firestore";
import type { Quote } from "@/types";

export default function HomeScreen() {
  const { user } = useAuth();
  const router = useRouter();

  const [quote, setQuote] = useState<Quote | null>(null);
  const [saved, setSaved] = useState(false);
  const [checkinText, setCheckinText] = useState("");
  const [checkinDone, setCheckinDone] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadQuote = useCallback(async () => {
    if (!user) return;
    try {
      const q = await getQuoteOfTheDay(user.uid);
      setQuote(q);
      if (q) {
        await saveDailyQuote(q, getDateString());
        const s = await isQuoteSaved(q.id);
        setSaved(s);
      }
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, [user]);

  useEffect(() => {
    loadQuote();
  }, [loadQuote]);

  const toggleSave = async () => {
    if (!quote) return;
    if (saved) {
      await unsaveQuote(quote.id);
      setSaved(false);
    } else {
      await saveQuote(quote);
      setSaved(true);
    }
  };

  const shareQuote = async () => {
    if (!quote) return;
    await Share.share({
      message: `"${quote.text}" — ${quote.author}\n\nvia Ebuddy`,
    });
  };

  const discussQuote = () => {
    if (!quote) return;
    router.push({
      pathname: "/(tabs)/chat",
      params: { context: `Quote of the day: "${quote.text}" — ${quote.author}` },
    });
  };

  const submitCheckin = async () => {
    if (!checkinText.trim()) return;
    await saveCheckin(checkinText, getDateString());
    setCheckinDone(true);
    router.push({
      pathname: "/(tabs)/chat",
      params: { context: `Daily check-in: ${checkinText}` },
    });
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            loadQuote();
          }}
        />
      }
    >
      {/* Daily Quote */}
      {loading ? (
        <ActivityIndicator style={{ marginVertical: 40 }} size="large" color="#4170FB" />
      ) : quote ? (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="sunny" size={16} color="#4170FB" />
            <Text style={styles.cardLabel}>Quote of the Day</Text>
          </View>

          <Text style={styles.quoteText}>"{quote.text}"</Text>
          <Text style={styles.quoteAuthor}>— {quote.author}</Text>

          {quote.tags.length > 0 && (
            <View style={styles.tagRow}>
              {quote.tags.map((t) => (
                <View key={t} style={styles.tag}>
                  <Text style={styles.tagText}>{t}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.divider} />

          <View style={styles.actions}>
            <TouchableOpacity onPress={toggleSave} style={styles.actionBtn}>
              <Ionicons
                name={saved ? "bookmark" : "bookmark-outline"}
                size={18}
                color={saved ? "#4170FB" : "#888"}
              />
              <Text style={styles.actionText}>{saved ? "Saved" : "Save"}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={shareQuote} style={styles.actionBtn}>
              <Ionicons name="share-outline" size={18} color="#888" />
              <Text style={styles.actionText}>Share</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={discussQuote} style={styles.discussBtn}>
              <Ionicons name="chatbubble-outline" size={16} color="#fff" />
              <Text style={styles.discussText}>Discuss</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {/* Daily Check-in */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="checkmark-circle" size={16} color="#34C759" />
          <Text style={[styles.cardLabel, { color: "#34C759" }]}>
            Daily Check-in
          </Text>
        </View>

        <Text style={styles.checkinPrompt}>
          What's the one move that matters today?
        </Text>

        {checkinDone ? (
          <View style={styles.checkinDone}>
            <Ionicons name="checkmark-circle" size={20} color="#34C759" />
            <Text style={styles.checkinDoneText}>
              Check-in submitted! Opening chat...
            </Text>
          </View>
        ) : (
          <>
            <TextInput
              style={styles.checkinInput}
              placeholder="Type your one move..."
              placeholderTextColor="#bbb"
              value={checkinText}
              onChangeText={setCheckinText}
              multiline
            />
            <TouchableOpacity
              style={[
                styles.checkinBtn,
                !checkinText.trim() && styles.checkinBtnDisabled,
              ]}
              onPress={submitCheckin}
              disabled={!checkinText.trim()}
            >
              <Text style={styles.checkinBtnText}>Submit & Discuss</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f2f2f7" },
  content: { padding: 16, gap: 16, paddingBottom: 32 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 12 },
  cardLabel: { fontSize: 13, fontWeight: "700", color: "#4170FB" },
  quoteText: { fontSize: 20, fontStyle: "italic", lineHeight: 28, marginBottom: 8 },
  quoteAuthor: { fontSize: 14, color: "#888", marginBottom: 12 },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 12 },
  tag: {
    backgroundColor: "#EBF0FF",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: { fontSize: 11, color: "#4170FB", fontWeight: "600" },
  divider: { height: 1, backgroundColor: "#eee", marginVertical: 12 },
  actions: { flexDirection: "row", alignItems: "center", gap: 16 },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  actionText: { fontSize: 13, color: "#888" },
  discussBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#4170FB",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginLeft: "auto",
  },
  discussText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  checkinPrompt: { fontSize: 15, color: "#555", marginBottom: 12 },
  checkinInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    minHeight: 60,
    textAlignVertical: "top",
    marginBottom: 12,
  },
  checkinBtn: {
    backgroundColor: "#4170FB",
    borderRadius: 10,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  checkinBtnDisabled: { opacity: 0.4 },
  checkinBtnText: { color: "#fff", fontWeight: "600", fontSize: 15 },
  checkinDone: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
  checkinDoneText: { color: "#888", fontSize: 14 },
});
