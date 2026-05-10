import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { Role } from '@prisma/client';
import prisma from './prisma';

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:5000',
  database: prismaAdapter(prisma, { provider: 'postgresql' }),
  emailAndPassword: { enabled: true, disableSignUp: true },
  trustedOrigins: [process.env.CLIENT_URL || 'http://localhost:5173'],
  user: {
    additionalFields: {
      role: {
        type: 'string',
        required: true,
        defaultValue: Role.agent,
      },
    },
  },
});
