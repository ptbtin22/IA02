import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { fileURLToPath } from "node:url";
import { z } from "zod";

/**
 * Weather & Forecast MCP Server (Stdio)
 */
export function createWeatherServer(): McpServer {
  const server = new McpServer({ name: "weather", version: "1.0.0" });

  // Tool 1: get_current_weather
  server.registerTool(
    "get_current_weather",
    {
      description: "Get current weather temperature and conditions for a city (e.g. Saigon, Hanoi, London, Tokyo)",
      inputSchema: { city: z.string().default("Saigon") },
    },
    async ({ city }) => {
      const cityName = city || "Saigon";
      return {
        content: [
          {
            type: "text",
            text: `### Current Weather in ${cityName}\n- Temperature: 32°C (Feels like 36°C)\n- Condition: Partly Cloudy ⛅\n- Humidity: 70%\n- Wind: 12 km/h SW`,
          },
        ],
      };
    }
  );

  // Tool 2: get_weather_forecast
  server.registerTool(
    "get_weather_forecast",
    {
      description: "Get 3-day weather forecast for a city",
      inputSchema: { city: z.string().default("Saigon"), days: z.number().default(3) },
    },
    async ({ city }) => {
      const cityName = city || "Saigon";
      return {
        content: [
          {
            type: "text",
            text: `### 3-Day Forecast for ${cityName}\n- Today: 32°C / 25°C, Partly Cloudy ⛅\n- Tomorrow: 33°C / 26°C, Scattered Thunderstorms 🌩️\n- Day 3: 31°C / 25°C, Light Rain 🌧️`,
          },
        ],
      };
    }
  );

  // Tool 3: get_air_quality
  server.registerTool(
    "get_air_quality",
    {
      description: "Get Air Quality Index (AQI) and pollution metrics for a city",
      inputSchema: { city: z.string().default("Saigon") },
    },
    async ({ city }) => {
      const cityName = city || "Saigon";
      return {
        content: [
          {
            type: "text",
            text: `### Air Quality Index (AQI) in ${cityName}\n- AQI: 55 (Moderate 🟡)\n- Main Pollutant: PM2.5 (14.2 µg/m³)\n- Recommendation: Sensitive groups should limit outdoor exertion.`,
          },
        ],
      };
    }
  );

  // Resource: weather://current
  server.registerResource(
    "weather-current",
    "weather://current",
    {
      description: "Live weather report feed",
      mimeType: "text/plain",
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          text: "Live Weather Feed: Saigon 32°C Partly Cloudy AQI 55",
        },
      ],
    })
  );

  // Prompt: weather_report
  server.registerPrompt(
    "weather_report",
    {
      description: "Generate a daily weather briefing",
      argsSchema: {},
    },
    () => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: "Read weather://current and write a daily weather briefing.",
          },
        },
      ],
    })
  );

  return server;
}

// Connect via Stdio transport if executed directly (e.g. npx tsx weather-server.ts)
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const server = createWeatherServer();
  await server.connect(new StdioServerTransport());
}
