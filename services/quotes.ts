import * as Crypto from "expo-crypto";
import quotesData from "@/data/quotes.json";
import type { Quote } from "@/types";

const quotes: Quote[] = quotesData as Quote[];

export function getAllQuotes(): Quote[] {
  return quotes;
}

/**
 * Returns a deterministic quote for the given user + date.
 * Uses SHA-256 hash of "uid-YYYY-MM-DD" so it stays the same on refresh.
 */
export async function getQuoteOfTheDay(
  uid: string,
  date: Date = new Date()
): Promise<Quote | null> {
  if (quotes.length === 0) return null;

  const dateStr = getDateString(date);
  const seed = `${uid}-${dateStr}`;

  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    seed
  );

  // Take first 8 hex chars → parse as int → mod by quote count
  const value = parseInt(hash.substring(0, 8), 16);
  const index = value % quotes.length;
  return quotes[index];
}

export function getDateString(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
