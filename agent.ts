import type { AdvertisedTool, ChatMessage } from "./src/types.js";
import { loadSkillsIndex } from "./src/skills.js";
import { loadMcpClients } from "./src/mcp-loader.js";
import { getChatCompletion } from "./src/llm.js";

/**
 * Main Agent Execution Loop
 */
async function main(): Promise<void> {
  const userPrompt = process.argv[2] || "Standup time - what's on today?";
  console.log(`\n🤖 User Ask: "${userPrompt}"\n`);

  // 1. Load skills & MCP clients
  const skills = loadSkillsIndex();
  const { clientsMap, allMcpTools } = await loadMcpClients();

  // 2. Local tool: use_skill
  const localTools: AdvertisedTool[] = [
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

  // 3. Merge MCP tools with local tools
  const advertisedTools: AdvertisedTool[] = [
    ...localTools,
    ...allMcpTools.map((t) => ({
      type: "function" as const,
      function: {
        name: t.name,
        description: t.description,
        parameters: (t.inputSchema as Record<string, unknown>) || { type: "object", properties: {} },
      },
    })),
  ];

  // 4. System prompt with progressive disclosure instructions
  const skillsListStr = skills.map((s) => `- ${s.name}: ${s.description}`).join("\n");
  const systemPrompt = `You are a helpful AI coding and task management agent.
Available skills:
${skillsListStr || "(No skills found)"}

If a user request matches a skill, call use_skill FIRST, then follow its steps.`;

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];

  let turn = 0;
  const MAX_TURNS = 10;

  while (turn < MAX_TURNS) {
    turn++;
    console.log(`--- Agent Loop Turn ${turn} ---`);

    const assistantMsg = await getChatCompletion(messages, advertisedTools);
    messages.push(assistantMsg);

    if (!assistantMsg.tool_calls || assistantMsg.tool_calls.length === 0) {
      console.log(`\n💬 Agent Response:\n${assistantMsg.content}\n`);
      break;
    }

    for (const toolCall of assistantMsg.tool_calls) {
      const fnName = toolCall.function.name;
      const fnArgs = typeof toolCall.function.arguments === "string"
        ? (JSON.parse(toolCall.function.arguments || "{}") as Record<string, unknown>)
        : toolCall.function.arguments;

      console.log(`🛠️ Call Tool: ${fnName}(${JSON.stringify(fnArgs)})`);

      let resultText = "";

      if (fnName === "use_skill") {
        const skillName = String(fnArgs.name || "");
        const skill = skills.find((s) => s.name === skillName);
        resultText = skill ? skill.fullContent : `Skill ${skillName} not found.`;
        console.log(`   -> Loaded skill instructions for "${skillName}"`);
      } else if (clientsMap.has(fnName)) {
        const client = clientsMap.get(fnName)!;
        const res = await client.callTool({ name: fnName, arguments: fnArgs });
        if (Array.isArray(res.content)) {
          resultText = res.content
            .map((c) => (c.type === "text" ? c.text : JSON.stringify(c)))
            .join("\n");
        } else {
          resultText = JSON.stringify(res);
        }
        console.log(`   -> MCP Tool Result: ${resultText}`);
      } else {
        resultText = `Unknown tool: ${fnName}`;
      }

      messages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        name: fnName,
        content: resultText,
      });
    }
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal Agent Error:", err);
  process.exit(1);
});
