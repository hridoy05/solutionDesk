import { GoogleGenAI } from '@google/genai';
import { TicketCategory } from '@prisma/client';
import prisma from '../lib/prisma';

const VALID_CATEGORIES = [
  TicketCategory.general_question,
  TicketCategory.technical_question,
  TicketCategory.refund_request,
] as const;

const gemini = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY ?? '' });

export async function classifyTicket(ticketId: string, subject: string, body: string) {
  if (!process.env.GEMINI_API_KEY) return;

  const prompt = `Classify the following customer support ticket into exactly one of these categories:
- general_question
- technical_question
- refund_request

Reply with only the category name, nothing else.

Subject: ${subject}
Message: ${body}`;

  const response = await gemini.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
  });

  const raw = response.text?.trim().toLowerCase().replace(/\s+/g, '_');
  const category = VALID_CATEGORIES.find((c) => c === raw);
  if (!category) {
    console.warn('[classify] Unexpected response:', raw);
    return;
  }

  await prisma.ticket.update({ where: { id: ticketId }, data: { category } });
  console.log(`[classify] Ticket ${ticketId} → ${category}`);
}
