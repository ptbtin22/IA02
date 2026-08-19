import type { Request, Response, NextFunction } from "express";
import crypto from "node:crypto";

/**
 * Bearer Token API Key Guard Middleware for Express /mcp route.
 * Uses timing-safe comparison to prevent timing attacks.
 */
export function bearerAuthGuard(req: Request, res: Response, next: NextFunction): void | Response {
  const KEY = process.env.MCP_KEY || "";
  // Parse Authorization header properly — require "Bearer " prefix
  const authHeader = req.headers.authorization ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(authHeader);
  const token = match ? match[1].trim() : "";

  // Constant-time comparison using SHA-256 digests to prevent timing attacks
  const tokenDigest = crypto.createHash("sha256").update(token).digest();
  const keyDigest = crypto.createHash("sha256").update(KEY).digest();

  if (token.length === 0 || !crypto.timingSafeEqual(tokenDigest, keyDigest)) {
    return res
      .status(401)
      .set("WWW-Authenticate", 'Bearer realm="MCP Access"')
      .json({ error: "unauthorized", message: "Invalid or missing Bearer API Key" });
  }
  next();
}
