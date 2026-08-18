import express, { Request, Response } from "express";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createFootballServer } from "./src/football-server.js";

const app = express();
app.use(express.json());

// Singleton Football Server Instance
const footballServer = createFootballServer();

// Local Unauthenticated Football MCP HTTP Route
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

// Football REST API Endpoint
app.get("/api/football", (_req: Request, res: Response) => {
  res.json({
    message: "Local Football Data REST Endpoint",
    supportedCompetitions: ["PL (Premier League)", "CL (Champions League)", "PD (La Liga)", "SA (Serie A)", "BL1 (Bundesliga)"],
  });
});

// Health Check Endpoint
app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "alive", server: "football-http-local", timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`⚽ Football Data Local HTTP Server listening on port ${PORT}`);
  console.log(`- MCP Endpoint: http://localhost:${PORT}/mcp (Local Unauthenticated)`);
  console.log(`- REST API:     http://localhost:${PORT}/api/football`);
});
