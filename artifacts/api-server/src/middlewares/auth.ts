import { Request, Response, NextFunction } from "express";
import { verifyToken, JwtPayload } from "../lib/jwt";

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
    res.status(401).json({ error: "Token manquant" });
    return;
  }
  try {
    req.user = verifyToken(auth.slice(7));
    next();
  } catch {
    res.status(401).json({ error: "Token invalide" });
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  requireAuth(req, res, () => {
    if (!req.user?.isAdmin) {
      res.status(403).json({ error: "Accès refusé" });
      return;
    }
    next();
  });
}
