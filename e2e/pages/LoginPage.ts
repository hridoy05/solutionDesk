import { type Page, type Locator, expect } from '@playwright/test';

/**
 * Page Object for the /login route.
 *
 * Selector strategy (in priority order used throughout):
 *  1. getByRole / getByLabel  — semantic, most resilient
 *  2. getByText               — visible content
 *  3. locator('[aria-invalid]') for error-state introspection
 */
export class LoginPage {
  readonly page: Page;

  // Form fields
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;

  // Feedback
  readonly emailError: Locator;
  readonly passwordError: Locator;
  readonly rootAlert: Locator;

  constructor(page: Page) {
    this.page = page;

    this.emailInput    = page.getByLabel('Email');
    this.passwordInput = page.getByLabel('Password');
    this.submitButton  = page.getByRole('button', { name: /sign in/i });

    // Inline validation messages rendered by react-hook-form
    this.emailError    = page.locator('input#email ~ p');
    this.passwordError = page.locator('input#password ~ p');

    // Server-side / root-level shadcn Alert
    this.rootAlert = page.getByRole('alert');
  }

  async goto() {
    await this.page.goto('/login');
    await expect(this.submitButton).toBeVisible();
  }

  async fillEmail(value: string) {
    await this.emailInput.fill(value);
  }

  async fillPassword(value: string) {
    await this.passwordInput.fill(value);
  }

  async submit() {
    await this.submitButton.click();
  }

  /**
   * Fill and submit the login form in one call.
   * Does NOT wait for navigation — callers assert on outcome themselves.
   */
  async login(email: string, password: string) {
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.submit();
  }
}
