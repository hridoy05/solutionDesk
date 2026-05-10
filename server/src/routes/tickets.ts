import { Router } from 'express';
import { z } from 'zod';
import { Role, SenderType, TicketStatus, TicketCategory } from '@prisma/client';
import { GoogleGenAI } from '@google/genai';
import prisma from '../lib/prisma';
import { requireAuth } from '../middleware/requireAuth';

const router = Router();

const gemini = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY ?? '' });

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

router.get('/:id', requireAuth, async (req, res) => {
  const ticket = await prisma.ticket.findUnique({
    where: { id: req.params.id },
    include: {
      assignedAgent: { select: { id: true, name: true } },
      replies: {
        orderBy: { createdAt: 'asc' },
        include: { user: { select: { id: true, name: true } } },
      },
    },
  });
  if (!ticket) {
    res.status(404).json({ error: 'Ticket not found' });
    return;
  }
  res.json(ticket);
});

router.post('/:id/replies', requireAuth, async (req, res) => {
  const { body } = req.body as { body?: string };
  if (!body?.trim()) {
    res.status(400).json({ error: 'body is required' });
    return;
  }

  const ticket = await prisma.ticket.findUnique({ where: { id: req.params.id }, select: { id: true } });
  if (!ticket) {
    res.status(404).json({ error: 'Ticket not found' });
    return;
  }

  const reply = await prisma.reply.create({
    data: {
      ticketId: req.params.id,
      body: body.trim(),
      senderType: SenderType.agent,
      userId: req.authSession.user.id,
    },
    include: { user: { select: { id: true, name: true } } },
  });
  res.status(201).json(reply);
});

const patchSchema = z
  .object({
    status: z.enum([TicketStatus.open, TicketStatus.resolved, TicketStatus.closed]),
    category: z
      .enum([
        TicketCategory.general_question,
        TicketCategory.technical_question,
        TicketCategory.refund_request,
      ])
      .nullable(),
    assignedAgentId: z.string().nullable(),
  })
  .partial();

router.patch('/:id', requireAuth, async (req, res) => {
  const parsed = patchSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues });
    return;
  }
  const { status, category, assignedAgentId } = parsed.data;

  if (assignedAgentId !== undefined && assignedAgentId !== null) {
    const agent = await prisma.user.findUnique({ where: { id: assignedAgentId } });
    if (!agent || agent.role !== Role.agent) {
      res.status(400).json({ error: 'Invalid agent' });
      return;
    }
  }

  const updateData: Record<string, unknown> = {};
  if (status !== undefined) updateData.status = status;
  if (category !== undefined) updateData.category = category;
  if (assignedAgentId !== undefined) updateData.assignedAgentId = assignedAgentId;

  const ticket = await prisma.ticket.update({
    where: { id: req.params.id },
    data: updateData,
    include: { assignedAgent: { select: { id: true, name: true } } },
  });
  res.json(ticket);
});

router.post('/:id/polish', requireAuth, async (req, res) => {
  const { body: draftBody } = req.body as { body?: string };
  if (!draftBody?.trim()) {
    res.status(400).json({ error: 'body is required' });
    return;
  }

  if (!process.env.GEMINI_API_KEY) {
    res.status(503).json({ error: 'AI polishing is not configured' });
    return;
  }

  const ticket = await prisma.ticket.findUnique({
    where: { id: req.params.id },
    select: { subject: true, body: true },
  });
  if (!ticket) {
    res.status(404).json({ error: 'Ticket not found' });
    return;
  }

  const prompt = `You are a professional customer support agent. Improve the following draft reply to make it clearer, more professional, and more empathetic — while preserving the original meaning and intent. Return only the improved reply text, with no preamble or explanation.

Ticket subject: ${ticket.subject}
Customer message: ${ticket.body}

Draft reply:
${draftBody.trim()}`;

  try {
    const response = await gemini.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    const polishedBody = response.text?.trim();
    if (!polishedBody) {
      res.status(502).json({ error: 'No response from AI' });
      return;
    }

    res.json({ polishedBody });
  } catch (err) {
    console.error('[polish] Gemini error:', err);
    res.status(502).json({ error: 'AI request failed' });
  }
});

export default router;
