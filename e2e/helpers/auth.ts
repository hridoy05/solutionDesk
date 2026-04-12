import { type Page } from '@playwright/test';

/**
 * Seeded test-database credentials (mirror of server/.env.test).
 * Override via environment variables so CI can inject different values.
 */
export const TEST_USERS = {
  admin: {
    email:    process.env.TEST_ADMIN_EMAIL    ?? 'admin@example.com',
    password: process.env.TEST_ADMIN_PASSWORD ?? 'Admin1234!',
    name:     'Admin',
    role:     'admin' as const,
  },
  agent: {
    email:    process.env.TEST_AGENT_EMAIL    ?? 'agent@example.com',
    password: process.env.TEST_AGENT_PASSWORD ?? 'Agent1234!',
    name:     'Agent',
    role:     'agent' as const,
  },
} as const;

export type UserRole = keyof typeof TEST_USERS;

/**
 * Log in via the Better Auth REST endpoint directly (no UI overhead).
 * Call this from test.beforeEach / test fixtures when you need a
 * pre-authenticated state without going through the login page itself.
 *
 * After this call the browser has a valid session cookie — navigate
 * to any protected page directly.
 */
export async function loginAs(page: Page, role: UserRole): Promise<void> {
  const user = TEST_USERS[role];
  const response = await page.request.post('/api/auth/sign-in/email', {
    data: { email: user.email, password: user.password },
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok()) {
    throw new Error(
      `loginAs('${role}') failed: ${response.status()} ${await response.text()}`
    );
  }
}
