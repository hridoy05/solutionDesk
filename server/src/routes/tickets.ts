import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { requireAuth } from '../middleware/requireAuth';

const router = Router();

const sortSchema = z.object({
  sortBy: z.enum(['subject', 'fromEmail', 'status', 'category', 'createdAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

router.get('/', requireAuth, async (req, res) => {
  const { sortBy, sortOrder } = sortSchema.parse(req.query);

  const tickets = await prisma.ticket.findMany({
    orderBy: { [sortBy]: sortOrder },
    select: {
      id: true,
      subject: true,
      fromEmail: true,
      fromName: true,
      status: true,
      category: true,
      createdAt: true,
    },
  });
  res.json(tickets);
});

export default router;
