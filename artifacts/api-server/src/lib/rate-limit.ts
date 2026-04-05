import type { Request, Response, NextFunction } from "express";
import { pool } from "@workspace/db";
import { notifyAdminSecurityEvent } from "./telegram-bot";

type RateLimitOptions = {
  windowMs: number;
  max: number;
  keyPrefix?: string;
};

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

let useMemoryFallback = false;
let fallbackAlertSent = false;
let lastFallbackAt = 0;
const fallbackRetryMs = 60 * 1000;

const sensitivePrefixes = new Set(["auth", "webhook", "downloads", "payments", "deposits", "uploads"]);

function shouldFailClosed(keyPrefix: string): boolean {
  const isProd = process.env.NODE_ENV === "production";
  const failClosed = (process.env.RATE_LIMIT_FAIL_CLOSED ?? "true") === "true";
  return isProd && failClosed && sensitivePrefixes.has(keyPrefix);
}

async function consumeDistributedBucket(key: string, windowMs: number, now: number): Promise<Bucket> {
  const resetAt = now + windowMs;
  const query = `
    INSERT INTO api_rate_limits (key, count, reset_at)
    VALUES ($1, 1, $2)
    ON CONFLICT (key)
    DO UPDATE SET
      count = CASE
        WHEN api_rate_limits.reset_at <= $3 THEN 1
        ELSE api_rate_limits.count + 1
      END,
      reset_at = CASE
        WHEN api_rate_limits.reset_at <= $3 THEN $2
        ELSE api_rate_limits.reset_at
      END
    RETURNING count, reset_at;
  `;
  const result = await pool.query(query, [key, resetAt, now]);
  const row = result.rows[0] as { count: number; reset_at: number | string } | undefined;

  if (!row) {
    return { count: 1, resetAt };
  }

  return {
    count: Number(row.count),
    resetAt: Number(row.reset_at),
  };
}

function consumeMemoryBucket(key: string, windowMs: number, now: number): Bucket {
  const current = buckets.get(key);
  if (!current || now >= current.resetAt) {
    const next = { count: 1, resetAt: now + windowMs };
    buckets.set(key, next);
    return next;
  }

  const next = { count: current.count + 1, resetAt: current.resetAt };
  buckets.set(key, next);
  return next;
}

function getClientIp(req: Request): string {
  const fwd = req.headers["x-forwarded-for"];
  if (Array.isArray(fwd) && fwd.length > 0) return String(fwd[0]).split(",")[0].trim();
  if (typeof fwd === "string" && fwd.length > 0) return fwd.split(",")[0].trim();
  return req.ip || "unknown";
}

export function createRateLimiter(options: RateLimitOptions) {
  const { windowMs, max, keyPrefix = "default" } = options;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const now = Date.now();
    const ip = getClientIp(req);
    const userPart = req.user?.userId ? `u:${req.user.userId}` : `ip:${ip}`;
    const key = `${keyPrefix}:${userPart}`;

    if (useMemoryFallback && now - lastFallbackAt >= fallbackRetryMs) {
      useMemoryFallback = false;
      fallbackAlertSent = false;
    }

    let current: Bucket;
    if (useMemoryFallback) {
      current = consumeMemoryBucket(key, windowMs, now);
    } else {
      try {
        current = await consumeDistributedBucket(key, windowMs, now);
      } catch {
        if (!fallbackAlertSent) {
          fallbackAlertSent = true;
          lastFallbackAt = now;
          void notifyAdminSecurityEvent("Rate limiter fallback memoire active", {
            reason: "distributed_store_unavailable",
            keyPrefix,
          });
        }

        if (shouldFailClosed(keyPrefix)) {
          res.setHeader("Retry-After", "30");
          res.status(503).json({ error: "Service temporairement indisponible (protection anti-abus)." });
          void notifyAdminSecurityEvent("Rate limiter fail-closed", {
            route: req.originalUrl || req.url,
            keyPrefix,
            actor: userPart,
          });
          return;
        }

        useMemoryFallback = true;
        lastFallbackAt = now;
        current = consumeMemoryBucket(key, windowMs, now);
      }
    }

    if (current.count > max) {
      const retryAfterSec = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
      res.setHeader("Retry-After", String(retryAfterSec));
      res.status(429).json({ error: "Trop de requêtes, veuillez réessayer plus tard." });
      if (current.count === max + 1) {
        void notifyAdminSecurityEvent("Rate limit atteint", {
          route: req.originalUrl || req.url,
          keyPrefix,
          actor: userPart,
          retryAfterSec,
        });
      }
      return;
    }

    next();
  };
}
