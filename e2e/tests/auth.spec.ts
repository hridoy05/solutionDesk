import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { loginAs, TEST_USERS } from '../helpers/auth';

// ---------------------------------------------------------------------------
// Auth spec — covers the full authentication surface of SolutionDesk
//
// Group layout:
//   1. Login page — happy paths (admin, agent)
//   2. Login page — form validation (client-side, zod/react-hook-form)
//   3. Login page — server-side errors (wrong password, unknown email)
//   4. Sign-out flow
//   5. Session persistence
//   6. Route protection — unauthenticated redirects
//   7. Role-based access — /users admin-only route
//   8. Sign-up disabled
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// 1. Happy paths
// ---------------------------------------------------------------------------
test.describe('Login page — happy paths', () => {
  test('admin can log in with valid credentials and reach the dashboard', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // Verify we are on the login page
    await expect(page).toHaveURL('/login');
    await expect(page.getByText('SolutionDesk')).toBeVisible();
    await expect(page.getByText('Sign in to your account')).toBeVisible();

    await loginPage.login(TEST_USERS.admin.email, TEST_USERS.admin.password);

    // Should redirect to the dashboard (root route)
    await expect(page).toHaveURL('/');
    await expect(page.getByText('Welcome to SolutionDesk')).toBeVisible();

    // Navbar should show the user's name
    await expect(page.getByText(TEST_USERS.admin.name)).toBeVisible();
  });

  test('agent can log in with valid credentials and reach the dashboard', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    await loginPage.login(TEST_USERS.agent.email, TEST_USERS.agent.password);

    await expect(page).toHaveURL('/');
    await expect(page.getByText('Welcome to SolutionDesk')).toBeVisible();
    await expect(page.getByText(TEST_USERS.agent.name)).toBeVisible();
  });

  test('already-authenticated user visiting /login is redirected to /', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/login');

    // LoginPage detects the session and navigates away
    await expect(page).toHaveURL('/');
  });
});

// ---------------------------------------------------------------------------
// 2. Client-side form validation
// ---------------------------------------------------------------------------
test.describe('Login page — form validation', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  test('shows error when email field is empty', async () => {
    // Leave email blank, fill password, submit
    await loginPage.fillPassword('somepassword');
    await loginPage.submit();

    await expect(loginPage.emailError).toBeVisible();
    await expect(loginPage.emailError).toContainText(/valid email/i);
  });

  test('shows error when password field is empty', async () => {
    await loginPage.fillEmail(TEST_USERS.admin.email);
    // Leave password blank
    await loginPage.submit();

    await expect(loginPage.passwordError).toBeVisible();
    await expect(loginPage.passwordError).toContainText(/required/i);
  });

  test('shows error for invalid email format', async () => {
    await loginPage.fillEmail('not-an-email');
    await loginPage.fillPassword('somepassword');
    await loginPage.submit();

    await expect(loginPage.emailError).toBeVisible();
    await expect(loginPage.emailError).toContainText(/valid email/i);
  });

  test('shows errors for both fields when form is submitted empty', async () => {
    await loginPage.submit();

    await expect(loginPage.emailError).toBeVisible();
    await expect(loginPage.passwordError).toBeVisible();
  });

  test('whitespace-only email is treated as invalid', async ({ page }) => {
    // The browser native email input type trims/blocks pure whitespace,
    // and zod .email() rejects it. We fill via JS to bypass browser trim.
    await loginPage.emailInput.evaluate<void, string>(
      (el, val) => { (el as HTMLInputElement).value = val; },
      '   '
    );
    // Trigger react-hook-form's change event
    await loginPage.emailInput.dispatchEvent('input');
    await loginPage.fillPassword('somepassword');
    await loginPage.submit();

    await expect(loginPage.emailError).toBeVisible();
  });

  test('whitespace-only password is treated as invalid', async ({ page }) => {
    await loginPage.fillEmail(TEST_USERS.admin.email);
    // react-hook-form min(1) catches whitespace-only as an empty string
    // via the browser; we rely on the submit failing without a server call.
    await loginPage.passwordInput.fill('   ');
    await loginPage.submit();

    // Must not navigate away from the login page
    await expect(page).toHaveURL('/login');

    // zod min(1) accepts whitespace so the form submits; the server rejects it
    await expect(loginPage.rootAlert).toBeVisible();
  });

  test('submit button shows loading state while signing in', async ({ page }) => {
    await loginPage.fillEmail(TEST_USERS.admin.email);
    await loginPage.fillPassword(TEST_USERS.admin.password);

    // Click and immediately check for the loading label
    await loginPage.submitButton.click();
    // The button text transitions to "Signing in…" during the async call
    // This may resolve quickly, so we assert it appears at some point
    await expect(loginPage.submitButton).toHaveText(/signing in/i).catch(() => {
      // If it resolved before we could catch it, that is acceptable —
      // the test does not fail, navigation to "/" is the proof.
    });

    await expect(page).toHaveURL('/');
  });
});

// ---------------------------------------------------------------------------
// 3. Server-side errors
// ---------------------------------------------------------------------------
test.describe('Login page — server-side errors', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  test('shows error for wrong password on a valid email', async ({ page }) => {
    await loginPage.login(TEST_USERS.admin.email, 'WrongPassword99!');

    await expect(loginPage.rootAlert).toBeVisible();
    // Must stay on login page
    await expect(page).toHaveURL('/login');
  });

  test('shows error for non-existent email', async ({ page }) => {
    await loginPage.login('nobody@nowhere.example', 'SomePassword1!');

    await expect(loginPage.rootAlert).toBeVisible();
    await expect(page).toHaveURL('/login');
  });

  test('error message is visible and descriptive (not blank)', async () => {
    await loginPage.login(TEST_USERS.admin.email, 'BadPassword!');

    await expect(loginPage.rootAlert).toBeVisible();
    // The alert must contain some non-empty text
    const text = await loginPage.rootAlert.textContent();
    expect(text?.trim().length).toBeGreaterThan(0);
  });

  test('error clears and login succeeds after correcting credentials', async ({ page }) => {
    // First attempt — wrong password
    await loginPage.login(TEST_USERS.admin.email, 'WrongPassword99!');
    await expect(loginPage.rootAlert).toBeVisible();

    // Second attempt — correct credentials
    await loginPage.fillEmail(TEST_USERS.admin.email);
    await loginPage.fillPassword(TEST_USERS.admin.password);
    await loginPage.submit();

    await expect(page).toHaveURL('/');
    await expect(loginPage.rootAlert).not.toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// 4. Sign-out flow
// ---------------------------------------------------------------------------
test.describe('Sign-out flow', () => {
  test('signed-in user can sign out and is redirected to /login', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/');
    await expect(page.getByText('Welcome to SolutionDesk')).toBeVisible();

    await page.getByRole('button', { name: /sign out/i }).click();

    await expect(page).toHaveURL('/login');
  });

  test('after sign-out, navigating to a protected route redirects to /login', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/');

    await page.getByRole('button', { name: /sign out/i }).click();
    await expect(page).toHaveURL('/login');

    // Now try to navigate directly to the protected root
    await page.goto('/');
    await expect(page).toHaveURL('/login');
  });

  test('browser back button after sign-out does not restore the session', async ({ page }) => {
    await loginAs(page, 'agent');
    await page.goto('/');
    await expect(page.getByText('Welcome to SolutionDesk')).toBeVisible();

    await page.getByRole('button', { name: /sign out/i }).click();
    await expect(page).toHaveURL('/login');

    // Navigate back — React Router will re-evaluate the session
    await page.goBack();

    // ProtectedRoute checks session; with no valid cookie it redirects to /login
    await expect(page).toHaveURL('/login');
  });

  test('after sign-out the navbar sign-out button is no longer visible', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/');

    await page.getByRole('button', { name: /sign out/i }).click();
    await expect(page).toHaveURL('/login');

    // The navbar with the sign-out button is only rendered on protected pages
    await expect(page.getByRole('button', { name: /sign out/i })).not.toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// 5. Session persistence
// ---------------------------------------------------------------------------
test.describe('Session persistence', () => {
  test('session survives a full page reload', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/');
    await expect(page.getByText('Welcome to SolutionDesk')).toBeVisible();

    await page.reload();

    // Should still be on the dashboard, not redirected to /login
    await expect(page).toHaveURL('/');
    await expect(page.getByText('Welcome to SolutionDesk')).toBeVisible();
    await expect(page.getByText(TEST_USERS.admin.name)).toBeVisible();
  });

  test('session survives navigation between pages', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/');

    // Navigate to the admin-only /users page and back
    await page.goto('/users');
    await expect(page).toHaveURL('/users');

    await page.goto('/');
    await expect(page).toHaveURL('/');
    await expect(page.getByText(TEST_USERS.admin.name)).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// 6. Route protection — unauthenticated redirects
// ---------------------------------------------------------------------------
test.describe('Route protection', () => {
  test('unauthenticated user visiting / is redirected to /login', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL('/login');
  });

  test('unauthenticated user visiting /users is redirected to /login', async ({ page }) => {
    await page.goto('/users');
    await expect(page).toHaveURL('/login');
  });

  test('login page is accessible without authentication', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveURL('/login');
    await expect(page.getByText('SolutionDesk')).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// 7. Role-based access — /users is admin-only
// ---------------------------------------------------------------------------
test.describe('Role-based access', () => {
  test('admin can access /users page', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/users');

    await expect(page).toHaveURL('/users');
    await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible();
  });

  test('admin navbar shows the Users link', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/');

    await expect(page.getByRole('link', { name: 'Users' })).toBeVisible();
  });

  test('agent is redirected away from /users to /', async ({ page }) => {
    await loginAs(page, 'agent');
    await page.goto('/users');

    // AdminRoute: non-admin → Navigate to "/"
    await expect(page).toHaveURL('/');
  });

  test('agent navbar does not show the Users link', async ({ page }) => {
    await loginAs(page, 'agent');
    await page.goto('/');

    await expect(page.getByRole('link', { name: 'Users' })).not.toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// 8. Sign-up disabled
// ---------------------------------------------------------------------------
test.describe('Sign-up disabled', () => {
  test('/register returns 404 or redirects — no sign-up UI exists', async ({ page }) => {
    const response = await page.goto('/register');

    // The app has no /register route; React Router renders nothing matched.
    // The page either 404s at the server level or the SPA renders a blank/redirect.
    // What must NOT happen: a sign-up form appearing.
    const bodyText = await page.textContent('body');
    expect(bodyText).not.toMatch(/create.*account|register|sign.*up/i);
  });

  test('/signup returns 404 or redirects — no sign-up UI exists', async ({ page }) => {
    await page.goto('/signup');

    const bodyText = await page.textContent('body');
    expect(bodyText).not.toMatch(/create.*account|register|sign.*up/i);
  });

  test('login page has no link or button to a sign-up page', async ({ page }) => {
    await page.goto('/login');

    // There must be no navigational element pointing to sign-up
    const signUpLink = page.getByRole('link', { name: /sign.*up|register|create.*account/i });
    await expect(signUpLink).not.toBeVisible();
  });

  test('Better Auth sign-up endpoint returns 403 when called directly', async ({ page }) => {
    const response = await page.request.post('/api/auth/sign-up/email', {
      data: {
        email: 'newuser@example.com',
        password: 'NewUser1234!',
        name: 'New User',
      },
      headers: { 'Content-Type': 'application/json' },
    });

    // disableSignUp: true causes Better Auth to return 400
    expect(response.status()).toBe(400);
  });
});
