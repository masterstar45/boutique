import { Request, Response, NextFunction } from "express";
import { verifyToken, JwtPayload } from "../lib/jwt";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { notifyAdminSecurityEvent } from "../lib/telegram-bot";

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) {
    trackSecurityRejection(req, "auth_missing_token");
    res.status(401).json({ error: "Token manquant" });
    return;
  }
  try {
    req.user = verifyToken(auth.slice(7));
    next();
  } catch {
    trackSecurityRejection(req, "auth_invalid_token");
    res.status(401).json({ error: "Token invalide" });
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  requireAuth(req, res, async () => {
    if (req.user?.isAdmin) {
      next();
      return;
    }

    try {
      const user = await db.select({ isAdmin: usersTable.isAdmin })
        .from(usersTable)
        .where(eq(usersTable.id, req.user!.userId))
        .then((r) => r[0]);

      if (user?.isAdmin) {
        next();
        return;
      }
    } catch {
    }

    trackSecurityRejection(req, "admin_access_denied");
    res.status(403).json({ error: "Accès refusé" });
  });
}

type RejectionStats = {
  count: number;
  firstSeenAt: number;
  lastAlertAt: number;
};

const rejectionWindowMs = 10 * 60 * 1000;
const rejectionAlertThreshold = 5;
const rejectionStatsByKey = new Map<string, RejectionStats>();

function getClientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0]!.trim();
  }
  return req.ip || "unknown";
}

function trackSecurityRejection(req: Request, reason: string): void {
  const ip = getClientIp(req);
  const path = req.originalUrl || req.path || "unknown";
  const method = req.method || "UNKNOWN";
  const key = `${reason}:${ip}`;
  const now = Date.now();
  const current = rejectionStatsByKey.get(key);

  if (!current || now - current.firstSeenAt > rejectionWindowMs) {
    rejectionStatsByKey.set(key, { count: 1, firstSeenAt: now, lastAlertAt: 0 });
    return;
  }

  current.count += 1;
  if (current.count < rejectionAlertThreshold) return;
  if (now - current.lastAlertAt < rejectionWindowMs) return;

  current.lastAlertAt = now;
  void notifyAdminSecurityEvent("Tentatives d'acces suspectes", {
    reason,
    ip,
    method,
    path,
    count: current.count,
    windowMinutes: rejectionWindowMs / 60000,
  });
}
