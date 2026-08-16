import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { fileURLToPath } from "node:url";
import { createTodoServer } from "./src/todo-server.js";

export { createTodoServer };
export { tasks, getTasks, addTask, completeTask } from "./src/tasks-store.js";

// Connect via Stdio transport if executed directly (e.g. npx tsx server.ts)
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const server = createTodoServer();
  await server.connect(new StdioServerTransport());
  console.error("todo stdio server ready"); // stderr ONLY, NOT stdout!
}
