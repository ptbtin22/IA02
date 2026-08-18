import fs from "node:fs";
import type { AdvertisedTool, ChatMessage } from "./types.js";

// Load .env file automatically if present and log warning on error
if (fs.existsSync(".env")) {
  try {
    process.loadEnvFile(".env");
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.warn(`Warning: Failed to load .env file: ${errorMsg}`);
  }
}

/**
 * Get configured Remote LLM settings from environment variables strictly via LLM_*
 */
export function getLlmConfig() {
  const rawBaseUrl = process.env.LLM_BASE_URL || "";
  const apiKey = process.env.LLM_API_KEY || "";
  const modelName = process.env.LLM_MODEL || "";

  let baseUrl = rawBaseUrl.trim().replace(/\/$/, "");
  if (baseUrl && !baseUrl.endsWith("/chat/completions")) {
    baseUrl = `${baseUrl}/chat/completions`;
  }

  return { baseUrl, apiKey, modelName };
}

/**
 * Send chat completion request to Remote LLM endpoint
 */
export async function getChatCompletion(
  messages: ChatMessage[],
  tools: AdvertisedTool[]
): Promise<ChatMessage> {
  const { baseUrl, apiKey, modelName } = getLlmConfig();

  // Fallback if environment variables are not fully configured
  if (!apiKey || !baseUrl || !modelName) {
    console.error("⚠️ LLM configuration incomplete in environment variables (LLM_BASE_URL, LLM_API_KEY, LLM_MODEL). Using mock fallback executor...");
    return mockAgentDecision(messages);
  }

  try {
    const res = await fetch(baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelName,
        messages,
        tools: tools.length > 0 ? tools : undefined,
        stream: false,
      }),
    });

    if (!res.ok) {
      throw new Error(`LLM API error ${res.status}: ${await res.text()}`);
    }

    const data = (await res.json()) as { choices: Array<{ message: ChatMessage }> };
    return data.choices[0].message;
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`Remote LLM connection warning (${errorMsg}). Using local fallback...`);
    return mockAgentDecision(messages);
  }
}

/**
 * Fallback executor for demonstration when Remote LLM API is unconfigured or offline
 */
export function mockAgentDecision(messages: ChatMessage[]): ChatMessage {
  const lastUserMsg = [...messages].reverse().find((m) => m.role === "user")?.content || "";
  const lowerMsg = lastUserMsg.toLowerCase();

  const hasSkillResult = messages.some((m) => m.role === "tool" && m.name === "use_skill");
  const hasListTaskResult = messages.some((m) => m.role === "tool" && m.name === "list_tasks");
  const hasListNotesResult = messages.some((m) => m.role === "tool" && m.name === "list_notes");
  const hasSaveNoteResult = messages.some((m) => m.role === "tool" && m.name === "save_note");

  // If a tool was just executed in the previous step, stop the loop and answer the user!
  const lastMsg = messages[messages.length - 1];
  if (lastMsg && lastMsg.role === "tool") {
    return {
      role: "assistant",
      content: `### LLM Agent Response\n\nHere are the results:\n${lastMsg.content}`,
    };
  }

  // 1. Skill Trigger
  if (!hasSkillResult && (lowerMsg.includes("standup") || lowerMsg.includes("today"))) {
    return {
      role: "assistant",
      content: null,
      tool_calls: [
        {
          id: "call_skill_1",
          type: "function",
          function: {
            name: "use_skill",
            arguments: JSON.stringify({ name: "daily-standup" }),
          },
        },
      ],
    };
  }

  // 2. Skill follow up call list_tasks
  if (hasSkillResult && !hasListTaskResult) {
    return {
      role: "assistant",
      content: null,
      tool_calls: [
        {
          id: "call_list_1",
          type: "function",
          function: {
            name: "list_tasks",
            arguments: "{}",
          },
        },
      ],
    };
  }

  // 3. Notes listing trigger ("what notes", "list notes")
  if (!hasListNotesResult && (lowerMsg.includes("what note") || lowerMsg.includes("list note") || lowerMsg.includes("show note"))) {
    return {
      role: "assistant",
      content: null,
      tool_calls: [
        {
          id: "call_list_notes_1",
          type: "function",
          function: {
            name: "list_notes",
            arguments: "{}",
          },
        },
      ],
    };
  }

  // 4. Notes saving trigger
  if (!hasSaveNoteResult && (lowerMsg.includes("save note") || lowerMsg.includes("add note"))) {
    return {
      role: "assistant",
      content: null,
      tool_calls: [
        {
          id: "call_note_1",
          type: "function",
          function: {
            name: "save_note",
            arguments: JSON.stringify({ title: "Project Meeting", content: "Discussed FIT LLM service integration." }),
          },
        },
      ],
    };
  }

  // 5. System expression trigger
  if (lowerMsg.includes("calculate") || lowerMsg.includes("*") || lowerMsg.includes("+")) {
    return {
      role: "assistant",
      content: null,
      tool_calls: [
        {
          id: "call_calc_1",
          type: "function",
          function: {
            name: "calculate_expression",
            arguments: JSON.stringify({ expression: "15 * 84 + 10" }),
          },
        },
      ],
    };
  }

  // 6. Final Default Answer
  return {
    role: "assistant",
    content: "I have processed your request.",
  };
}
