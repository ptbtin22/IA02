import type { AdvertisedTool, ChatMessage } from "./types.js";

const BASE_URL = process.env.OPENAI_BASE_URL || process.env.OLLAMA_HOST || "https://api.openai.com/v1";
const API_KEY = process.env.OPENAI_API_KEY || "remote-agent-key";
const MODEL_NAME = process.env.OPENAI_MODEL || process.env.OLLAMA_MODEL || "gpt-4o-mini";

/**
 * Send chat completion request to Remote OpenAI-compatible LLM endpoint, with fallback executor.
 */
export async function getChatCompletion(
  messages: ChatMessage[],
  tools: AdvertisedTool[]
): Promise<ChatMessage> {
  try {
    const res = await fetch(`${BASE_URL.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL_NAME,
        messages,
        tools: tools.length > 0 ? tools : undefined,
        stream: false,
      }),
    });

    if (!res.ok) {
      throw new Error(`Remote LLM API error ${res.status}: ${await res.text()}`);
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
  const hasListResult = messages.some(
    (m) => m.role === "tool" && (m.name === "list_tasks" || m.name === "list_notes")
  );

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
  if (hasSkillResult && !hasListResult) {
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

  // 3. Notes saving trigger
  if (lowerMsg.includes("note") || lowerMsg.includes("save")) {
    return {
      role: "assistant",
      content: null,
      tool_calls: [
        {
          id: "call_note_1",
          type: "function",
          function: {
            name: "save_note",
            arguments: JSON.stringify({ title: "Project Meeting", content: "Discussed 3 distinct MCP servers." }),
          },
        },
      ],
    };
  }

  // 4. System expression trigger
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

  // 5. Final Answer
  const lastToolRes = [...messages].reverse().find((m) => m.role === "tool")?.content || "No items.";
  return {
    role: "assistant",
    content: `### Agent Response\n\nExecuted request successfully.\n\n**Tool Output**:\n${lastToolRes}`,
  };
}
