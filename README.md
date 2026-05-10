# SolutionDesk

An AI-powered support ticket management system where customer emails are auto-classified and agents respond quickly with Claude-assisted replies.

## Overview

SolutionDesk streamlines customer support by automatically ingesting inbound emails, categorizing them, and surfacing AI-generated reply suggestions to agents. Admins manage the agent roster; agents work the ticket queue.

**Roles**
- **Admin** — manages agent accounts
- **Agent** — views and responds to tickets

**Ticket statuses:** Open → Resolved → Closed

**Ticket categories:** General Question · Technical Question · Refund Request

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS v4, shadcn/ui |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL + Prisma ORM |
| Auth | Better Auth (session-based) |
| AI | Anthropic Claude API |
| Email | SendGrid (inbound webhook) |
| Testing | Vitest + React Testing Library, Playwright (E2E) |

## Project Structure

```
solutionDesk/
├── client/          # React frontend (port 5173)
├── server/          # Express backend (port 5000)
├── e2e/             # Playwright end-to-end tests
└── package.json     # npm workspaces root
```

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL database
- Anthropic API key (for AI features)

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp server/.env.example server/.env
```

Edit `server/.env` and fill in the required values:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/solutiondesk
BETTER_AUTH_SECRET=     # min 32 chars — generate with: openssl rand -base64 32
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=         # min 8 chars
```

### 3. Set up the database

```bash
cd server
npm run db:migrate      # run migrations
npm run db:seed         # seed admin + agent accounts
```

### 4. Start the dev server

```bash
# from the root — starts client and server concurrently
npm run dev
```

- Client: http://localhost:5173
- Server: http://localhost:5000

## Available Scripts

### Root

| Command | Description |
|---|---|
| `npm run dev` | Start client + server together |
| `npm run build` | Build both packages |
| `npm run test:e2e` | Run Playwright E2E tests |
| `npm run test:e2e:ui` | Open Playwright UI |

### Server (`cd server`)

| Command | Description |
|---|---|
| `npm run dev` | Start with hot reload |
| `npm run build` | Compile TypeScript |
| `npm start` | Run compiled output |
| `npm run db:migrate` | Run Prisma migrations |
| `npm run db:seed` | Seed database |
| `npm run db:studio` | Open Prisma Studio |

### Client (`cd client`)

| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server |
| `npm run build` | TypeScript check + Vite build |
| `npm test` | Run Vitest unit tests |
| `npm run test:watch` | Run tests in watch mode |

## Authentication

Sign-up is disabled — accounts are created via the seed script. Default seeded credentials are set by `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and (optionally) `AGENT_PASSWORD` in your `.env`.

## License

MIT
