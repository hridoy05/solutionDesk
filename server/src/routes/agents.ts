import { Router } from 'express';
import { hashPassword } from 'better-auth/crypto';
import { Role } from '@prisma/client';
import prisma from '../lib/prisma';
import { CREDENTIAL_PROVIDER } from '../lib/constants';
import { requireAuth } from '../middleware/requireAuth';
import { requireAdmin } from '../middleware/requireAdmin';

const router = Router();

router.get('/', requireAuth, async (_req, res) => {
  const agents = await prisma.user.findMany({
    where: { role: Role.agent },
    select: { id: true, name: true, email: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json(agents);
});

router.post('/', requireAuth, requireAdmin, async (req, res) => {
  const { name, email, password } = req.body as { name?: string; email?: string; password?: string };

  if (!name || !email || !password) {
    res.status(400).json({ error: 'name, email, and password are required' });
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ error: 'Email already in use' });
    return;
  }

  const hashed = await hashPassword(password);
  const user = await prisma.user.create({
    data: { name, email, emailVerified: true, role: Role.agent },
    select: { id: true, name: true, email: true, createdAt: true },
  });
  await prisma.account.create({
    data: { accountId: email, providerId: CREDENTIAL_PROVIDER, userId: user.id, password: hashed },
  });

  res.status(201).json(user);
});

router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    await prisma.user.delete({ where: { id: req.params.id } });
  } catch {
    res.status(404).json({ error: 'Agent not found' });
    return;
  }
  res.status(204).end();
});

export default router;
