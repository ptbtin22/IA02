try {
  process.loadEnvFile(".env");
} catch {
  // .env not present — OK in production
}

import express, { Request, Response } from "express";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createFootballServer } from "./src/servers/football.js";

const app = express();
app.use(express.json());

// Singleton Football Server Instance
const footballServer = createFootballServer();

// MCP Endpoint (/mcp)
app.post("/mcp", async (req: Request, res: Response) => {
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });

  res.on("close", () => {
    transport.close();
  });

  await footballServer.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

// Health Check Endpoint (/health)
app.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "alive",
    server: "football-http-local",
    timestamp: new Date().toISOString(),
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`⚽ Football Data Local HTTP Server listening on port ${PORT}`);
  console.log(`- MCP Endpoint: http://localhost:${PORT}/mcp`);
  console.log(`- Health Check: http://localhost:${PORT}/health`);
});
