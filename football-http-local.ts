import express, { Request, Response } from "express";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createFootballServer } from "./src/servers/football.js";
import { createTodoServer } from "./src/servers/todo.js";
import { bearerAuthGuard, getApiKey } from "./src/middleware/auth.js";

const app = express();
app.use(express.json());

// If running on Render Cloud (detected via process.env.RENDER or process.env.MCP_KEY), serve Todo Server.
// Otherwise locally, serve Football Server.
const isRenderCloud = Boolean(process.env.RENDER || (process.env.PORT && process.env.MCP_KEY));
const serverInstance = isRenderCloud ? createTodoServer() : createFootballServer();

if (process.env.MCP_KEY) {
  app.use("/mcp", bearerAuthGuard);
}

// MCP Endpoint (/mcp)
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
    server: isRenderCloud ? "todo-http-public" : "football-http-local",
    timestamp: new Date().toISOString(),
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌐 Server (${isRenderCloud ? "Todo Public Render" : "Football Local"}) listening on port ${PORT}`);
  console.log(`- MCP Endpoint: /mcp`);
  console.log(`- Health Check: /health`);
});
