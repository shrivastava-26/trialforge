import { test, expect } from '@playwright/test';

test.describe('Viewer smoke test', () => {
  test('login as viewer, navigate studies, verify read-only', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('viewer@test.com');
    await page.getByLabel(/password/i).fill('password123');
    await page.getByRole('button', { name: /log in|sign in/i }).click();

    // Should redirect to viewer dashboard
    await expect(page).toHaveURL(/\/viewer\/dashboard/, { timeout: 15000 });

    // Navigate to studies via sidebar — target the nav button within the drawer
    await page.locator('.MuiDrawer-root').getByText('Studies').click();
    await expect(page).toHaveURL(/\/viewer\/studies/, { timeout: 10000 });

    // Verify no Create button
    await expect(page.getByRole('button', { name: /new study|create/i })).not.toBeVisible();

    // If there are study rows, click the first one
    const rows = page.locator('[role="row"]');
    const rowCount = await rows.count();
    if (rowCount > 1) {
      await rows.nth(1).click();
      await expect(page).toHaveURL(/\/viewer\/studies\/\d+/);

      // Verify read-only: no Edit, Assign, or History buttons
      await expect(page.getByRole('button', { name: /edit/i })).not.toBeVisible();
      await expect(page.getByRole('button', { name: /assign/i })).not.toBeVisible();
      await expect(page.getByRole('button', { name: /history/i })).not.toBeVisible();
      await expect(page.getByRole('checkbox')).not.toBeVisible();
    }
  });
});
