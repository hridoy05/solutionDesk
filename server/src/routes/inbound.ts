import { Router } from 'express';
import multer from 'multer';
import { TicketStatus } from '@prisma/client';
import prisma from '../lib/prisma';
import boss from '../lib/boss';
import { CLASSIFY_QUEUE } from '../workers/classify';

const upload = multer({ storage: multer.memoryStorage() });
const router = Router();

function parseFrom(from: string): { fromEmail: string; fromName?: string } {
  const match = from.match(/^(.*?)\s*<([^>]+)>$/);
  if (match) return { fromName: match[1].trim() || undefined, fromEmail: match[2].trim() };
  return { fromEmail: from.trim() };
}

router.post('/', upload.none(), async (req, res) => {
  const secret = process.env.INBOUND_WEBHOOK_SECRET;
  if (secret && req.query.secret !== secret) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  const { from, subject, text, html } = req.body as Record<string, string>;
  const body = (text ?? html ?? '').trim();
  if (!from || !subject || !body) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }

  const { fromEmail, fromName } = parseFrom(from);
  const ticket = await prisma.ticket.create({ data: { subject, body, fromEmail, fromName, status: TicketStatus.open } });
  await boss.send(CLASSIFY_QUEUE, { ticketId: ticket.id, subject, body });
  res.status(200).send();
});

export default router;
