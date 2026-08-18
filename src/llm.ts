import type { ChatMessage, AdvertisedTool } from "./types.js";

/**
 * Send Chat Completion request to Remote LLM endpoint (OpenAI JSON API spec)
 */
export async function getChatCompletion(
  messages: ChatMessage[],
  tools?: AdvertisedTool[]
): Promise<ChatMessage> {
  const apiKey = process.env.LLM_API_KEY || "";
  const baseUrl = process.env.LLM_BASE_URL || "";
  const model = process.env.LLM_MODEL || "";

  if (!apiKey || !baseUrl || !model) {
    console.warn("⚠️ [LLM API] Missing LLM_API_KEY, LLM_BASE_URL, or LLM_MODEL in process.env. Using mock fallback decision engine.");
    return mockAgentDecision(messages);
  }

  const endpoint = `${baseUrl.replace(/\/$/, "")}/chat/completions`;

  try {
    const payload: Record<string, unknown> = {
      model,
      messages,
      temperature: 0.2,
    };

    if (tools && tools.length > 0) {
      payload.tools = tools;
      payload.tool_choice = "auto";
    }

    console.log(`📡 [LLM API] Connecting to remote model: ${model} (${endpoint})...`);

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`⚠️ [LLM API Error ${res.status}]: ${errText}. Falling back to mock decision engine.`);
      return mockAgentDecision(messages);
    }

    const data = (await res.json()) as {
      choices: Array<{
        message: ChatMessage;
      }>;
    };

    if (data.choices && data.choices.length > 0 && data.choices[0].message) {
      return data.choices[0].message;
    }

    console.warn("⚠️ [LLM API] Empty choices returned from LLM endpoint. Falling back to mock decision engine.");
    return mockAgentDecision(messages);
  } catch (err) {
    console.error("⚠️ [LLM API Fetch Error]:", err, "Falling back to mock decision engine.");
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

  const lastMsg = messages[messages.length - 1];

  // 1. Synthesize output if previous message was a tool result
  if (lastMsg && lastMsg.role === "tool") {
    return synthesizeToolResult(lastMsg, loadedSkills, lowerMsg);
  }

  // 2. Direct intent triggers (Skills, Tasks, Predictions)
  return routeUserIntent(lowerMsg, userText);
}

/**
 * Handle multi-turn tool result synthesis in Fallback Mode
 */
function synthesizeToolResult(
  lastMsg: ChatMessage,
  loadedSkills: string[],
  lowerMsg: string
): ChatMessage {
  // A. Skill Tool Activation Response
  if (lastMsg.name === "use_skill") {
    const skillContent = lastMsg.content || "";
    if (skillContent.includes("matchday-briefing")) {
      return createToolCallMsg("call_football_standings", "get_competition_standings", { competition: "PL" });
    }
    if (skillContent.includes("daily-standup")) {
      return createToolCallMsg("call_list_tasks", "list_tasks", {});
    }
    if (skillContent.includes("travel-weather-planner")) {
      return createToolCallMsg("call_weather_current", "get_current_weather", { city: "Saigon" });
    }
  }

  // B. Weather Skill Pipeline
  if (lastMsg.name === "get_current_weather") {
    if (loadedSkills.some((s) => s.includes("travel-weather-planner"))) {
      return createToolCallMsg("call_weather_forecast", "get_weather_forecast", { city: "Saigon", days: 3 });
    }
    return { role: "assistant", content: `### 🌤️ Weather Report\n\n${lastMsg.content}` };
  }

  if (lastMsg.name === "get_weather_forecast") {
    return createToolCallMsg("call_air_quality", "get_air_quality", { city: "Saigon" });
  }

  if (lastMsg.name === "get_air_quality") {
    return {
      role: "assistant",
      content: `### 🌤️ Travel Weather Advisory & Packing Guide — Saigon\n\n- 🌡️ **Current Weather**: 32°C Partly Cloudy (Feels like 35°C)\n- 📅 **3-Day Forecast**:\n  - Day 1: 26°C - 34°C (Sunny with afternoon showers)\n  - Day 2: 25°C - 33°C (Partly Cloudy)\n  - Day 3: 26°C - 34°C (Hot & Humid)\n- 😷 **Air Quality**: AQI 55 (Moderate / Acceptable)\n- 🧳 **Packing Checklist**: Light cotton clothes, sunglasses, sunscreen, and a compact umbrella for afternoon rain.`,
    };
  }

  // C. Football Briefing Response
  if (lastMsg.name === "get_competition_standings") {
    return {
      role: "assistant",
      content: `### ⚽ Premier League Matchday Briefing & Title Race Breakdown\n\n${lastMsg.content}\n\n### 📝 Title Race Analysis:\n- **Arsenal & Liverpool** are level on 64 points, with Arsenal leading on goal difference (+45 vs +39).\n- **Manchester City** is just 1 point behind (63 pts), keeping the title race extremely tight!`,
    };
  }

  // D. Task List & Task Operation Responses
  if (lastMsg.name === "list_tasks") {
    if (loadedSkills.some((s) => s.includes("daily-standup"))) {
      const rawContent = lastMsg.content || "";
      const lines = rawContent.split("\n").filter(Boolean);
      const doneTasks = lines
        .filter((l) => l.includes("✅"))
        .map((l) => l.replace(/^\d+\s*✅\s*/, ""))
        .join("\n- ");
      const openTasks = lines
        .filter((l) => l.includes("⬜"))
        .map((l) => l.replace(/^\d+\s*⬜\s*/, ""))
        .join("\n- ");

      return {
        role: "assistant",
        content: `### 🎤 Daily Standup Report\n\n**✅ Done**\n${doneTasks ? `- ${doneTasks}` : "- None"}\n\n**⬜ Today**\n${openTasks ? `- ${openTasks}` : "- None"}\n\n**🚫 Blockers**\n- None`,
      };
    }

    if (
      lowerMsg.includes("complete") ||
      lowerMsg.includes("done") ||
      lowerMsg.includes("mark") ||
      lowerMsg.includes("finish") ||
      lowerMsg.includes("delete") ||
      lowerMsg.includes("remove")
    ) {
      const targetId = lowerMsg.includes("laundry") || lowerMsg.includes("2") || lowerMsg.includes("second") ? 2 : 1;
      return createToolCallMsg("call_complete_task_from_list", "complete_task", { id: targetId });
    }

    return {
      role: "assistant",
      content: `### 📋 Your Active Tasks\n\n${lastMsg.content}\n\nWhat would you like to work on next?`,
    };
  }

  if (lastMsg.name === "add_task") {
    return { role: "assistant", content: `✅ ${lastMsg.content}\n\nTask added successfully to your list!` };
  }

  if (lastMsg.name === "complete_task") {
    return { role: "assistant", content: `✅ ${lastMsg.content}\n\nTask marked as completed!` };
  }

  return { role: "assistant", content: `I've retrieved the requested data:\n\n${lastMsg.content}` };
}

/**
 * Route direct user query to appropriate skill or tool in Fallback Mode
 */
function routeUserIntent(lowerMsg: string, userText: string): ChatMessage {
  // 1. Skill Triggers
  if (lowerMsg.includes("standup") || lowerMsg.includes("today") || lowerMsg.includes("plan")) {
    return createToolCallMsg("call_skill_standup", "use_skill", { name: "daily-standup" });
  }
  if (
    lowerMsg.includes("briefing") ||
    lowerMsg.includes("matchday") ||
    lowerMsg.includes("title race") ||
    lowerMsg.includes("epl") ||
    lowerMsg.includes("football")
  ) {
    return createToolCallMsg("call_skill_matchday", "use_skill", { name: "matchday-briefing" });
  }
  if (
    lowerMsg.includes("travel") ||
    lowerMsg.includes("planner") ||
    lowerMsg.includes("packing") ||
    lowerMsg.includes("weather")
  ) {
    return createToolCallMsg("call_skill_travel", "use_skill", { name: "travel-weather-planner" });
  }

  // 2. Direct Task Completion Triggers
  if (
    lowerMsg.includes("done") ||
    lowerMsg.includes("complete") ||
    lowerMsg.includes("finish") ||
    lowerMsg.includes("mark") ||
    lowerMsg.includes("delete") ||
    lowerMsg.includes("remove")
  ) {
    const numMatch = userText.match(/\d+/);
    let taskId = numMatch ? parseInt(numMatch[0], 10) : 1;
    if (!numMatch && (lowerMsg.includes("laundry") || lowerMsg.includes("second") || lowerMsg.includes("2"))) {
      taskId = 2;
    }
    return createToolCallMsg("call_complete_task_direct", "complete_task", { id: taskId });
  }

  // 3. Direct Task Addition Triggers
  if (lowerMsg.includes("add") || lowerMsg.includes("create") || lowerMsg.includes("new task")) {
    const taskName = userText.replace(/please|add|task|todo|and|to|my|list/gi, "").trim() || "New Task";
    return createToolCallMsg("call_add_task_direct", "add_task", { text: taskName });
  }

  // 4. Direct Task Listing Triggers
  if (lowerMsg.includes("task") || lowerMsg.includes("todo") || lowerMsg.includes("list")) {
    return createToolCallMsg("call_list_tasks_direct", "list_tasks", {});
  }

  // 5. Conversational Reasoning Follow-ups
  if (lowerMsg.includes("who") || lowerMsg.includes("win") || lowerMsg.includes("predict") || lowerMsg.includes("favorite")) {
    return {
      role: "assistant",
      content: "### 🏆 Title Race Reasoning & Prediction\n\nAnalyzing current competition dynamics:\n- **Arsenal (+45 GD)** & **Liverpool (+39 GD)** lead on 64 points.\n- **Manchester City (63 pts)** trails by just 1 point and possesses unmatched experience in high-pressure title run-ins.\n\n**Verdict**: While Arsenal's defensive record gives them a slight goal-difference cushion, Manchester City remains the favorite to clinch the title due to their squad depth in the final stretch!",
    };
  }

  return {
    role: "assistant",
    content: `I'm ready to assist you! Ask me to manage your tasks, analyze football standings and title races, or check weather forecasts across your MCP servers.`,
  };
}

/**
 * Helper to construct assistant tool call response message
 */
function createToolCallMsg(callId: string, fnName: string, args: Record<string, unknown>): ChatMessage {
  return {
    role: "assistant",
    content: null,
    tool_calls: [
      {
        id: callId,
        type: "function",
        function: {
          name: fnName,
          arguments: JSON.stringify(args),
        },
      },
    ],
  };
}
