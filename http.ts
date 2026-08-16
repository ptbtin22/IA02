import express, { Request, Response } from "express";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createTodoServer } from "./src/todo-server.js";
import { bearerAuthGuard, getApiKey } from "./src/middleware/auth.js";
import { restRouter } from "./src/routes/rest.js";

const app = express();
app.use(express.json());

// 1. Bearer Token Auth Guard on /mcp
app.use("/mcp", bearerAuthGuard);

// 2. MCP Streamable HTTP Route
app.post("/mcp", async (req: Request, res: Response) => {
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // Stateless mode: no session tracking
  });

  res.on("close", () => {
    transport.close();
  });

  const server = createTodoServer();
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

// 3. Parallel REST API Router
app.use("/api", restRouter);

// 4. Health Check Endpoint
app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "alive", timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
  console.log(`- MCP Endpoint: http://localhost:${PORT}/mcp`);
  console.log(`- REST API:     http://localhost:${PORT}/api/tasks`);
  console.log(`- Auth Key:     ${getApiKey()}`);
});
