import express, { Request, Response } from "express";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createTodoServer } from "./src/todo-server.js";
import { createFootballServer } from "./src/football-server.js";
import { restRouter } from "./src/routes/rest.js";
import { bearerAuthGuard, getApiKey } from "./src/middleware/auth.js";

const app = express();
app.use(express.json());

// 1. Singleton MCP Server Instances
const todoServer = createTodoServer();
const footballServer = createFootballServer();

// 2. Bearer Token Auth Guard on public /mcp (If MCP_KEY is set in environment)
if (process.env.MCP_KEY) {
  app.use("/mcp", bearerAuthGuard);
}

// 3. MCP Endpoint 1: Public Todo Task Server (/mcp)
app.post("/mcp", async (req: Request, res: Response) => {
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });
  res.on("close", () => transport.close());
  await todoServer.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

// 4. MCP Endpoint 2: Local Football Data HTTP Server (/football)
app.post("/football", async (req: Request, res: Response) => {
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });
  res.on("close", () => transport.close());
  await footballServer.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

// 5. Parallel Todo REST API Router
app.use("/api", restRouter);

// 6. Health Check Endpoint
app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "alive", timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Express HTTP Server listening on port ${PORT}`);
  console.log(`- Todo Public MCP:   http://localhost:${PORT}/mcp`);
  console.log(`- Football Local MCP: http://localhost:${PORT}/football`);
  console.log(`- Todo REST API:      http://localhost:${PORT}/api/tasks`);
  console.log(`- Auth Key:           ${getApiKey()}`);
});
