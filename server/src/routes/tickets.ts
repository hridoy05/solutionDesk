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
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
});

router.get('/', requireAuth, async (req, res) => {
  const { sortBy, sortOrder, status, category, page, pageSize } = querySchema.parse(req.query);

  const where = {
    ...(status   && { status }),
    ...(category && { category }),
  };

  const [data, total] = await Promise.all([
    prisma.ticket.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        subject: true,
        fromEmail: true,
        fromName: true,
        status: true,
        category: true,
        createdAt: true,
      },
    }),
    prisma.ticket.count({ where }),
  ]);

  res.json({ data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
});

export default router;
