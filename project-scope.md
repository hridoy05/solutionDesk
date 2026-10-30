## Problem:
We received hundreds of support emails daily. Our agents manually read, classify and respond to each ticket- which is slow and leads to impersonal, canned responses.

## Feature:
Build a ticket management system that uses Ai to automatically classify, responds to, and route support tickets- delivering faster, more personalized responses to students while freeing up agents for complex issues

## Ticket Statuses:
- **Open** – ticket has been received and is awaiting action
- **Resolved** – ticket has been responded to and the issue is considered handled
- **Closed** – ticket is fully closed and no further action is needed

## Ticket Categories:
- General Question
- Technical Question
- Refund Request

## Roles:
- **Admin** – deployed with the system by default; can create and manage agents
- **Agent** – created by admin; can view, manage, and respond to tickets

## Solution:
Receive support email and create tickets
Auto-classify tickets by category using AI
Auto-generate human-friendly responses using a knowledge base
Ticket list with filtering and sorting by status and category
Ticket details view
AI summaries
AI suggested replies
User management (admin only: create/manage agents)
Dashboard to view and manage all tickets

## AI Knowledge System (RAG):

The knowledge base is stored in Postgres, not only in a markdown file:

- One-time import (`server/prisma/seed-kb.ts`): `server/knowledge-base.md` is split into Q&A articles, each answer text is converted to a vector (embedding) with the Gemini embedding model (`gemini-embedding-001`), and stored in the `kb_chunk` table (pgvector, HNSW cosine index).
- Per ticket (`server/src/lib/kb-retrieval.ts`): the ticket subject + body are embedded with the same model and compared against all KB vectors to find the most relevant articles (top-k with a minimum similarity score).
- Auto-resolve worker: instead of pasting the whole knowledge-base file into the prompt, the AI receives only the retrieved Q&A chunks. If no chunk passes the minimum score, the case is escalated to a human agent without calling the LLM.
- Every AI decision is audited in the `ai_decision` table (model, chunk IDs, best score, outcome) for quality review and future dashboards.

Benefits: scales with knowledge-base size, cheaper prompts, safer escalation
(no LLM hallucinated answers for unknown topics), and traceable decisions.
