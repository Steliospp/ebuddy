import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  orderBy,
  where,
  getDocs,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  writeBatch,
  Unsubscribe,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, auth, functions } from "./firebase";
import type {
  StartupProfile,
  ChatMessage,
  Quote,
  SavedQuote,
  UserPreferences,
  ChatMode,
} from "@/types";

function getUid(): string {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Not authenticated");
  return uid;
}

// ── User Document ────────────────────────────────────────────────────────────

export async function ensureUserDocument(): Promise<void> {
  const uid = getUid();
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    const user = auth.currentUser;
    const tomorrow = new Date();
    tomorrow.setUTCHours(24, 0, 0, 0);
    await setDoc(ref, {
      email: user?.email ?? "",
      name: user?.displayName ?? "",
      createdAt: serverTimestamp(),
      plan: "free",
      usage: { dailyCount: 0, dailyLimit: 20, resetAt: Timestamp.fromDate(tomorrow) },
      preferences: {
        defaultMode: "cofounder",
        quoteNotifEnabled: true,
        quoteNotifTime: "08:00",
        checkinNotifEnabled: true,
        checkinNotifTime: "09:00",
      },
    });
  }
}

// ── Startup Profile ──────────────────────────────────────────────────────────

export async function loadStartupProfile(): Promise<StartupProfile | null> {
  const uid = getUid();
  const snap = await getDoc(doc(db, `users/${uid}/startupProfile/main`));
  if (!snap.exists()) return null;
  return snap.data() as StartupProfile;
}

export async function saveStartupProfile(profile: StartupProfile): Promise<void> {
  const uid = getUid();
  await setDoc(doc(db, `users/${uid}/startupProfile/main`), profile, { merge: true });
}

// ── Preferences ──────────────────────────────────────────────────────────────

export async function loadPreferences(): Promise<UserPreferences> {
  const uid = getUid();
  const snap = await getDoc(doc(db, "users", uid));
  const data = snap.data();
  if (!data?.preferences) {
    return {
      defaultMode: "cofounder",
      quoteNotifEnabled: true,
      quoteNotifTime: "08:00",
      checkinNotifEnabled: true,
      checkinNotifTime: "09:00",
    };
  }
  return data.preferences as UserPreferences;
}

export async function savePreferences(prefs: UserPreferences): Promise<void> {
  const uid = getUid();
  await updateDoc(doc(db, "users", uid), { preferences: prefs });
}

// ── Messages ─────────────────────────────────────────────────────────────────

export function listenToMessages(
  threadId: string = "default",
  callback: (messages: ChatMessage[]) => void
): Unsubscribe {
  const uid = getUid();
  const q = query(
    collection(db, `users/${uid}/chats/${threadId}/messages`),
    orderBy("createdAt", "asc")
  );
  return onSnapshot(q, (snapshot) => {
    const messages: ChatMessage[] = snapshot.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        role: data.role,
        content: data.content,
        mode: data.mode,
        createdAt: (data.createdAt as Timestamp)?.toDate() ?? new Date(),
        bookmarked: data.bookmarked ?? false,
      };
    });
    callback(messages);
  });
}

export async function toggleBookmark(
  messageId: string,
  bookmarked: boolean,
  threadId: string = "default"
): Promise<void> {
  const uid = getUid();
  await updateDoc(
    doc(db, `users/${uid}/chats/${threadId}/messages/${messageId}`),
    { bookmarked }
  );
}

export async function loadBookmarkedMessages(
  threadId: string = "default"
): Promise<ChatMessage[]> {
  const uid = getUid();
  const q = query(
    collection(db, `users/${uid}/chats/${threadId}/messages`),
    where("bookmarked", "==", true),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      role: data.role,
      content: data.content,
      mode: data.mode,
      createdAt: (data.createdAt as Timestamp)?.toDate() ?? new Date(),
      bookmarked: true,
    };
  });
}

// ── Chat Function Call ───────────────────────────────────────────────────────

interface ChatResponse {
  response: string;
  messageId: string;
  dailyCount: number;
  dailyLimit: number;
}

export async function sendChatMessage(
  message: string,
  mode: ChatMode,
  optionalContext?: string,
  threadId: string = "default"
): Promise<ChatResponse> {
  const chatFn = httpsCallable<
    { threadId: string; mode: string; message: string; optionalContext: string },
    ChatResponse
  >(functions, "chat");

  const result = await chatFn({
    threadId,
    mode,
    message,
    optionalContext: optionalContext ?? "",
  });
  return result.data;
}

// ── Saved Quotes ─────────────────────────────────────────────────────────────

export async function saveQuote(quote: Quote): Promise<void> {
  const uid = getUid();
  await setDoc(doc(db, `users/${uid}/savedQuotes/${quote.id}`), {
    quoteId: quote.id,
    text: quote.text,
    author: quote.author,
    tags: quote.tags,
    savedAt: serverTimestamp(),
  });
}

export async function unsaveQuote(quoteId: number): Promise<void> {
  const uid = getUid();
  await deleteDoc(doc(db, `users/${uid}/savedQuotes/${quoteId}`));
}

export async function loadSavedQuotes(): Promise<SavedQuote[]> {
  const uid = getUid();
  const q = query(
    collection(db, `users/${uid}/savedQuotes`),
    orderBy("savedAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      docId: d.id,
      id: data.quoteId,
      text: data.text,
      author: data.author,
      tags: data.tags ?? [],
      savedAt: (data.savedAt as Timestamp)?.toDate() ?? new Date(),
    };
  });
}

export async function isQuoteSaved(quoteId: number): Promise<boolean> {
  const uid = getUid();
  const snap = await getDoc(doc(db, `users/${uid}/savedQuotes/${quoteId}`));
  return snap.exists();
}

// ── Daily ────────────────────────────────────────────────────────────────────

export async function saveDailyQuote(quote: Quote, dateStr: string): Promise<void> {
  const uid = getUid();
  await setDoc(
    doc(db, `users/${uid}/daily/${dateStr}`),
    {
      quoteId: quote.id,
      text: quote.text,
      author: quote.author,
      tags: quote.tags,
      createdAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function saveCheckin(text: string, dateStr: string): Promise<void> {
  const uid = getUid();
  await setDoc(
    doc(db, `users/${uid}/daily/${dateStr}`),
    { checkinText: text, checkinAt: serverTimestamp() },
    { merge: true }
  );
}

// ── Usage ────────────────────────────────────────────────────────────────────

export async function loadUsage(): Promise<{ count: number; limit: number }> {
  const uid = getUid();
  const snap = await getDoc(doc(db, "users", uid));
  const data = snap.data();
  const usage = data?.usage ?? {};
  return { count: usage.dailyCount ?? 0, limit: usage.dailyLimit ?? 20 };
}

// ── Reset Memory ─────────────────────────────────────────────────────────────

export async function resetMemory(): Promise<void> {
  const uid = getUid();
  await deleteDoc(doc(db, `users/${uid}/memory/latest`));

  const messagesSnap = await getDocs(
    collection(db, `users/${uid}/chats/default/messages`)
  );
  const batch = writeBatch(db);
  messagesSnap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();

  await deleteDoc(doc(db, `users/${uid}/chats/default`));
}
