import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import type { AdvertisedTool, ChatMessage } from "./src/types.js";
import { loadSkillsIndex } from "./src/skills.js";
import { loadMcpClients } from "./src/mcp-loader.js";
import { getChatCompletion } from "./src/llm.js";
import { ia01LocalTools, executeLocalTool } from "./src/local-tools.js";
import { loadSession, saveSession, clearSession, pruneMessages } from "./src/session.js";
import {
  colors,
  printHeaderBanner,
  printServerStatus,
  printTurnBadge,
  printToolCallBadge,
  printToolResultPreview,
  printSkillBanner,
  printAgentResponse,
} from "./src/cli-ui.js";

/**
 * Execute a multi-step agent loop for a user prompt
 */
async function runQueryLoop(
  userPrompt: string,
  messages: ChatMessage[],
  advertisedTools: AdvertisedTool[],
  skills: ReturnType<typeof loadSkillsIndex>,
  clientsMap: Awaited<ReturnType<typeof loadMcpClients>>["clientsMap"],
  rl?: readline.Interface
): Promise<void> {
  messages.push({ role: "user", content: userPrompt });
  await saveSession(messages);

  let turn = 0;
  const MAX_TURNS = 15;

  while (turn < MAX_TURNS) {
    turn++;
    printTurnBadge(turn);

    const prunedHistory = pruneMessages(messages, 20);
    const assistantMsg = await getChatCompletion(prunedHistory, advertisedTools);
    messages.push(assistantMsg);
    await saveSession(messages);

    if (!assistantMsg.tool_calls || assistantMsg.tool_calls.length === 0) {
      printAgentResponse(assistantMsg.content || "(No response content)");
      break;
    }

    for (const toolCall of assistantMsg.tool_calls) {
      const fnName = toolCall.function.name;
      const fnArgs = typeof toolCall.function.arguments === "string"
        ? (JSON.parse(toolCall.function.arguments || "{}") as Record<string, unknown>)
        : toolCall.function.arguments;

      printToolCallBadge(fnName, fnArgs);

      let resultText = "";

      // 1. Skill tool loader
      if (fnName === "use_skill") {
        const skillName = String(fnArgs.name || "");
        const skill = skills.find((s) => s.name === skillName);
        resultText = skill ? skill.fullContent : `Skill ${skillName} not found.`;
        printSkillBanner(skillName);
      }
      // 2. IA01 Local File / Command tools
      else if (ia01LocalTools.some((t) => t.function.name === fnName)) {
        try {
          resultText = await executeLocalTool(fnName, fnArgs, rl);
          printToolResultPreview(resultText);
        } catch (err: unknown) {
          resultText = `Error: ${err instanceof Error ? err.message : String(err)}`;
          printToolResultPreview(resultText);
        }
      }
      // 3. MCP Server tools (stdio / HTTP)
      else if (clientsMap.has(fnName)) {
        const client = clientsMap.get(fnName)!;
        const res = await client.callTool({ name: fnName, arguments: fnArgs });
        if (Array.isArray(res.content)) {
          resultText = res.content
            .map((c) => (c.type === "text" ? c.text : JSON.stringify(c)))
            .join("\n");
        } else {
          resultText = JSON.stringify(res);
        }
        printToolResultPreview(resultText);
      } else {
        resultText = `Unknown tool: ${fnName}`;
        printToolResultPreview(resultText);
      }

      messages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        name: fnName,
        content: resultText,
      });
      await saveSession(messages);
    }
  }
}

/**
 * Main Agent Entry Point
 */
async function main(): Promise<void> {
  printHeaderBanner();

  const skills = loadSkillsIndex();
  const { clientsMap, allMcpTools, allMcpResources, allMcpPrompts } = await loadMcpClients();

  // Local tool: use_skill
  const skillTools: AdvertisedTool[] = [
    {
      type: "function",
      function: {
        name: "use_skill",
        description: "Load a skill's full procedural instructions by name",
        parameters: {
          type: "object",
          properties: {
            name: { type: "string", description: "Name of the skill to load" },
          },
          required: ["name"],
        },
      },
    },
  ];

  // Merge IA01 Local tools + Skill loader + MCP Server tools
  const advertisedTools: AdvertisedTool[] = [
    ...ia01LocalTools,
    ...skillTools,
    ...allMcpTools.map((t) => ({
      type: "function" as const,
      function: {
        name: t.name,
        description: t.description,
        parameters: (t.inputSchema as Record<string, unknown>) || { type: "object", properties: {} },
      },
    })),
  ];

  const skillsListStr = skills.map((s) => `- ${s.name}: ${s.description}`).join("\n");
  const resourcesListStr = allMcpResources.map((r) => `- ${r.uri} (${r.name}): ${r.description || ""}`).join("\n");
  const promptsListStr = allMcpPrompts.map((p) => `- ${p.name}: ${p.description || ""}`).join("\n");

  const systemPrompt = `You are an AI coding and task management agent built on IA01 + IA02 MCP Host architecture.

Available Skills:
${skillsListStr || "(No skills found)"}

Available MCP Resources:
${resourcesListStr || "(No resources found)"}

Available MCP Prompts:
${promptsListStr || "(No prompts found)"}

If a user request matches a skill, call use_skill FIRST, then follow its steps.`;

  let messages = await loadSession(systemPrompt);

  // Single-query mode if CLI argument provided
  if (process.argv[2]) {
    const userPrompt = process.argv.slice(2).join(" ");
    console.log(`\n🤖 User Ask: "${userPrompt}"\n`);
    await runQueryLoop(userPrompt, messages, advertisedTools, skills, clientsMap);
    process.exit(0);
  }

  // Interactive REPL Chat Mode
  console.log(`\n${colors.brightGreen}💬 Interactive MCP Agent Chat Mode Started!${colors.reset}`);
  console.log(`${colors.dim}Commands: Type 'reset' to clear session history. Type 'exit' or 'quit' to exit.${colors.reset}\n`);

  const rl = readline.createInterface({ input, output });

  try {
    while (true) {
      const userInput = await rl.question(`${colors.bold}${colors.brightCyan}You > ${colors.reset}`);
      const trimmed = userInput.trim();

      if (!trimmed) continue;
      if (trimmed.toLowerCase() === "exit" || trimmed.toLowerCase() === "quit") {
        console.log(`\n${colors.yellow}👋 Goodbye! Have a great day!${colors.reset}\n`);
        break;
      }
      if (trimmed.toLowerCase() === "clear" || trimmed.toLowerCase() === "reset") {
        messages = await clearSession(systemPrompt);
        console.log(`\n${colors.green}🧹 Session history cleared.${colors.reset}\n`);
        continue;
      }

      await runQueryLoop(trimmed, messages, advertisedTools, skills, clientsMap, rl);
    }
  } finally {
    rl.close();
    process.exit(0);
  }
}

main().catch((err) => {
  console.error("Fatal Agent Error:", err);
  process.exit(1);
});
