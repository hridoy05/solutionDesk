import { Router } from 'express';
import { hashPassword } from 'better-auth/crypto';
import { z } from 'zod';
import { Role } from '@prisma/client';
import prisma from '../lib/prisma';
import { CREDENTIAL_PROVIDER } from '../lib/constants';
import { requireAuth } from '../middleware/requireAuth';
import { requireAdmin } from '../middleware/requireAdmin';

const userSelect = { id: true, name: true, email: true, role: true, createdAt: true } as const;

const createUserSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  email: z.email('Valid email is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum([Role.admin, Role.agent]).default(Role.agent),
});

const updateUserSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').optional(),
  email: z.email('Valid email is required').optional(),
  role: z.enum([Role.admin, Role.agent]).optional(),
});

const router = Router();

router.get('/', requireAuth, requireAdmin, async (_req, res) => {
  const users = await prisma.user.findMany({
    select: userSelect,
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
    data: { name, email, emailVerified: true, role },
    select: userSelect,
  });

  await prisma.account.create({
    data: { accountId: email, providerId: CREDENTIAL_PROVIDER, userId: user.id, password: hashed },
  });

  res.status(201).json(user);
});

router.patch('/:id', requireAuth, requireAdmin, async (req, res) => {
  const parsed = updateUserSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0].message });
    return;
  }

  const { id } = req.params;
  const data = parsed.data;

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  if (data.email && data.email !== target.email) {
    const conflict = await prisma.user.findUnique({ where: { email: data.email } });
    if (conflict) {
      res.status(409).json({ error: 'Email already in use' });
      return;
    }
  }

  const user = await prisma.user.update({
    where: { id },
    data,
    select: userSelect,
  });

  res.json(user);
});

router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  const { id } = req.params;

  if (id === req.authSession.user.id) {
    res.status(403).json({ error: 'You cannot delete your own account' });
    return;
  }

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  await prisma.user.delete({ where: { id } });
  res.status(204).send();
});

export default router;
