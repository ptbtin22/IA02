import type { Request, Response, NextFunction } from "express";
import crypto from "node:crypto";

// Fallback to random secure hex token if process.env.MCP_KEY is unconfigured
const KEY = process.env.MCP_KEY || crypto.randomBytes(32).toString("hex");

/**
 * Bearer Token API Key Guard Middleware for Express /mcp route.
 */
export function bearerAuthGuard(req: Request, res: Response, next: NextFunction): void | Response {
  const token = (req.headers.authorization ?? "").replace("Bearer ", "").trim();
  if (token !== KEY) {
    return res
      .status(401)
      .set("WWW-Authenticate", 'Bearer realm="MCP Access"')
      .json({ error: "unauthorized", message: "Invalid or missing Bearer API Key" });
  }
  next();
}

/**
 * Get active API Key
 */
export function getApiKey(): string {
  return KEY;
}
