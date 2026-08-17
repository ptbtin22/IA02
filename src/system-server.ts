import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import os from "node:os";
import { z } from "zod";

/**
 * Get formatted system information text
 */
export function getSystemInfoText(): string {
  const freeMemGb = (os.freemem() / (1024 * 1024 * 1024)).toFixed(2);
  const totalMemGb = (os.totalmem() / (1024 * 1024 * 1024)).toFixed(2);
  const uptimeMins = (os.uptime() / 60).toFixed(1);

  return [
    `OS Platform: ${os.platform()} (${os.arch()})`,
    `Memory: ${freeMemGb} GB free / ${totalMemGb} GB total`,
    `Uptime: ${uptimeMins} minutes`,
    `CPUs: ${os.cpus().length} cores (${os.cpus()[0]?.model || "unknown"})`,
  ].join("\n");
}

/**
 * Currency conversion rates (static relative to USD)
 */
const RATES: Record<string, number> = {
  USD: 1,
  EUR: 0.92,
  VND: 25400,
  JPY: 155,
  GBP: 0.79,
};

/**
 * Safe currency converter
 */
export function convertCurrency(amount: number, fromStr: string, toStr: string): string {
  const from = fromStr.trim().toUpperCase();
  const to = toStr.trim().toUpperCase();

  if (!RATES[from] || !RATES[to]) {
    return `Supported currencies: ${Object.keys(RATES).join(", ")}`;
  }

  const amountInUsd = amount / RATES[from];
  const converted = (amountInUsd * RATES[to]).toFixed(2);
  return `${amount} ${from} = ${converted} ${to}`;
}

/**
 * Safe Math expression evaluator
 */
export function calculateExpression(expr: string): string {
  try {
    const cleanExpr = expr.replace(/[^0-9+\-*/().\s]/g, "");
    if (!cleanExpr) return "Error: Invalid math expression";
    // eslint-disable-next-line no-new-func
    const fn = new Function(`return (${cleanExpr})`);
    const result = fn();
    return `${expr} = ${result}`;
  } catch (err: unknown) {
    return `Error evaluating expression: ${err instanceof Error ? err.message : String(err)}`;
  }
}

/**
 * Factory function creating System & Utility MCP Server
 */
export function createSystemServer(): McpServer {
  const server = new McpServer({ name: "system-utility", version: "1.0.0" });

  // Tool 1: get_system_info
  server.registerTool(
    "get_system_info",
    {
      description: "Get OS platform, memory usage, CPU, and system uptime details",
      inputSchema: {},
    },
    async () => ({
      content: [{ type: "text", text: getSystemInfoText() }],
    })
  );

  // Tool 2: calculate_expression
  server.registerTool(
    "calculate_expression",
    {
      description: "Safely evaluate a mathematical expression (e.g. 15 * 84 + 10)",
      inputSchema: { expression: z.string() },
    },
    async ({ expression }) => ({
      content: [{ type: "text", text: calculateExpression(expression) }],
    })
  );

  // Tool 3: convert_currency
  server.registerTool(
    "convert_currency",
    {
      description: "Convert currency amounts (USD, EUR, VND, JPY, GBP)",
      inputSchema: { amount: z.number(), from: z.string(), to: z.string() },
    },
    async ({ amount, from, to }) => ({
      content: [{ type: "text", text: convertCurrency(amount, from, to) }],
    })
  );

  // Resource: system://info
  server.registerResource(
    "system-info",
    "system://info",
    {
      description: "Live system metrics and hardware status",
      mimeType: "text/plain",
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          text: getSystemInfoText(),
        },
      ],
    })
  );

  // Prompt: system_audit
  server.registerPrompt(
    "system_audit",
    {
      description: "Audit system resources and memory status",
      argsSchema: {},
    },
    () => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: "Check system metrics from system://info and output a health report.",
          },
        },
      ],
    })
  );

  return server;
}
