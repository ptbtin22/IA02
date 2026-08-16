import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import type { Tool as McpTool } from "@modelcontextprotocol/sdk/types.js";

/**
 * Task item data structure
 */
export interface Task {
  id: number;
  text: string;
  done: boolean;
}

/**
 * Skill metadata and content index
 */
export interface SkillIndex {
  name: string;
  description: string;
  filePath: string;
  fullContent: string;
}

/**
 * Single MCP Server Configuration in config.json
 */
export interface McpServerConfig {
  command?: string;
  args?: string[];
  url?: string;
  headers?: Record<string, string>;
}

/**
 * Full config.json file structure
 */
export interface McpConfig {
  mcpServers?: Record<string, McpServerConfig>;
}

/**
 * Tool call emitted by LLM
 */
export interface ToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string | Record<string, unknown>;
  };
}

/**
 * LLM Chat Message structure
 */
export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content?: string | null;
  name?: string;
  tool_call_id?: string;
  tool_calls?: ToolCall[];
}

/**
 * OpenAI-compatible Tool Schema passed to LLM
 */
export interface AdvertisedTool {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
}

/**
 * Loaded MCP clients map and tool list
 */
export interface LoadedMcpClients {
  clientsMap: Map<string, Client>;
  allMcpTools: McpTool[];
}
