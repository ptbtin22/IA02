try {
  process.loadEnvFile(".env");
} catch {
  // .env not present (production environment uses platform env vars)
}

import express, { Request, Response } from "express";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createTodoServer } from "./src/servers/todo.js";
import { bearerAuthGuard } from "./src/middleware/auth.js";

// Fail closed: exit immediately if MCP_KEY is not configured
if (!process.env.MCP_KEY) {
  console.error("❌ Fatal: MCP_KEY environment variable is not set. Server will not start without an auth key.");
  process.exit(1);
}

const app = express();
app.use(express.json());

// Singleton Todo Server Instance (Persistent task state)
const todoServer = createTodoServer();

// Bearer Token Auth Guard — always active on public /mcp endpoint
app.use("/mcp", bearerAuthGuard);

// MCP Endpoint (/mcp)
app.post("/mcp", async (req: Request, res: Response) => {
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });

  res.on("close", () => {
    transport.close();
  });

  await todoServer.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

// Health Check Endpoint (/health)
app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "alive", server: "todo-http-public", timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 4123;
const hostUrl = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;

app.listen(PORT, () => {
  console.log(`📋 Public Todo Task Management Server listening on port ${PORT}`);
  console.log(`- MCP Endpoint: ${hostUrl}/mcp`);
  console.log(`- Health Check: ${hostUrl}/health`);
});
