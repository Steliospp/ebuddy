import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  loadSavedQuotes,
  loadBookmarkedMessages,
  unsaveQuote,
  toggleBookmark,
} from "@/services/firestore";
import type { SavedQuote, ChatMessage } from "@/types";
import { modeConfig } from "@/types";

type Tab = "quotes" | "messages";

export default function LibraryScreen() {
  const [tab, setTab] = useState<Tab>("quotes");
  const [quotes, setQuotes] = useState<SavedQuote[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [q, m] = await Promise.all([
        loadSavedQuotes(),
        loadBookmarkedMessages(),
      ]);
      setQuotes(q);
      setMessages(m);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const removeQuote = async (q: SavedQuote) => {
    await unsaveQuote(q.id);
    setQuotes((prev) => prev.filter((x) => x.docId !== q.docId));
  };

  const removeMessage = async (m: ChatMessage) => {
    await toggleBookmark(m.id, false);
    setMessages((prev) => prev.filter((x) => x.id !== m.id));
  };

  return (
    <View style={styles.container}>
      {/* Tab selector */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, tab === "quotes" && styles.tabActive]}
          onPress={() => setTab("quotes")}
        >
          <Text style={[styles.tabText, tab === "quotes" && styles.tabTextActive]}>
            Saved Quotes
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === "messages" && styles.tabActive]}
          onPress={() => setTab("messages")}
        >
          <Text
            style={[styles.tabText, tab === "messages" && styles.tabTextActive]}
          >
            Bookmarks
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#4170FB" style={{ marginTop: 40 }} />
      ) : tab === "quotes" ? (
        <FlatList
          data={quotes}
          keyExtractor={(q) => q.docId}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Empty
              icon="bookmark-outline"
              title="No saved quotes"
              subtitle="Save quotes from the home screen to find them here."
            />
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.quoteText}>"{item.text}"</Text>
              <Text style={styles.quoteAuthor}>— {item.author}</Text>
              {item.tags.length > 0 && (
                <View style={styles.tagRow}>
                  {item.tags.map((t) => (
                    <View key={t} style={styles.tag}>
                      <Text style={styles.tagText}>{t}</Text>
                    </View>
                  ))}
                </View>
              )}
              <TouchableOpacity
                style={styles.removeBtn}
                onPress={() => removeQuote(item)}
              >
                <Ionicons name="bookmark-outline" size={14} color="#e33" />
                <Text style={styles.removeText}>Remove</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      ) : (
        <FlatList
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Empty
              icon="chatbubble-outline"
              title="No bookmarked messages"
              subtitle="Bookmark chat messages to save them here."
            />
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.msgHeader}>
                <Ionicons
                  name={modeConfig[item.mode].icon as any}
                  size={14}
                  color={modeConfig[item.mode].color}
                />
                <Text style={styles.msgMode}>{modeConfig[item.mode].label}</Text>
                <Text style={styles.msgDate}>
                  {item.createdAt.toLocaleDateString()}
                </Text>
              </View>
              <Text style={styles.msgContent} numberOfLines={6}>
                {item.content}
              </Text>
              <TouchableOpacity
                style={styles.removeBtn}
                onPress={() => removeMessage(item)}
              >
                <Ionicons name="bookmark-outline" size={14} color="#e33" />
                <Text style={styles.removeText}>Unbookmark</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </View>
  );
}

function Empty({
  icon,
  title,
  subtitle,
}: {
  icon: string;
  title: string;
  subtitle: string;
}) {
  return (
    <View style={styles.emptyContainer}>
      <Ionicons name={icon as any} size={44} color="#ddd" />
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptySubtitle}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f2f2f7" },
  tabRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#e8e8ed",
  },
  tabActive: { backgroundColor: "#4170FB" },
  tabText: { fontSize: 14, fontWeight: "600", color: "#888" },
  tabTextActive: { color: "#fff" },
  listContent: { padding: 16, gap: 12, flexGrow: 1 },
  card: { backgroundColor: "#fff", borderRadius: 14, padding: 16 },
  quoteText: { fontSize: 16, fontStyle: "italic", lineHeight: 24, marginBottom: 6 },
  quoteAuthor: { fontSize: 13, color: "#888", marginBottom: 8 },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 8 },
  tag: {
    backgroundColor: "#EBF0FF",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  tagText: { fontSize: 10, color: "#4170FB", fontWeight: "600" },
  removeBtn: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 8 },
  removeText: { fontSize: 12, color: "#e33" },
  msgHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  msgMode: { fontSize: 12, color: "#888", fontWeight: "600" },
  msgDate: { fontSize: 11, color: "#bbb", marginLeft: "auto" },
  msgContent: { fontSize: 14, lineHeight: 21, color: "#333" },
  emptyContainer: {
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 80,
  },
  emptyTitle: { fontSize: 17, fontWeight: "600", color: "#aaa", marginTop: 12 },
  emptySubtitle: {
    fontSize: 13,
    color: "#ccc",
    textAlign: "center",
    marginTop: 4,
    paddingHorizontal: 40,
  },
});
