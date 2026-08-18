import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { fileURLToPath } from "node:url";
import { createWeatherServer } from "./src/servers/weather.js";

// Connect via Stdio transport if executed directly (e.g. npx tsx weather-server.ts)
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const server = createWeatherServer();
  await server.connect(new StdioServerTransport());
}
