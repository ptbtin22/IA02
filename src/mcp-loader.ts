import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { Tool as McpTool, Resource as McpResource, Prompt as McpPrompt } from "@modelcontextprotocol/sdk/types.js";
import fs from "node:fs";
import type { LoadedMcpClients, McpConfig } from "./types.js";

const CONFIG_PATH = process.env.MCP_CONFIG || "config.json";

/**
 * Replace environment variable placeholders (${VAR_NAME}) in header strings
 */
function interpolateEnvVars(headers?: Record<string, string>): Record<string, string> {
  if (!headers) return {};
  const resolved: Record<string, string> = {};
  for (const [key, val] of Object.entries(headers)) {
    resolved[key] = val.replace(/\$\{([^}]+)\}/g, (_, envName) => process.env[envName] || "");
  }
  return resolved;
}

/**
 * Connect to configured MCP servers (stdio and HTTP) defined in config.json
 */
export async function loadMcpClients(): Promise<LoadedMcpClients> {
  const clientsMap = new Map<string, Client>(); // toolName -> client
  const allMcpTools: McpTool[] = [];
  const allMcpResources: McpResource[] = [];
  const allMcpPrompts: McpPrompt[] = [];

  if (!fs.existsSync(CONFIG_PATH)) {
    console.error(`Config file ${CONFIG_PATH} not found. Skipping MCP clients.`);
    return { clientsMap, allMcpTools, allMcpResources, allMcpPrompts };
  }

  const config: McpConfig = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
  const mcpServers = config.mcpServers || {};

  for (const [serverName, serverConf] of Object.entries(mcpServers)) {
    try {
      const client = new Client({ name: `host-agent-${serverName}`, version: "1.0.0" });
      let transport;

      if (serverConf.command) {
        transport = new StdioClientTransport({
          command: serverConf.command,
          args: serverConf.args || [],
        });
      } else if (serverConf.url) {
        const resolvedHeaders = interpolateEnvVars(serverConf.headers);
        transport = new StreamableHTTPClientTransport(new URL(serverConf.url), {
          requestInit: {
            headers: resolvedHeaders,
          },
        });
      }

      if (transport) {
        await client.connect(transport);

        // Fetch Tools, Resources, and Prompts from server
        const { tools } = await client.listTools().catch(() => ({ tools: [] }));
        const { resources } = await client.listResources().catch(() => ({ resources: [] }));
        const { prompts } = await client.listPrompts().catch(() => ({ prompts: [] }));

        for (const t of tools) {
          clientsMap.set(t.name, client);
          allMcpTools.push(t);
        }
        allMcpResources.push(...resources);
        allMcpPrompts.push(...prompts);

        console.error(
          `Connected to MCP server: ${serverName} (${tools.length} tools, ${resources.length} resources, ${prompts.length} prompts)`
        );
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error(`Failed to connect to MCP server ${serverName}:`, errorMsg);
    }
  }

  return { clientsMap, allMcpTools, allMcpResources, allMcpPrompts };
}
