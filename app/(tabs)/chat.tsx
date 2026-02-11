import { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Clipboard,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import {
  listenToMessages,
  sendChatMessage,
  toggleBookmark,
  loadUsage,
} from "@/services/firestore";
import type { ChatMessage, ChatMode } from "@/types";
import { modeConfig } from "@/types";

const QUICK_ACTIONS = [
  { label: "Fix my pitch", icon: "checkmark-circle" },
  { label: "Pricing brainstorm", icon: "cash" },
  { label: "Cold email draft", icon: "mail" },
  { label: "Next 3 actions", icon: "list" },
  { label: "Calm me down", icon: "heart" },
] as const;

export default function ChatScreen() {
  const params = useLocalSearchParams<{ context?: string }>();
  const flatListRef = useRef<FlatList>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<ChatMode>("cofounder");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dailyCount, setDailyCount] = useState(0);
  const [dailyLimit, setDailyLimit] = useState(20);
  const [contextUsed, setContextUsed] = useState(false);

  // Listen to messages
  useEffect(() => {
    const unsub = listenToMessages("default", setMessages);
    loadUsage()
      .then(({ count, limit }) => {
        setDailyCount(count);
        setDailyLimit(limit);
      })
      .catch(() => {});
    return () => unsub();
  }, []);

  // Handle incoming context from Home screen
  useEffect(() => {
    if (params.context && !contextUsed) {
      const ctx = params.context;
      setContextUsed(true);
      if (ctx.startsWith("Daily check-in:")) {
        setInput(ctx.replace("Daily check-in: ", ""));
      } else {
        setInput("Let's discuss this quote");
      }
    }
  }, [params.context, contextUsed]);

  // Auto-scroll
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length, sending]);

  const send = useCallback(
    async (text?: string) => {
      const msg = (text ?? input).trim();
      if (!msg || sending) return;

      setInput("");
      setSending(true);
      setError(null);

      try {
        const result = await sendChatMessage(
          msg,
          mode,
          contextUsed ? params.context : undefined
        );
        setDailyCount(result.dailyCount);
        setDailyLimit(result.dailyLimit);
      } catch (e: any) {
        const message =
          e?.message?.includes("resource-exhausted") || e?.code === "resource-exhausted"
            ? "Daily message limit reached. Try again tomorrow!"
            : e?.message ?? "Failed to send. Please try again.";
        setError(message);
      } finally {
        setSending(false);
      }
    },
    [input, mode, sending, params.context, contextUsed]
  );

  const handleBookmark = async (msg: ChatMessage) => {
    await toggleBookmark(msg.id, !msg.bookmarked);
  };

  const remaining = Math.max(0, dailyLimit - dailyCount);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={88}
    >
      {/* Mode selector */}
      <View style={styles.modeRow}>
        {(Object.keys(modeConfig) as ChatMode[]).map((m) => (
          <TouchableOpacity
            key={m}
            style={[styles.modeChip, mode === m && { backgroundColor: modeConfig[m].color }]}
            onPress={() => setMode(m)}
          >
            <Ionicons
              name={modeConfig[m].icon as any}
              size={14}
              color={mode === m ? "#fff" : "#888"}
            />
            <Text style={[styles.modeText, mode === m && { color: "#fff" }]}>
              {modeConfig[m].label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={styles.messageList}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubbles-outline" size={52} color="#ddd" />
            <Text style={styles.emptyTitle}>Start a conversation</Text>
            <Text style={styles.emptySubtitle}>
              Ask about your startup, brainstorm ideas, or talk through what's
              on your mind.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View
            style={[
              styles.bubble,
              item.role === "user" ? styles.userBubble : styles.assistantBubble,
            ]}
          >
            <Text
              style={[
                styles.bubbleText,
                item.role === "user" && { color: "#fff" },
              ]}
            >
              {item.content}
            </Text>
            {item.role === "assistant" && (
              <View style={styles.bubbleActions}>
                <TouchableOpacity onPress={() => handleBookmark(item)}>
                  <Ionicons
                    name={item.bookmarked ? "bookmark" : "bookmark-outline"}
                    size={16}
                    color={item.bookmarked ? "#4170FB" : "#aaa"}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => Clipboard.setString(item.content)}
                >
                  <Ionicons name="copy-outline" size={16} color="#aaa" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
        ListFooterComponent={
          sending ? (
            <View style={[styles.bubble, styles.assistantBubble]}>
              <Text style={styles.typing}>Thinking...</Text>
            </View>
          ) : null
        }
      />

      {error && <Text style={styles.error}>{error}</Text>}

      {/* Quick actions */}
      <FlatList
        data={QUICK_ACTIONS}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(a) => a.label}
        contentContainerStyle={styles.quickRow}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.quickBtn}
            onPress={() => send(item.label)}
          >
            <Ionicons name={item.icon as any} size={14} color="#666" />
            <Text style={styles.quickText}>{item.label}</Text>
          </TouchableOpacity>
        )}
      />

      {/* Input */}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Message Ebuddy..."
          placeholderTextColor="#bbb"
          value={input}
          onChangeText={setInput}
          multiline
          editable={!sending}
        />
        <TouchableOpacity
          onPress={() => send()}
          disabled={sending || !input.trim() || remaining <= 0}
        >
          <Ionicons
            name="arrow-up-circle"
            size={36}
            color={
              sending || !input.trim() || remaining <= 0 ? "#ccc" : "#4170FB"
            }
          />
        </TouchableOpacity>
      </View>

      <Text style={styles.remaining}>
        {remaining} messages remaining today
      </Text>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f2f2f7" },
  modeRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 8,
    backgroundColor: "#f2f2f7",
  },
  modeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#e8e8ed",
  },
  modeText: { fontSize: 13, fontWeight: "600", color: "#888" },
  messageList: { padding: 16, paddingBottom: 8, flexGrow: 1 },
  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center", paddingTop: 80 },
  emptyTitle: { fontSize: 18, fontWeight: "600", color: "#aaa", marginTop: 12 },
  emptySubtitle: {
    fontSize: 14,
    color: "#ccc",
    textAlign: "center",
    marginTop: 4,
    paddingHorizontal: 40,
  },
  bubble: { maxWidth: "80%", padding: 12, borderRadius: 16, marginBottom: 10 },
  userBubble: {
    backgroundColor: "#4170FB",
    alignSelf: "flex-end",
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: "#fff",
    alignSelf: "flex-start",
    borderBottomLeftRadius: 4,
  },
  bubbleText: { fontSize: 15, lineHeight: 22, color: "#222" },
  bubbleActions: { flexDirection: "row", gap: 14, marginTop: 8 },
  typing: { fontSize: 14, color: "#aaa", fontStyle: "italic" },
  error: {
    fontSize: 12,
    color: "#e33",
    textAlign: "center",
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  quickRow: { paddingHorizontal: 12, paddingVertical: 6, gap: 8 },
  quickBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#e8e8ed",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  quickText: { fontSize: 12, color: "#555" },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#fff",
  },
  input: {
    flex: 1,
    backgroundColor: "#f2f2f7",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
  },
  remaining: {
    fontSize: 10,
    color: "#bbb",
    textAlign: "center",
    paddingBottom: 6,
    backgroundColor: "#fff",
  },
});
