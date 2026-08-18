import express, { Request, Response } from "express";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createTodoServer } from "./src/servers/todo.js";
import { createFootballServer } from "./src/servers/football.js";
import { bearerAuthGuard, getApiKey } from "./src/middleware/auth.js";

const app = express();
app.use(express.json());

// Detect if running on Render Cloud (via process.env.RENDER or process.env.MCP_KEY)
const isCloud = Boolean(process.env.RENDER || (process.env.PORT && process.env.MCP_KEY));
const serverInstance = isCloud ? createTodoServer() : createFootballServer();

// Bearer Token Auth Guard on public /mcp (If MCP_KEY is set in environment)
if (process.env.MCP_KEY) {
  app.use("/mcp", bearerAuthGuard);
}

// MCP Streamable HTTP Route
app.post("/mcp", async (req: Request, res: Response) => {
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });

  res.on("close", () => {
    transport.close();
  });

  await serverInstance.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

// Health Check Endpoint (/health)
app.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "alive",
    server: isCloud ? "todo-http-public" : "football-http-local",
    timestamp: new Date().toISOString(),
  });
});

const PORT = process.env.PORT || 3000;
const hostUrl = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;

app.listen(PORT, () => {
  console.log(`🌐 MCP Server (${isCloud ? "Todo Public Render" : "Football Local"}) listening on port ${PORT}`);
  console.log(`- MCP Endpoint: ${hostUrl}/mcp`);
  console.log(`- Health Check: ${hostUrl}/health`);
  if (process.env.MCP_KEY) {
    console.log(`- Auth Key:     ${getApiKey()}`);
  }
});
