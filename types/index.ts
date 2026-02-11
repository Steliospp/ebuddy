// ── Startup Profile ──────────────────────────────────────────────────────────

export type StartupStage = "Idea" | "MVP" | "Traction" | "Scaling";
export type ChatMode = "cofounder" | "friend" | "advisor";

export interface StartupProfile {
  companyName: string;
  oneLiner: string;
  stage: StartupStage;
  targetCustomer: string;
  businessModel: string;
  pricing: string;
  tractionMetrics: string;
  currentGoal: string;
  currentBlockers: string;
  defaultMode: ChatMode;
}

export const emptyProfile: StartupProfile = {
  companyName: "",
  oneLiner: "",
  stage: "Idea",
  targetCustomer: "",
  businessModel: "",
  pricing: "",
  tractionMetrics: "",
  currentGoal: "",
  currentBlockers: "",
  defaultMode: "cofounder",
};

// ── Chat ─────────────────────────────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  mode: ChatMode;
  createdAt: Date;
  bookmarked: boolean;
}

// ── Quote ────────────────────────────────────────────────────────────────────

export interface Quote {
  id: number;
  text: string;
  author: string;
  tags: string[];
}

export interface SavedQuote extends Quote {
  docId: string;
  savedAt: Date;
}

// ── User ─────────────────────────────────────────────────────────────────────

export interface UserPreferences {
  defaultMode: ChatMode;
  quoteNotifEnabled: boolean;
  quoteNotifTime: string; // "HH:mm"
  checkinNotifEnabled: boolean;
  checkinNotifTime: string; // "HH:mm"
}

export const defaultPreferences: UserPreferences = {
  defaultMode: "cofounder",
  quoteNotifEnabled: true,
  quoteNotifTime: "08:00",
  checkinNotifEnabled: true,
  checkinNotifTime: "09:00",
};

// ── Mode Display ─────────────────────────────────────────────────────────────

export const modeConfig: Record<
  ChatMode,
  { label: string; icon: string; color: string }
> = {
  cofounder: { label: "Cofounder", icon: "people", color: "#4170FB" },
  friend: { label: "Friend", icon: "heart", color: "#FF6B8A" },
  advisor: { label: "Advisor", icon: "briefcase", color: "#34C759" },
};

export const stageOptions: StartupStage[] = [
  "Idea",
  "MVP",
  "Traction",
  "Scaling",
];
