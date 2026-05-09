import { Router } from 'express';
import { TicketStatus, TicketCategory } from '@prisma/client';
import prisma from '../lib/prisma';
import { requireAuth } from '../middleware/requireAuth';

const router = Router();

router.get('/', requireAuth, async (_req, res) => {
  const tickets = await prisma.ticket.findMany({
    orderBy: { createdAt: 'desc' },
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
