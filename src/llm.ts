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

  const loadedSkills = messages
    .filter((m) => m.role === "tool" && m.name === "use_skill")
    .map((m) => m.content || "");
  const hasLoadedAnySkill = loadedSkills.length > 0;

  const hasListTaskResult = messages.some((m) => m.role === "tool" && m.name === "list_tasks");
  const hasStandingsResult = messages.some((m) => m.role === "tool" && m.name === "get_competition_standings");

  // 1. Skill Triggers (Calls use_skill FIRST)
  if (!hasLoadedAnySkill) {
    if (lowerMsg.includes("standup") || lowerMsg.includes("today")) {
      return {
        role: "assistant",
        content: null,
        tool_calls: [
          {
            id: "call_skill_standup",
            type: "function",
            function: {
              name: "use_skill",
              arguments: JSON.stringify({ name: "daily-standup" }),
            },
          },
        ],
      };
    }
    if (lowerMsg.includes("briefing") || lowerMsg.includes("matchday")) {
      return {
        role: "assistant",
        content: null,
        tool_calls: [
          {
            id: "call_skill_matchday",
            type: "function",
            function: {
              name: "use_skill",
              arguments: JSON.stringify({ name: "matchday-briefing" }),
            },
          },
        ],
      };
    }
    if (lowerMsg.includes("travel") || lowerMsg.includes("planner") || lowerMsg.includes("packing")) {
      return {
        role: "assistant",
        content: null,
        tool_calls: [
          {
            id: "call_skill_travel",
            type: "function",
            function: {
              name: "use_skill",
              arguments: JSON.stringify({ name: "travel-weather-planner" }),
            },
          },
        ],
      };
    }
  }

  // 2. Skill follow-ups after loading skill instructions
  if (hasLoadedAnySkill && !hasListTaskResult && !hasStandingsResult) {
    const lastSkill = loadedSkills[loadedSkills.length - 1];
    if (lastSkill.includes("daily-standup")) {
      return {
        role: "assistant",
        content: null,
        tool_calls: [
          {
            id: "call_list_tasks_1",
            type: "function",
            function: {
              name: "list_tasks",
              arguments: "{}",
            },
          },
        ],
      };
    }
    if (lastSkill.includes("matchday-briefing")) {
      return {
        role: "assistant",
        content: null,
        tool_calls: [
          {
            id: "call_football_1",
            type: "function",
            function: {
              name: "get_competition_standings",
              arguments: JSON.stringify({ competition: "PL" }),
            },
          },
        ],
      };
    }
    if (lastSkill.includes("travel-weather-planner")) {
      return {
        role: "assistant",
        content: null,
        tool_calls: [
          {
            id: "call_weather_1",
            type: "function",
            function: {
              name: "get_current_weather",
              arguments: JSON.stringify({ city: "Saigon" }),
            },
          },
        ],
      };
    }
  }

  // 3. Direct Tool Calls if no skill matched
  if (lowerMsg.includes("task") || lowerMsg.includes("todo")) {
    return {
      role: "assistant",
      content: null,
      tool_calls: [
        {
          id: "call_list_tasks_direct",
          type: "function",
          function: {
            name: "list_tasks",
            arguments: "{}",
          },
        },
      ],
    };
  }

  if (lowerMsg.includes("weather") || lowerMsg.includes("temp") || lowerMsg.includes("forecast")) {
    return {
      role: "assistant",
      content: null,
      tool_calls: [
        {
          id: "call_weather_direct",
          type: "function",
          function: {
            name: "get_current_weather",
            arguments: JSON.stringify({ city: "Saigon" }),
          },
        },
      ],
    };
  }

  if (lowerMsg.includes("match") || lowerMsg.includes("standing") || lowerMsg.includes("football")) {
    return {
      role: "assistant",
      content: null,
      tool_calls: [
        {
          id: "call_football_direct",
          type: "function",
          function: {
            name: "get_competition_standings",
            arguments: JSON.stringify({ competition: "PL" }),
          },
        },
      ],
    };
  }

  // 4. Final Answer
  const lastToolRes = [...messages].reverse().find((m) => m.role === "tool")?.content || "Executed.";
  return {
    role: "assistant",
    content: `### LLM Agent Response\n\nExecuted request successfully using available tools.\n\n**Output**:\n${lastToolRes}`,
  };
}
