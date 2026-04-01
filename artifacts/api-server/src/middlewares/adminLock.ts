import { Request, Response, NextFunction } from 'express';

export function adminLock(req: Request, res: Response, next: NextFunction) {
  const secret = process.env.ADMIN_LOCK_SECRET;
  if (!secret) return next();

  const path = req.path || req.originalUrl || '';
  if (path.startsWith('/api/admin') || path.startsWith('/admin')) {
    const token = req.header('x-admin-secret') || req.cookies?.admin_lock;
    if (token !== secret) {
      return res.status(403).json({ error: 'Admin access temporarily blocked' });
    }
  }
  next();
}