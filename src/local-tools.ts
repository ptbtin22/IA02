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
      description: "Read a source code file from disk",
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
      description: "List repository source code files in a directory path (do NOT use for user todo tasks)",
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
      description: "Delete a file from disk with user confirmation",
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
      description: "Execute a shell command with user confirmation prompt",
      parameters: {
        type: "object",
        properties: {
          command: { type: "string", description: "The shell command to execute" },
        },
        required: ["command"],
      },
    },
  },
];

/**
 * Interactive execution of IA01 Local File & Shell Command Tools
 */
export async function executeLocalTool(
  toolName: string,
  args: Record<string, unknown>,
  rl?: readline.Interface
): Promise<string> {
  await ensureWorkspace();

  switch (toolName) {
    case "read_file": {
      const relPath = String(args.path || "");
      const fullPath = safePath(relPath);
      return await fs.readFile(fullPath, "utf8");
    }

    case "write_file": {
      const relPath = String(args.path || "");
      const content = String(args.content || "");
      const fullPath = safePath(relPath);
      await fs.writeFile(fullPath, content, "utf8");
      return `File '${relPath}' written successfully (${content.length} bytes).`;
    }

    case "edit_file": {
      const relPath = String(args.path || "");
      const content = String(args.content || "");
      const fullPath = safePath(relPath);
      await fs.writeFile(fullPath, content, "utf8");
      return `File '${relPath}' updated successfully.`;
    }

    case "list_files": {
      const relPath = String(args.path || ".");
      const fullPath = safePath(relPath);
      const entries = await fs.readdir(fullPath, { withFileTypes: true });
      return entries.map((e) => `${e.isDirectory() ? "[DIR]" : "[FILE]"} ${e.name}`).join(" ");
    }

    case "create_dir": {
      const relPath = String(args.path || "");
      const fullPath = safePath(relPath);
      await fs.mkdir(fullPath, { recursive: true });
      return `Directory '${relPath}' created successfully.`;
    }

    case "delete_file": {
      const relPath = String(args.path || "");
      const fullPath = safePath(relPath);

      // Interactive user approval prompt
      if (rl) {
        const answer = await rl.question(`\n⚠️ DANGER: Delete file '${relPath}'? (y/N): `);
        if (answer.trim().toLowerCase() !== "y") {
          return `Operation cancelled by user. File '${relPath}' was NOT deleted.`;
        }
      }

      await fs.unlink(fullPath);
      return `File '${relPath}' deleted successfully.`;
    }

    case "run_command": {
      const cmd = String(args.command || "");

      // Interactive user approval prompt
      if (rl) {
        const answer = await rl.question(`\n⚠️ SECURITY: Approve running command: '${cmd}'? (y/N): `);
        if (answer.trim().toLowerCase() !== "y") {
          return `Command execution cancelled by user: '${cmd}'`;
        }
      }

      try {
        const output = execSync(cmd, { cwd: WORKSPACE_DIR, encoding: "utf8", timeout: 15000 });
        return output.trim() || "(Command executed cleanly with no output)";
      } catch (err: unknown) {
        const execErr = err as { stdout?: string; stderr?: string; message: string };
        return `Command failed: ${execErr.stderr || execErr.stdout || execErr.message}`;
      }
    }

    default:
      throw new Error(`Unknown local tool: ${toolName}`);
  }
}
