# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Project Is

SolutionDesk is an AI-powered support ticket management system. Agents receive support emails, which are auto-classified and auto-responded to using Claude. Admins manage agents; agents manage tickets.

**Roles:** Admin (default, manages agents) · Agent (views and responds to tickets)  
**Ticket statuses:** Open → Resolved → Closed  
**Ticket categories:** General Question · Technical Question · Refund Request

## Monorepo Structure

npm workspaces with two packages:

- `client/` — React 18 + TypeScript, bundled with Vite, runs on `:5173`
- `server/` — Express + TypeScript + Node.js, runs on `:5000`

Vite proxies all `/api` and `/health` requests from the client to the server, so `fetch('/health')` in the browser hits `http://localhost:5000/health`.

## Commands

From the **root** (runs both concurrently):
```bash
npm run dev       # start client + server together
npm run build     # build both
```

From **`server/`**:
```bash
npm run dev       # ts-node-dev with hot reload
npm run build     # tsc → dist/
npm start         # node dist/index.js
```

From **`client/`**:
```bash
npm run dev       # vite dev server
npm run build     # tsc + vite build
```

## Server Architecture

Entry: `server/src/index.ts` → loads `.env`, starts Express on `$PORT` (default 5000).  
App setup: `server/src/app.ts` → registers helmet, cors, morgan, express.json, then routes.

Planned directory layout inside `server/src/`:
- `routes/` — Express routers, one file per resource
- `middleware/` — auth guards, error handler
- `services/` — business logic (AI calls, email, etc.)
- `types/` — shared TypeScript types

## Client Architecture

Entry: `client/src/main.tsx` → renders `<App />`.  
Routing: react-router-dom v6 (BrowserRouter + Routes).  
`App.tsx` is the root component and router shell.

## Environment

Copy `server/.env.example` → `server/.env` before running the server. Required vars:
- `DATABASE_URL` — PostgreSQL connection string
- `PORT` — optional, defaults to 5000
- `CLIENT_URL` — optional, defaults to `http://localhost:5173`

## Fetching Up-to-Date Documentation (context7)

Always use context7 before writing code that touches any library — training data may be stale.

**Two-step flow:**

```
1. mcp__context7__resolve-library-id({ libraryName: "Express.js", query: "your question" })
2. mcp__context7__query-docs({ libraryId: "<returned id>", query: "your question" })
```

Use for: Express, React, React Router, Prisma, Vite, Anthropic SDK, SendGrid, and any other dependency. Do not skip this for library-specific syntax, config, or migration questions.

## Authentication

**Library:** [Better Auth](https://www.better-auth.com/) — session-based, stored in PostgreSQL via Prisma adapter.

### Server-side

- **Auth instance:** `server/src/lib/auth.ts` — configured with `emailAndPassword` (sign-up disabled; users are seeded), PostgreSQL adapter, and a custom `role` field (`'admin' | 'agent'`, default `'agent'`).
- **Route handler:** `app.all('/api/auth/*', toNodeHandler(auth))` in `app.ts` — must be registered **before** `express.json()`.
- **Session guard middleware:** `server/src/middleware/requireAuth.ts` — calls `auth.api.getSession()` and attaches the result to `req.authSession`. Returns `401` if no session.
- **Protected route example:** `GET /api/me` — uses `requireAuth`, reads `req.authSession.user.id`.
- **Required env var:** `BETTER_AUTH_SECRET` (min 32 chars). Also needs `CLIENT_URL` for trusted origins.

### Client-side

- **Auth client:** `client/src/lib/auth-client.ts` — `createAuthClient()` from `better-auth/react`, no config needed (Vite proxy forwards `/api/auth/*` to the server).
- **Session hook:** `authClient.useSession()` — returns `{ data: session, isPending }`.
- **Sign in:** `authClient.signIn.email({ email, password })` — returns `{ error }`.
- **Sign out:** `authClient.signOut()`.
- **Route protection:** `client/src/components/ProtectedRoute.tsx` — wraps routes that require a session; redirects to `/login` if unauthenticated.

### Roles

Two roles exist: `admin` and `agent`. The role is stored as a string field on the `user` table (Better Auth additional field). No role-based middleware exists yet — access control per role is a future phase.

### Sign-up

Sign-up is **disabled** (`disableSignUp: true`). Users must be seeded via the seed script in `server/`.

## Implementation Phases

See `implementation-plan.md` for the full phased plan. Phase 1 (monorepo setup) and Phase 2 (authentication) are complete. Next phases cover ticket management, AI integration, and email.
