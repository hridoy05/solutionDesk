import { Router } from 'express';
import { z } from 'zod';
import { TicketStatus, TicketCategory } from '@prisma/client';
import prisma from '../lib/prisma';
import { requireAuth } from '../middleware/requireAuth';

const router = Router();

const querySchema = z.object({
  sortBy: z.enum(['subject', 'fromEmail', 'status', 'category', 'createdAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  status: z.enum([TicketStatus.open, TicketStatus.resolved, TicketStatus.closed]).optional(),
  category: z.enum([
    TicketCategory.general_question,
    TicketCategory.technical_question,
    TicketCategory.refund_request,
  ]).optional(),
});

router.get('/', requireAuth, async (req, res) => {
  const { sortBy, sortOrder, status, category } = querySchema.parse(req.query);

  const tickets = await prisma.ticket.findMany({
    where: {
      ...(status   && { status }),
      ...(category && { category }),
    },
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
