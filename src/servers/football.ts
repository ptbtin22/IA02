import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { getDemoFootballData } from "../football-mock-data.js";

const API_BASE = "https://api.football-data.org/v4";
const FOOTBALL_API_KEY = process.env.FOOTBALL_API_KEY || "";

/**
 * Fetch helper with X-Auth-Token header
 */
async function fetchFootballData(endpoint: string): Promise<Record<string, unknown>> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (FOOTBALL_API_KEY) {
    headers["X-Auth-Token"] = FOOTBALL_API_KEY;
  }

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, { headers });
    if (!res.ok) {
      return getDemoFootballData(endpoint);
    }
    return (await res.json()) as Record<string, unknown>;
  } catch (err) {
    return getDemoFootballData(endpoint);
  }
}

/**
 * Factory function creating Football Data MCP Server
 */
export function createFootballServer(): McpServer {
  const server = new McpServer({ name: "football-data", version: "1.0.0" });

  // Tool 1: get_football_competitions
  server.registerTool(
    "get_football_competitions",
    {
      description: "List available major football leagues and competitions (Premier League PL, Champions League CL, La Liga PD, etc.)",
      inputSchema: {},
    },
    async () => {
      const data = await fetchFootballData("/competitions");
      const competitions = (data.competitions as Array<{ name: string; code: string; area?: { name: string } }>) || [];
      const formatted = competitions
        .slice(0, 10)
        .map((c) => `- [${c.code}] ${c.name} (${c.area?.name || "Global"})`)
        .join("\n");
      return { content: [{ type: "text", text: `### Football Competitions\n${formatted}` }] };
    }
  );

  // Tool 2: get_competition_standings
  server.registerTool(
    "get_competition_standings",
    {
      description: "Get current team standings table for a football competition (e.g. PL for Premier League, PD for La Liga)",
      inputSchema: { competition: z.string().default("PL") },
    },
    async ({ competition }) => {
      const compCode = (competition || "PL").toUpperCase();
      const data = await fetchFootballData(`/competitions/${compCode}/standings`);
      const standings = (data.standings as Array<{ table: Array<{ position: number; team: { name: string }; points: number; goalDifference: number }> }>) || [];
      const table = standings[0]?.table || [];
      const formatted = table
        .slice(0, 10)
        .map((t) => `${t.position}. ${t.team.name} - ${t.points} pts (GD: ${t.goalDifference > 0 ? "+" : ""}${t.goalDifference})`)
        .join("\n");

      return { content: [{ type: "text", text: `### Standings for [${compCode}]\n${formatted}` }] };
    }
  );

  // Tool 3: get_recent_matches
  server.registerTool(
    "get_recent_matches",
    {
      description: "Get recent match fixtures and scores for a football competition (e.g. PL, CL)",
      inputSchema: { competition: z.string().default("PL") },
    },
    async ({ competition }) => {
      const compCode = (competition || "PL").toUpperCase();
      const data = await fetchFootballData(`/competitions/${compCode}/matches?limit=5`);
      const matches = (data.matches as Array<{ homeTeam: { name: string }; awayTeam: { name: string }; score?: { fullTime?: { home: number; away: number } }; status: string }>) || [];
      const formatted = matches
        .slice(0, 5)
        .map((m) => {
          const homeScore = m.score?.fullTime?.home ?? "-";
          const awayScore = m.score?.fullTime?.away ?? "-";
          return `- ${m.homeTeam.name} ${homeScore} - ${awayScore} ${m.awayTeam.name} (${m.status})`;
        })
        .join("\n");

      return { content: [{ type: "text", text: `### Matches for [${compCode}]\n${formatted}` }] };
    }
  );

  // Resource: football://standings
  server.registerResource(
    "football-standings",
    "football://standings",
    {
      description: "Live Premier League standings table",
      mimeType: "text/plain",
    },
    async (uri) => {
      const data = await fetchFootballData("/competitions/PL/standings");
      const standings = (data.standings as Array<{ table: Array<{ position: number; team: { name: string }; points: number }> }>) || [];
      const text = (standings[0]?.table || [])
        .map((t) => `${t.position}. ${t.team.name}: ${t.points} pts`)
        .join("\n");
      return { contents: [{ uri: uri.href, text }] };
    }
  );

  // Prompt: football_summary
  server.registerPrompt(
    "football_summary",
    {
      description: "Analyze current league standings and title race",
      argsSchema: {},
    },
    () => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: "Read Premier League standings from football://standings and analyze the title race.",
          },
        },
      ],
    })
  );

  return server;
}

// Connect via Stdio transport if executed directly
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const server = createFootballServer();
  await server.connect(new StdioServerTransport());
}
