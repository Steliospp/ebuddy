import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import OpenAI from "openai";

admin.initializeApp();
const db = admin.firestore();

// ---------------------------------------------------------------------------
// Prompts
// ---------------------------------------------------------------------------

const CORE_SYSTEM_PROMPT = `You are Ebuddy: a startup companion helping the user think clearly, take action, and stay emotionally steady while building their startup.

Rules:
- Be practical, honest, and grounded. Prefer small next steps over long theory.
- Ask 1–2 clarifying questions when needed but still provide a best-effort answer.
- Use startup frameworks when relevant: ICP, positioning, pricing, GTM, funnel, retention, unit economics, execution.
- Add mindset coaching when appropriate: focus, confidence, consistency, handling rejection, anxiety before pitching.
- No guaranteed outcomes. No legal, medical, or financial advice.
- Always end your response with:
  (1) Next 3 actions the user can take
  (2) One question to help refine their thinking`;

const MODE_PROMPTS: Record<string, string> = {
  cofounder: `Mode: COFOUNDER
You are a thoughtful cofounder. Challenge assumptions. Push for clarity. Discuss tradeoffs. Prioritize PMF and leverage. Give constructive tough love when needed.`,
  friend: `Mode: FRIEND
You are a close, supportive friend. Validate briefly, then calm and encourage. Avoid jargon. Focus on confidence, perspective, and gentle next steps.`,
  advisor: `Mode: ADVISOR
You are an experienced startup advisor. Be concise, structured, and framework-driven. Focus on decision quality, risks, and execution plans.`,
};

const STARTUP_PLAYBOOK = `STARTUP PLAYBOOK (reference when relevant):
- ICP: Who has this problem most acutely? Who will pay today? Define demographics, psychographics, watering holes.
- Positioning: For [ICP] who [need], [Product] is a [category] that [key benefit] unlike [alternatives] because [differentiator].
- Pricing: Start with 3 tiers (Starter/Pro/Scale). Price on value, not cost. Test willingness-to-pay with 5 customer calls.
- Cold email: Subject (<6 words), compliment or observation, problem statement, one-line pitch, soft CTA ("Worth a quick chat?").
- MVP scope: Core loop only. What is the ONE thing users must do? Ship in <2 weeks. Instrument usage. Talk to first 10 users daily.
- GTM channels: Pick 2 max. Options: cold outbound, communities, content/SEO, partnerships, paid ads, Product Hunt, AppSumo.`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new functions.https.HttpsError(
      "failed-precondition",
      "OpenAI API key not configured"
    );
  }
  return new OpenAI({apiKey});
}

function getModel(): string {
  return process.env.OPENAI_MODEL || "gpt-4.1-nano";
}

interface StartupProfile {
  companyName?: string;
  oneLiner?: string;
  stage?: string;
  targetCustomer?: string;
  businessModel?: string;
  pricing?: string;
  tractionMetrics?: string;
  currentGoal?: string;
  currentBlockers?: string;
}

function formatProfile(p: StartupProfile): string {
  const lines: string[] = [];
  if (p.companyName) lines.push(`Company: ${p.companyName}`);
  if (p.oneLiner) lines.push(`One-liner: ${p.oneLiner}`);
  if (p.stage) lines.push(`Stage: ${p.stage}`);
  if (p.targetCustomer) lines.push(`Target customer: ${p.targetCustomer}`);
  if (p.businessModel) lines.push(`Business model: ${p.businessModel}`);
  if (p.pricing) lines.push(`Pricing: ${p.pricing}`);
  if (p.tractionMetrics) lines.push(`Traction: ${p.tractionMetrics}`);
  if (p.currentGoal) lines.push(`Current goal: ${p.currentGoal}`);
  if (p.currentBlockers) lines.push(`Blockers: ${p.currentBlockers}`);
  return lines.length > 0
    ? `USER'S STARTUP PROFILE:\n${lines.join("\n")}`
    : "";
}

// ---------------------------------------------------------------------------
// Chat endpoint (HTTPS Callable)
// ---------------------------------------------------------------------------

export const chat = functions.https.onCall(async (data, context) => {
  // 1. Auth check
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "Must be signed in"
    );
  }
  const uid = context.auth.uid;

  const {
    threadId = "default",
    mode = "cofounder",
    message,
    optionalContext,
  } = data as {
    threadId?: string;
    mode?: string;
    message?: string;
    optionalContext?: string;
  };

  if (!message || typeof message !== "string" || message.trim().length === 0) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "message is required"
    );
  }

  const validModes = ["cofounder", "friend", "advisor"];
  const safeMode = validModes.includes(mode) ? mode : "cofounder";

  // 2. Usage limits
  const userRef = db.collection("users").doc(uid);
  const userSnap = await userRef.get();
  const userData = userSnap.data() || {};
  const plan = userData.plan || "free";
  const usage = userData.usage || {};
  const dailyLimit = usage.dailyLimit || (plan === "free" ? 20 : 1000);
  let dailyCount = usage.dailyCount || 0;
  const resetAt = usage.resetAt ? usage.resetAt.toDate() : new Date(0);

  const now = new Date();
  if (now > resetAt) {
    // Reset daily counter
    dailyCount = 0;
    const tomorrow = new Date(now);
    tomorrow.setUTCHours(24, 0, 0, 0);
    await userRef.update({
      "usage.dailyCount": 0,
      "usage.resetAt": admin.firestore.Timestamp.fromDate(tomorrow),
      "usage.dailyLimit": dailyLimit,
    });
  }

  if (dailyCount >= dailyLimit) {
    throw new functions.https.HttpsError(
      "resource-exhausted",
      `Daily message limit reached (${dailyLimit}). Resets at midnight UTC.`
    );
  }

  // 3. Load context
  const [profileSnap, memorySnap, recentMsgsSnap] = await Promise.all([
    db.doc(`users/${uid}/startupProfile/main`).get(),
    db.doc(`users/${uid}/memory/latest`).get(),
    db
      .collection(`users/${uid}/chats/${threadId}/messages`)
      .orderBy("createdAt", "desc")
      .limit(10)
      .get(),
  ]);

  const profile = profileSnap.exists
    ? (profileSnap.data() as StartupProfile)
    : {};
  const memory = memorySnap.exists ? memorySnap.data()?.summaryText || "" : "";

  // Build conversation messages (oldest first)
  const recentMessages: {role: string; content: string}[] = [];
  recentMsgsSnap.docs.reverse().forEach((doc) => {
    const d = doc.data();
    recentMessages.push({
      role: d.role === "assistant" ? "assistant" : "user",
      content: d.content,
    });
  });

  // 4. Assemble prompt
  const systemParts: string[] = [
    CORE_SYSTEM_PROMPT,
    MODE_PROMPTS[safeMode] || MODE_PROMPTS.cofounder,
  ];

  const profileText = formatProfile(profile);
  if (profileText) systemParts.push(profileText);

  if (memory) {
    systemParts.push(`MEMORY (rolling summary from past conversations):\n${memory}`);
  }

  systemParts.push(STARTUP_PLAYBOOK);

  if (optionalContext) {
    systemParts.push(`ADDITIONAL CONTEXT:\n${optionalContext}`);
  }

  const systemMessage = systemParts.join("\n\n---\n\n");

  const openaiMessages: Array<{role: "system" | "user" | "assistant"; content: string}> = [
    {role: "system", content: systemMessage},
    ...recentMessages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    {role: "user", content: message},
  ];

  // 5. Call OpenAI
  const openai = getOpenAIClient();
  let assistantText: string;
  try {
    const completion = await openai.chat.completions.create({
      model: getModel(),
      messages: openaiMessages,
      max_tokens: 1024,
      temperature: 0.7,
    });
    assistantText = completion.choices[0]?.message?.content || "I'm not sure how to respond to that. Could you rephrase?";
  } catch (err: any) {
    console.error("OpenAI error:", err);
    throw new functions.https.HttpsError(
      "internal",
      "Failed to generate response. Please try again."
    );
  }

  // 6. Save messages to Firestore
  const threadRef = db.doc(`users/${uid}/chats/${threadId}`);
  const messagesRef = threadRef.collection("messages");
  const timestamp = admin.firestore.FieldValue.serverTimestamp();

  const batch = db.batch();

  // Ensure thread doc exists
  batch.set(
    threadRef,
    {createdAt: timestamp, lastMessageAt: timestamp},
    {merge: true}
  );

  // User message
  const userMsgRef = messagesRef.doc();
  batch.set(userMsgRef, {
    role: "user",
    content: message,
    mode: safeMode,
    createdAt: timestamp,
    bookmarked: false,
  });

  // Assistant message
  const assistantMsgRef = messagesRef.doc();
  batch.set(assistantMsgRef, {
    role: "assistant",
    content: assistantText,
    mode: safeMode,
    createdAt: timestamp,
    bookmarked: false,
  });

  // Increment usage count
  batch.update(userRef, {
    "usage.dailyCount": admin.firestore.FieldValue.increment(1),
  });

  await batch.commit();

  // 7. Update rolling memory (fire-and-forget for speed)
  updateMemory(uid, message, assistantText, memory).catch((err) =>
    console.error("Memory update failed:", err)
  );

  return {
    response: assistantText,
    messageId: assistantMsgRef.id,
    dailyCount: dailyCount + 1,
    dailyLimit,
  };
});

// ---------------------------------------------------------------------------
// Memory summarization (runs after response is sent)
// ---------------------------------------------------------------------------

async function updateMemory(
  uid: string,
  userMessage: string,
  assistantMessage: string,
  existingSummary: string
): Promise<void> {
  const openai = getOpenAIClient();

  const prompt = `You are a memory manager for a startup AI companion. Given the existing summary and the latest exchange, produce an updated rolling summary of key facts about this user and their startup. Keep it under 10 bullet points. Focus on: company details, current goals, blockers, decisions made, key metrics, emotional state.

EXISTING SUMMARY:
${existingSummary || "(none yet)"}

LATEST EXCHANGE:
User: ${userMessage}
Assistant: ${assistantMessage}

Respond with ONLY the updated bullet-point summary, nothing else.`;

  try {
    const completion = await openai.chat.completions.create({
      model: getModel(),
      messages: [{role: "user", content: prompt}],
      max_tokens: 512,
      temperature: 0.3,
    });

    const newSummary =
      completion.choices[0]?.message?.content || existingSummary;

    await db.doc(`users/${uid}/memory/latest`).set(
      {
        summaryText: newSummary,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      {merge: true}
    );
  } catch (err) {
    console.error("Memory summarization error:", err);
  }
}

// ---------------------------------------------------------------------------
// User creation trigger — initialize user doc
// ---------------------------------------------------------------------------

export const onUserCreated = functions.auth.user().onCreate(async (user) => {
  const tomorrow = new Date();
  tomorrow.setUTCHours(24, 0, 0, 0);

  await db.doc(`users/${user.uid}`).set({
    email: user.email || "",
    name: user.displayName || "",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    plan: "free",
    usage: {
      dailyCount: 0,
      dailyLimit: 20,
      resetAt: admin.firestore.Timestamp.fromDate(tomorrow),
    },
    preferences: {
      defaultMode: "cofounder",
      quoteNotifEnabled: true,
      quoteNotifTime: "08:00",
      checkinNotifEnabled: true,
      checkinNotifTime: "09:00",
    },
  });
});
