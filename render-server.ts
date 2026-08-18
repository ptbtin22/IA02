import express, { Request, Response } from "express";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createTodoServer } from "./src/servers/todo.js";
import { restRouter } from "./src/routes/rest.js";
import { bearerAuthGuard, getApiKey } from "./src/middleware/auth.js";

const app = express();
app.use(express.json());

// Singleton Todo Server Instance (Persistent task state)
const todoServer = createTodoServer();

// Bearer Token Auth Guard on public /mcp (If MCP_KEY is set in environment)
if (process.env.MCP_KEY) {
  app.use("/mcp", bearerAuthGuard);
}

// Public Todo MCP Streamable HTTP Route
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

// Parallel Todo REST API Router
app.use("/api", restRouter);

// Health Check Endpoint
app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "alive", server: "todo-http-public", timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3000;
const hostUrl = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;

app.listen(PORT, () => {
  console.log(`📋 Public Todo Task Management Server listening on port ${PORT}`);
  console.log(`- MCP Endpoint: ${hostUrl}/mcp`);
  console.log(`- REST API:     ${hostUrl}/api/tasks`);
  console.log(`- Auth Key:     ${getApiKey()}`);
});
