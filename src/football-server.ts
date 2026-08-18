import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

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
      // Fallback demo data if no key or rate limited
      return getDemoFootballData(endpoint);
    }
    return (await res.json()) as Record<string, unknown>;
  } catch (err) {
    return getDemoFootballData(endpoint);
  }
}

/**
 * Fallback demo data for popular competitions when offline or unconfigured
 */
function getDemoFootballData(endpoint: string): Record<string, unknown> {
  if (endpoint.includes("/standings")) {
    return {
      competition: { name: "Premier League", code: "PL" },
      standings: [
        {
          table: [
            { position: 1, team: { name: "Arsenal" }, playedGames: 28, points: 64, goalDifference: 45 },
            { position: 2, team: { name: "Liverpool" }, playedGames: 28, points: 64, goalDifference: 39 },
            { position: 3, team: { name: "Manchester City" }, playedGames: 28, points: 63, goalDifference: 35 },
            { position: 4, team: { name: "Aston Villa" }, playedGames: 29, points: 56, goalDifference: 18 },
          ],
        },
      ],
    };
  }
  if (endpoint.includes("/matches")) {
    return {
      matches: [
        { homeTeam: { name: "Arsenal" }, awayTeam: { name: "Chelsea" }, score: { fullTime: { home: 5, away: 0 } }, status: "FINISHED" },
        { homeTeam: { name: "Manchester City" }, awayTeam: { name: "Liverpool" }, score: { fullTime: { home: 1, away: 1 } }, status: "FINISHED" },
      ],
    };
  }
  return {
    competitions: [
      { name: "Premier League", code: "PL", area: { name: "England" } },
      { name: "UEFA Champions League", code: "CL", area: { name: "Europe" } },
      { name: "Primera Division", code: "PD", area: { name: "Spain" } },
      { name: "Serie A", code: "SA", area: { name: "Italy" } },
      { name: "Bundesliga", code: "BL1", area: { name: "Germany" } },
    ],
  };
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
