import { Router } from 'express';
import { hashPassword } from 'better-auth/crypto';
import { z } from 'zod';
import { Role } from '@prisma/client';
import prisma from '../lib/prisma';
import { requireAuth } from '../middleware/requireAuth';
import { requireAdmin } from '../middleware/requireAdmin';

const createUserSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  email: z.email('Valid email is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum([Role.admin, Role.agent]).default(Role.agent),
});

const router = Router();

router.get('/', requireAuth, requireAdmin, async (_req, res) => {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json(users);
});

router.post('/', requireAuth, requireAdmin, async (req, res) => {
  const parsed = createUserSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0].message });
    return;
  }
  const { name, email, password, role } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ error: 'Email already in use' });
    return;
  }

  const hashed = await hashPassword(password);

  const user = await prisma.user.create({
    data: { name: name.trim(), email, emailVerified: true, role },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  await prisma.account.create({
    data: {
      accountId: email,
      providerId: 'credential',
      userId: user.id,
      password: hashed,
    },
  });

  res.status(201).json(user);
});

export default router;
