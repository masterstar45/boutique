import type { Request, Response, NextFunction } from "express";

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

function getClientIp(req: Request): string {
  const fwd = req.headers["x-forwarded-for"];
  if (Array.isArray(fwd) && fwd.length > 0) return String(fwd[0]).split(",")[0].trim();
  if (typeof fwd === "string" && fwd.length > 0) return fwd.split(",")[0].trim();
  return req.ip || "unknown";
}

export function createRateLimiter(options: RateLimitOptions) {
  const { windowMs, max, keyPrefix = "default" } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    const now = Date.now();
    const ip = getClientIp(req);
    const key = `${keyPrefix}:${ip}`;

    const current = buckets.get(key);
    if (!current || now >= current.resetAt) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    if (current.count >= max) {
      const retryAfterSec = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
      res.setHeader("Retry-After", String(retryAfterSec));
      res.status(429).json({ error: "Trop de requêtes, veuillez réessayer plus tard." });
      return;
    }

    current.count += 1;
    buckets.set(key, current);
    next();
  };
}
