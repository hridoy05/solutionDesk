import { Router } from 'express';
import { TicketStatus } from '@prisma/client';
import prisma from '../lib/prisma';
import { requireAuth } from '../middleware/requireAuth';

const router = Router();

router.get('/', requireAuth, async (_req, res) => {
  const [totalTickets, openTickets, resolvedByAgentRaw, avgTimeRaw] = await Promise.all([
    prisma.ticket.count(),
    prisma.ticket.count({ where: { status: TicketStatus.open } }),
    prisma.ticket.groupBy({
      by: ['assignedAgentId'],
      where: {
        status: { in: [TicketStatus.resolved, TicketStatus.closed] },
        assignedAgentId: { not: null },
      },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    }),
    prisma.$queryRaw<[{ avg_hours: number | null }]>`
      SELECT AVG(EXTRACT(EPOCH FROM ("updatedAt" - "createdAt")) / 3600)::float AS avg_hours
      FROM "Ticket"
      WHERE status IN ('resolved', 'closed')
    `,
  ]);

  const agentIds = resolvedByAgentRaw
    .map((r) => r.assignedAgentId)
    .filter((id): id is string => id !== null);

  const agents = await prisma.user.findMany({
    where: { id: { in: agentIds } },
    select: { id: true, name: true },
  });

  const agentMap = Object.fromEntries(agents.map((a) => [a.id, a.name]));

  res.json({
    totalTickets,
    openTickets,
    avgResolveTimeHours: avgTimeRaw[0]?.avg_hours ?? null,
    resolvedByAgent: resolvedByAgentRaw.map((r) => ({
      agentId: r.assignedAgentId!,
      agentName: agentMap[r.assignedAgentId!] ?? 'Unknown',
      count: r._count.id,
    })),
  });
});

export default router;
