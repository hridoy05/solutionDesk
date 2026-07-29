## Tech Stack

### Frontend
- **React** – UI library for building the dashboard and ticket views
- **TypeScript** – static typing across the frontend codebase

### Backend
- **Node.js** – runtime environment
- **Express.js** – REST API server and routing

### Database
- **PostgreSQL** – primary relational database
- **Prisma** – type-safe ORM for schema management and queries

### Authentication
- **Database sessions** – sessions stored in PostgreSQL; no JWTs

### Email
- **SendGrid** – inbound email parsing (webhook → ticket creation) and outbound response sending

### AI
- **Vercel AI SDK + Google Gemini** – ticket classification, AI summaries, suggested replies, and auto-generated responses from the knowledge base
