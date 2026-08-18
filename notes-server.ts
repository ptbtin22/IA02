import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { saveNote, readNote, listNotes, formatNotesResource } from "./src/notes-store.js";

/**
 * Factory function creating Notes MCP Server
 */
export function createNotesServer(): McpServer {
  const server = new McpServer({ name: "notes", version: "1.0.0" });

  // Tool 1: save_note
  server.registerTool(
    "save_note",
    {
      description: "Save a title and content note to the knowledge base",
      inputSchema: { title: z.string(), content: z.string() },
    },
    async ({ title, content }) => {
      const note = saveNote(title, content);
      return {
        content: [{ type: "text", text: `Saved note [${note.title}]` }],
      };
    }
  );

  // Tool 2: read_note
  server.registerTool(
    "read_note",
    {
      description: "Read a saved note by title",
      inputSchema: { title: z.string() },
    },
    async ({ title }) => {
      const note = readNote(title);
      if (!note) {
        return {
          content: [{ type: "text", text: `Note [${title}] not found` }],
          isError: true,
        };
      }
      return {
        content: [{ type: "text", text: `# ${note.title}\n${note.content}` }],
      };
    }
  );

  // Tool 3: list_notes
  server.registerTool(
    "list_notes",
    {
      description: "List all saved notes in the knowledge base",
      inputSchema: {},
    },
    async () => ({
      content: [{ type: "text", text: listNotes() }],
    })
  );

  // Resource: notes://all
  server.registerResource(
    "notes-list",
    "notes://all",
    {
      description: "All saved knowledge notes",
      mimeType: "text/plain",
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          text: formatNotesResource() || "No notes available.",
        },
      ],
    })
  );

  // Prompt: review_notes
  server.registerPrompt(
    "review_notes",
    {
      description: "Review and summarize saved knowledge notes",
      argsSchema: {},
    },
    () => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: "Read all knowledge notes from notes://all and summarize key points.",
          },
        },
      ],
    })
  );

  return server;
}

// Connect via Stdio transport if executed directly (e.g. npx tsx notes-server.ts)
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const server = createNotesServer();
  await server.connect(new StdioServerTransport());
}
