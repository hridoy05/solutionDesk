import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.authSession?.user.role !== Role.admin) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }
  next();
}
