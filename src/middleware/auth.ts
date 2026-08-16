import type { Request, Response, NextFunction } from "express";

const KEY = process.env.MCP_KEY || "secret-key-123";

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
