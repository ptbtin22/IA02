import fs from "node:fs/promises";
import { execSync } from "node:child_process";
import path from "node:path";
import readline from "node:readline/promises";
import type { AdvertisedTool } from "./types.js";

const WORKSPACE_DIR = path.resolve("./workspace");

/**
 * Ensure workspace directory exists
 */
async function ensureWorkspace(): Promise<void> {
  try {
    await fs.mkdir(WORKSPACE_DIR, { recursive: true });
  } catch (e) {
    // Directory already exists
  }
}

/**
 * Safe path resolution preventing directory traversal out of workspace
 */
function safePath(targetPath: string): string {
  const resolved = path.resolve(".", targetPath);
  if (!resolved.startsWith(WORKSPACE_DIR) && !resolved.startsWith(path.resolve("."))) {
    throw new Error(`Access denied: Path '${targetPath}' escapes the workspace directory.`);
  }
  return resolved;
}

/**
 * IA01 Hardcoded Local Tools Schemas
 */
export const ia01LocalTools: AdvertisedTool[] = [
  {
    type: "function",
    function: {
      name: "read_file",
      description: "Read a file from disk",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Path to the file to read" },
        },
        required: ["path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "write_file",
      description: "Write text to a file",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Path where the file should be written" },
          content: { type: "string", description: "The text content to write to the file" },
        },
        required: ["path", "content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "edit_file",
      description: "Edit an existing file's content",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Path to the file to edit" },
          content: { type: "string", description: "The new content to write to the file" },
        },
        required: ["path", "content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_files",
      description: "List files and directories in a directory path",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "The path of the directory to list" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_dir",
      description: "Create a new directory recursively",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "The directory path to create" },
        },
        required: ["path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_file",
      description: "Delete a file (requires user approval)",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Path to the file to delete" },
        },
        required: ["path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "run_command",
      description: "Run a shell command (requires user approval)",
      parameters: {
        type: "object",
        properties: {
          cmd: { type: "string", description: "The shell command to execute" },
        },
        required: ["cmd"],
      },
    },
  },
];

/**
 * Execute IA01 local tools with human approval for dangerous operations
 */
export async function executeLocalTool(
  name: string,
  args: Record<string, unknown>,
  rl?: readline.Interface
): Promise<string> {
  await ensureWorkspace();

  if (name === "run_command") {
    const cmd = String(args.cmd || "");
    if (rl) {
      const approval = await rl.question(`⚠️ Approve running shell command: "${cmd}"? (y/N): `);
      if (!["y", "yes"].includes(approval.trim().toLowerCase())) {
        return "Error: Command execution rejected by user.";
      }
    }
    return execSync(cmd).toString();
  }

  if (name === "delete_file") {
    const filePath = String(args.path || "");
    if (rl) {
      const approval = await rl.question(`⚠️ Approve deleting file: "${filePath}"? (y/N): `);
      if (!["y", "yes"].includes(approval.trim().toLowerCase())) {
        return "Error: File deletion rejected by user.";
      }
    }
    await fs.unlink(safePath(filePath));
    return "File deleted successfully";
  }

  switch (name) {
    case "read_file":
      return await fs.readFile(safePath(String(args.path || "")), "utf8");

    case "write_file":
    case "edit_file":
      await fs.writeFile(safePath(String(args.path || "")), String(args.content || ""));
      return "File written successfully";

    case "list_files": {
      const targetPath = String(args.path || "./");
      const files = await fs.readdir(safePath(targetPath), { withFileTypes: true });
      return files.map((f) => `${f.isDirectory() ? "[DIR]" : "[FILE]"} ${f.name}`).join("\n");
    }

    case "create_dir":
      await fs.mkdir(safePath(String(args.path || "")), { recursive: true });
      return "Directory created successfully";

    default:
      throw new Error(`Unknown local tool: ${name}`);
  }
}
