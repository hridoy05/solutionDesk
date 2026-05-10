import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './lib/auth';
import { requireAuth } from './middleware/requireAuth';
import prisma from './lib/prisma';
import agentsRouter from './routes/agents';
import usersRouter from './routes/users';
import inboundRouter from './routes/inbound';
import ticketsRouter from './routes/tickets';

const app = express();

app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
});
app.use('/api/auth/', authLimiter);
app.all('/api/auth/*', toNodeHandler(auth));

app.use('/api/inbound/email', inboundRouter);

app.use(express.json());

app.use('/api/agents', agentsRouter);
app.use('/api/users', usersRouter);
app.use('/api/tickets', ticketsRouter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/me', requireAuth, async (req, res) => {
  const userId = req.authSession.user.id;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, emailVerified: true, role: true, createdAt: true },
  });
  res.json(user);
});

export default app;
