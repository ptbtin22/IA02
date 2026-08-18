import type { ChatMessage, AdvertisedTool } from "./types.js";

const LLM_BASE_URL = process.env.LLM_BASE_URL || "https://ai-fit.hcmus.edu.vn/openai";
const LLM_API_KEY = process.env.LLM_API_KEY || "";
const LLM_MODEL = process.env.LLM_MODEL || "Qwen3.6-27B";

/**
 * Send Chat Completion request to Remote LLM endpoint (OpenAI JSON API spec)
 */
export async function getChatCompletion(
  messages: ChatMessage[],
  tools?: AdvertisedTool[]
): Promise<ChatMessage> {
  if (!LLM_API_KEY) {
    return mockAgentDecision(messages);
  }

  const endpoint = `${LLM_BASE_URL.replace(/\/$/, "")}/chat/completions`;

  try {
    const payload: Record<string, unknown> = {
      model: LLM_MODEL,
      messages,
      temperature: 0.2,
    };

    if (tools && tools.length > 0) {
      payload.tools = tools;
      payload.tool_choice = "auto";
    }

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LLM_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`LLM Request failed (${res.status}): ${errText}`);
      return mockAgentDecision(messages);
    }

    const data = (await res.json()) as {
      choices: Array<{
        message: ChatMessage;
      }>;
    };

    return data.choices[0]?.message || mockAgentDecision(messages);
  } catch (err) {
    console.error("LLM fetch error:", err);
    return mockAgentDecision(messages);
  }
}

/**
 * Deterministic Fallback Executor when remote LLM API is unavailable or offline
 */
function mockAgentDecision(messages: ChatMessage[]): ChatMessage {
  const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
  const userText = lastUserMsg?.content || "";
  const lowerMsg = userText.toLowerCase();

  const loadedSkills = messages
    .filter((m) => m.role === "tool" && m.name === "use_skill")
    .map((m) => m.content || "");
  const hasLoadedAnySkill = loadedSkills.length > 0;

  const hasListTaskResult = messages.some((m) => m.role === "tool" && m.name === "list_tasks");
  const hasStandingsResult = messages.some((m) => m.role === "tool" && m.name === "get_competition_standings");
  const hasWeatherResult = messages.some((m) => m.role === "tool" && m.name === "get_current_weather");

  // 1. Skill Triggers (Calls use_skill FIRST)
  if (!hasLoadedAnySkill) {
    if (lowerMsg.includes("standup") || lowerMsg.includes("today") || lowerMsg.includes("plan")) {
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
    if (
      lowerMsg.includes("briefing") ||
      lowerMsg.includes("matchday") ||
      lowerMsg.includes("title race") ||
      lowerMsg.includes("epl") ||
      lowerMsg.includes("football")
    ) {
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
    if (
      lowerMsg.includes("travel") ||
      lowerMsg.includes("planner") ||
      lowerMsg.includes("packing") ||
      lowerMsg.includes("weather")
    ) {
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

  // 2. Multi-step execution after loading a Skill
  if (hasLoadedAnySkill) {
    const lastSkill = loadedSkills[loadedSkills.length - 1];

    if (lastSkill.includes("daily-standup")) {
      if (hasListTaskResult) {
        const lastToolRes = [...messages].reverse().find((m) => m.role === "tool" && m.name === "list_tasks");
        return {
          role: "assistant",
          content: `### 🎤 Daily Standup Summary\n\n${lastToolRes?.content || "No tasks available."}\n\n**Plan for Today**: Focus on completing open items.`,
        };
      }
      return {
        role: "assistant",
        content: null,
        tool_calls: [
          {
            id: "call_list_tasks",
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
      if (hasStandingsResult) {
        const lastStandings = [...messages].reverse().find((m) => m.role === "tool" && m.name === "get_competition_standings");
        return {
          role: "assistant",
          content: `### ⚽ Premier League Matchday Briefing & Title Race Breakdown\n\n${lastStandings?.content || ""}\n\n### 📝 Title Race Analysis:\n- **Arsenal & Liverpool** are level on 64 points, with Arsenal leading on goal difference (+45 vs +39).\n- **Manchester City** is just 1 point behind (63 pts), keeping the title race extremely tight!`,
        };
      }
      return {
        role: "assistant",
        content: null,
        tool_calls: [
          {
            id: "call_football_standings",
            type: "function",
            function: {
              name: "get_competition_standings",
              arguments: JSON.stringify({ competition: "PL" }),
            },
          },
          {
            id: "call_football_matches",
            type: "function",
            function: {
              name: "get_recent_matches",
              arguments: JSON.stringify({ competition: "PL" }),
            },
          },
        ],
      };
    }

    if (lastSkill.includes("travel-weather-planner")) {
      if (hasWeatherResult) {
        return {
          role: "assistant",
          content: "### 🌤️ Travel Weather Advisory — Saigon\n\n- **Current**: 32°C Partly Cloudy (AQI: 55 Good)\n- **3-Day Forecast**: Warm and sunny, light afternoon showers expected.\n- **Packing Recommendation**: Light cotton clothing, sunscreen, and a compact umbrella.",
        };
      }
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
    if (hasListTaskResult) {
      const lastToolRes = [...messages].reverse().find((m) => m.role === "tool" && m.name === "list_tasks");
      return {
        role: "assistant",
        content: `Here are your current tasks:\n\n${lastToolRes?.content || "No tasks found."}`,
      };
    }
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

  return {
    role: "assistant",
    content: `I've processed your query for "${userText}". How else can I assist you with your tasks, weather, or football briefings?`,
  };
}
