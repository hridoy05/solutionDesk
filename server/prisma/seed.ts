import 'dotenv/config';
import { hashPassword } from 'better-auth/crypto';
import prisma from '../src/lib/prisma';

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env');
  }

  const hashed = await hashPassword(password);

  const user = await prisma.user.upsert({
    where: { email },
    update: { role: 'admin' },
    create: {
      email,
      name: 'Admin',
      emailVerified: true,
      role: 'admin',
    },
  });

  await prisma.account.upsert({
    where: { providerId_accountId: { providerId: 'credential', accountId: email } },
    update: { password: hashed },
    create: {
      accountId: email,
      providerId: 'credential',
      userId: user.id,
      password: hashed,
    },
  });

  console.log(`Admin seeded: ${email}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
