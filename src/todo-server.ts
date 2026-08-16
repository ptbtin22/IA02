import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { addTask, completeTask, formatResourceText, formatTasksList } from "./tasks-store.js";

/**
 * Creates and configures an McpServer instance with Todo tools, resources, and prompts.
 */
export function createTodoServer(): McpServer {
  const server = new McpServer({ name: "todo", version: "1.0.0" });

  // Tool 1: add_task
  server.registerTool(
    "add_task",
    {
      description: "Add a task to the todo list",
      inputSchema: { text: z.string() },
    },
    async ({ text }) => {
      const newTask = addTask(text);
      return {
        content: [{ type: "text", text: `Added #${newTask.id}: ${text}` }],
      };
    }
  );

  // Tool 2: list_tasks
  server.registerTool(
    "list_tasks",
    {
      description: "List all tasks with their status",
      inputSchema: {},
    },
    async () => ({
      content: [
        {
          type: "text",
          text: formatTasksList(),
        },
      ],
    })
  );

  // Tool 3: complete_task
  server.registerTool(
    "complete_task",
    {
      description: "Mark a task as done",
      inputSchema: { id: z.number() },
    },
    async ({ id }) => {
      const task = completeTask(id);
      if (!task) {
        return {
          content: [{ type: "text", text: `No task #${id}` }],
          isError: true,
        };
      }
      return {
        content: [{ type: "text", text: `Completed #${id}: ${task.text}` }],
      };
    }
  );

  // Resource: todo-list
  server.registerResource(
    "todo-list",
    "todo://list",
    {
      description: "The current todo list",
      mimeType: "text/plain",
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          text: formatResourceText(),
        },
      ],
    })
  );

  // Prompt: plan_my_day
  server.registerPrompt(
    "plan_my_day",
    {
      description: "Plan the day from open tasks",
      argsSchema: {},
    },
    () => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: "Read my todo list and propose a realistic plan for today.",
          },
        },
      ],
    })
  );

  return server;
}
