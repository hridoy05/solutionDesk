import 'dotenv/config';
import { hashPassword } from 'better-auth/crypto';
import { Role } from '@prisma/client';
import prisma from '../src/lib/prisma';
import { CREDENTIAL_PROVIDER } from '../src/lib/constants';

async function seedUser(email: string, name: string, role: Role, password: string) {
  const hashed = await hashPassword(password);

  const user = await prisma.user.upsert({
    where: { email },
    update: { role },
    create: { email, name, emailVerified: true, role },
  });

  await prisma.account.upsert({
    where: { providerId_accountId: { providerId: CREDENTIAL_PROVIDER, accountId: email } },
    update: { password: hashed },
    create: {
      accountId: email,
      providerId: CREDENTIAL_PROVIDER,
      userId: user.id,
      password: hashed,
    },
  });

  console.log(`Seeded ${role}: ${email}`);
}

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const agentPassword = process.env.AGENT_PASSWORD;

  if (!adminEmail || !adminPassword) {
    throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env');
  }
  await seedUser(adminEmail, 'Admin', Role.admin, adminPassword);
  await seedUser('agent@example.com', 'Agent', Role.agent, agentPassword || adminPassword);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
