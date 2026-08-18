import fs from "node:fs/promises";
import type { ChatMessage } from "./types.js";

const SESSION_FILE = "./session.json";

/**
 * Load persistent session history from disk
 */
export async function loadSession(systemPrompt: string): Promise<ChatMessage[]> {
  try {
    const data = await fs.readFile(SESSION_FILE, "utf8");
    const parsed = JSON.parse(data) as ChatMessage[];
    // Ensure system prompt is up to date
    if (parsed.length > 0 && parsed[0].role === "system") {
      parsed[0].content = systemPrompt;
    }
    return parsed;
  } catch (e) {
    return [{ role: "system", content: systemPrompt }];
  }
}

/**
 * Save current session history to disk, keeping capped at max 20 recent messages
 */
export async function saveSession(messages: ChatMessage[]): Promise<void> {
  try {
    const pruned = pruneMessages(messages, 20);
    await fs.writeFile(SESSION_FILE, JSON.stringify(pruned, null, 2), "utf8");
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
