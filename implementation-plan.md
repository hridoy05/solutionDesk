# Implementation Plan

## Phase 1: Project Setup ✅

- [x] Initialize monorepo structure (`/client`, `/server`)
- [x] Set up Express server with TypeScript
- [x] Set up React app with TypeScript

## Phase 2: Authentication ✅

- [x] Create login page
- [x] Implement login API endpoint
- [x] Implement session-based authentication middleware
- [x] Implement logout API endpoint
- [x] Add route protection on the frontend (redirect to login if unauthenticated)

## Phase 3: User Management ✅

- [x] Create user management page (admin only)
- [x] Implement create agent API endpoint
- [x] Implement list users API endpoint
- [x] Implement edit user API endpoint
- [x] Implement delete user API endpoint
- [x] Add role-based access control (admin vs agent)

## Phase 4: Ticket CRUD ✅

- [x] Implement list tickets API endpoint (with filtering by status and category, sorting)
- [x] Implement get ticket API endpoint
- [x] Implement update ticket API endpoint (change status, assign agent)
- [x] Create ticket list page with filtering and sorting
- [x] Create ticket detail page

## Phase 5: AI Features ✅

- [x] Set up Gemini API integration through the Vercel AI SDK
- [x] Implement auto-classification of incoming tickets (background worker)
- [x] Implement knowledge-base auto-resolve worker (auto reply + auto ESCALATE to human)
- [x] Implement AI summary endpoint (generate ticket summary)
- [x] Implement AI reply polishing endpoint
- [x] Build knowledge base structure and seed with initial content (`server/knowledge-base.md`)
- [x] Integrate AI features into ticket detail page UI (Summarize + Polish)

### Phase 5b: RAG Knowledge Base Retrieval (in progress)

Replace full-file knowledge-base prompts with vector search over embedded
KB articles stored in Postgres (pgvector).

- [x] Add pgvector extension, `kb_article` + `kb_chunk` tables and HNSW cosine index (migration `20261030000000_add_rag_kb_tables`)
- [x] Prisma models: `KbArticle`, `KbChunk`, `AiDecision` (audit table)
- [ ] KB import script (`server/prisma/seed-kb.ts`): parse `knowledge-base.md` → embed with `gemini-embedding-001` → store vectors
- [ ] Retrieval service (`server/src/lib/kb-retrieval.ts`): embed ticket, cosine top-k lookup, minimum-score gate
- [ ] Wire retrieval into `auto-resolve-ticket.ts` (no-KB-match → escalate without LLM call)
- [ ] Record `ai_decision` audit rows (model, chunk IDs, best score, outcome)
- [ ] Update `ai-system.md` for the RAG flow
- [ ] Verification: migration + seed + similarity spot-checks + end-to-end ticket test

## Phase 6: Email Integration ✅

- [x] Set up email provider (SendGrid/Mailgun)
- [x] Implement inbound email webhook to create tickets
- [x] Implement outbound email sending when a reply is sent
- [x] Handle email threading (same sender + subject → append to open ticket)

## Phase 7: Dashboard ✅

- [x] Create dashboard page with ticket overview stats (open, resolved, closed counts)
- [x] Add tickets by category breakdown
- [x] Add daily ticket volume
- [x] Add recent tickets list
- [x] Add quick filters to navigate to filtered ticket list

## Phase 8: Polish & Deployment

- [ ] Add loading states and error states on the frontend (partially done)
- [ ] Write Dockerfile for server and client
- [ ] Set up Docker Compose for local development
- [ ] Write deployment configuration

## Future (post-Phase 8 backlog)

- [ ] Admin KB management UI (CRUD + re-embedding on save) over `/api/kb`
- [ ] Structured classification with `generateObject` (category + confidence + reasoning)
- [ ] Fix classify → auto-resolve race (chain jobs; refuse auto-resolve for `refund_request`)
- [ ] Prompt-injection hardening on inbound email content
- [ ] Extra prisma enum adoption: replace hardcoded status/category strings in workers
