import 'dotenv/config';
import app from './app';
import prisma from './lib/prisma';
import boss from './lib/boss';
import { registerClassifyWorker } from './workers/classify';

const PORT = process.env.PORT || 5000;

const secret = process.env.BETTER_AUTH_SECRET;
if (!secret || secret.length < 32 || secret === 'your-secret-key-change-in-production') {
  console.error('FATAL: BETTER_AUTH_SECRET is missing, too short, or uses the example value. Set a strong random secret (min 32 chars).');
  process.exit(1);
}

async function start() {
  console.log('Connecting to database...');
  try {
    await prisma.$connect();
    console.log('Database connected');
  } catch (err) {
    console.error('Database connection failed:', err);
    process.exit(1);
  }

  await boss.start();
  console.log('Job queue started');
  await registerClassifyWorker();

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

start();
