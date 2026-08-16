import type { AdvertisedTool, ChatMessage } from "./types.js";

const OLLAMA_HOST = process.env.OLLAMA_HOST || "http://localhost:11434";
const MODEL_NAME = process.env.OLLAMA_MODEL || "qwen3.5:4b";

/**
 * Send chat completion request to local Ollama LLM, with fallback when offline.
 */
export async function getChatCompletion(
  messages: ChatMessage[],
  tools: AdvertisedTool[]
): Promise<ChatMessage> {
  try {
    const res = await fetch(`${OLLAMA_HOST}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL_NAME,
        messages,
        tools,
        stream: false,
      }),
    });

    if (!res.ok) {
      throw new Error(`Ollama HTTP error ${res.status}: ${await res.text()}`);
    }

    const data = (await res.json()) as { choices: Array<{ message: ChatMessage }> };
    return data.choices[0].message;
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`Ollama connection error (${errorMsg}). Using local rule-based fallback...`);
    return mockAgentDecision(messages);
  }
}

/**
 * Fallback executor for demonstration/testing when local Ollama instance is offline
 */

export function mockAgentDecision(messages: ChatMessage[]): ChatMessage {
  const lastUserMsg = [...messages].reverse().find((m) => m.role === "user")?.content || "";
  const hasSkillResult = messages.some((m) => m.role === "tool" && m.name === "use_skill");
  const hasListResult = messages.some((m) => m.role === "tool" && m.name === "list_tasks");

  // Step 1: Trigger skill if standup requested
  if (
    !hasSkillResult &&
    (lastUserMsg.toLowerCase().includes("standup") || lastUserMsg.toLowerCase().includes("today"))
  ) {
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

  // Step 2: Trigger list_tasks if requested by skill
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

  // Step 3: Final response
  const tasksToolRes = [...messages].reverse().find((m) => m.name === "list_tasks")?.content || "No tasks yet.";
  return {
    role: "assistant",
    content: `### Daily Standup Report\n\n**Done**:\n- Read MCP spec\n\n**Today**:\n${tasksToolRes}\n\n**Blockers**:\n- None`,
  };
}
