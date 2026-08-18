import express, { Request, Response } from "express";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createFootballServer } from "./src/football-server.js";
import { bearerAuthGuard, getApiKey } from "./src/middleware/auth.js";

const app = express();
app.use(express.json());

// 1. Bearer Token Auth Guard on /mcp
app.use("/mcp", bearerAuthGuard);

// 2. MCP Streamable HTTP Route (Serving Football Data Server)
app.post("/mcp", async (req: Request, res: Response) => {
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // Stateless mode
  });

  res.on("close", () => {
    transport.close();
  });

  const server = createFootballServer();
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

// 3. Football REST API Router
app.get("/api/football", (_req: Request, res: Response) => {
  res.json({
    status: "active",
    apiProvider: "https://api.football-data.org/v4",
    timestamp: new Date().toISOString(),
  });
});

// 4. Health Check Endpoint
app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "alive", timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Football Data Server listening on port ${PORT}`);
  console.log(`- MCP Endpoint: http://localhost:${PORT}/mcp`);
  console.log(`- REST API:     http://localhost:${PORT}/api/football`);
  console.log(`- Auth Key:     ${getApiKey()}`);
});
