import fs from "node:fs/promises";
import type { ChatMessage } from "./types.js";

const SESSION_FILE = "./session.json";

/**
 * Load persistent session history from disk
 */
export async function loadSession(systemPrompt: string): Promise<ChatMessage[]> {
  try {
    const data = await fs.readFile(SESSION_FILE, "utf8");
    return JSON.parse(data);
  } catch (e) {
    return [{ role: "system", content: systemPrompt }];
  }
}

/**
 * Save current session history to disk
 */
export async function saveSession(messages: ChatMessage[]): Promise<void> {
  try {
    await fs.writeFile(SESSION_FILE, JSON.stringify(messages, null, 2), "utf8");
  } catch (e) {
    console.error("Failed to save session:", e);
  }
}

/**
 * Reset session history file and return fresh system prompt
 */
export async function clearSession(systemPrompt: string): Promise<ChatMessage[]> {
  try {
    await fs.unlink(SESSION_FILE);
  } catch (e) {
    // Ignore if file doesn't exist
  }
  return [{ role: "system", content: systemPrompt }];
}

/**
 * Prune conversation history to prevent context window overflow
 */
export function pruneMessages(messages: ChatMessage[], maxMessages = 20): ChatMessage[] {
  if (messages.length <= maxMessages) {
    return messages;
  }
  const systemMessage = messages[0];
  const recentMessages = messages.slice(-(maxMessages - 1));
  return [systemMessage, ...recentMessages];
}
