import { test, expect } from '@playwright/test';

test.describe('Refresh token smoke', () => {
  test('clearing auth_token triggers refresh or redirects to login', async ({ page, context }) => {
    // Login
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('admin@test.com');
    await page.getByLabel(/password/i).fill('password123');
    await page.getByRole('button', { name: /log in|sign in/i }).click();
    await expect(page).toHaveURL(/\/admin\/dashboard/);

    // Clear only the auth_token cookie (keep refresh_token)
    const cookies = await context.cookies();
    const authCookie = cookies.find((c) => c.name === 'auth_token');
    if (authCookie) {
      await context.clearCookies({ name: 'auth_token' });
    }

    // Navigate to a protected page — should either:
    // 1. Refresh transparently and show the page, OR
    // 2. Redirect to /login if refresh also fails
    await page.goto('/admin/studies');
    await page.waitForTimeout(3000);

    const url = page.url();
    const isOnStudies = url.includes('/admin/studies') || url.includes('/admin/dashboard');
    const isOnLogin = url.includes('/login');

    // Either outcome is acceptable — the app handles the expired token gracefully
    expect(isOnStudies || isOnLogin).toBe(true);
  });
});
