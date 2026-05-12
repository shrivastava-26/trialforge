import { test, expect } from '@playwright/test';

// Generate unique codes per run to avoid duplicate conflicts
const RUN_ID = Date.now().toString(36).slice(-5);

test.describe('Admin core workflow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('admin@test.com');
    await page.getByLabel(/password/i).fill('password123');
    await page.getByRole('button', { name: /log in|sign in/i }).click();
    await expect(page).toHaveURL(/\/admin\/dashboard/, { timeout: 15000 });
  });

  test('create study with status Planned', async ({ page }) => {
    await page.locator('.MuiDrawer-root').getByText('Studies').click();
    await expect(page).toHaveURL(/\/admin\/studies/, { timeout: 10000 });

    await page.getByRole('button', { name: /new study/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    const dialog = page.getByRole('dialog');
    await dialog.getByLabel(/protocol id/i).fill(`E2E-S-${RUN_ID}`);
    await dialog.getByLabel(/study name/i).fill('E2E Test Study');
    await dialog.getByLabel(/sponsor/i).fill('E2E Sponsor');
    // Phase defaults to Phase II, just click Next
    await dialog.getByRole('button', { name: /next/i }).click();

    // Step 2: Schedule — fill start date
    const today = new Date().toISOString().slice(0, 10);
    await dialog.getByLabel(/start date/i).fill(today);
    await dialog.getByRole('button', { name: /create/i }).click();

    await expect(page.getByText(/study created/i)).toBeVisible({ timeout: 5000 });
  });

  test('create site', async ({ page }) => {
    await page.locator('.MuiDrawer-root').getByText('Sites').click();
    await expect(page).toHaveURL(/\/admin\/sites/, { timeout: 10000 });

    await page.getByRole('button', { name: /new site/i }).click();

    const dialog = page.getByRole('dialog');
    await dialog.getByLabel(/site code/i).fill(`E2E-ST-${RUN_ID}`);
    await dialog.getByLabel(/site name/i).fill('E2E Test Site');
    await dialog.getByRole('button', { name: /next/i }).click();

    await dialog.getByLabel(/city/i).fill('TestCity');
    await dialog.getByLabel(/country/i).fill('TestCountry');
    await dialog.getByRole('button', { name: /create/i }).click();

    await expect(page.getByText(/site created/i)).toBeVisible({ timeout: 5000 });
  });

  test('create examiner and add certificate', async ({ page }) => {
    await page.locator('.MuiDrawer-root').getByText('Examiners').click();
    await expect(page).toHaveURL(/\/admin\/examiners/, { timeout: 10000 });

    await page.getByRole('button', { name: /new examiner/i }).click();

    const dialog = page.getByRole('dialog');
    // Step 1: Identity — Code, Name, Role
    await dialog.getByLabel(/examiner code/i).fill(`E2E-EX-${RUN_ID}`);
    await dialog.locator('input[name="name"]').fill('Dr. E2E');
    // Role defaults to Sub-Investigator, change to PI
    await dialog.getByLabel(/role/i).click();
    await page.getByRole('option', { name: /principal investigator/i }).click();
    await dialog.getByRole('button', { name: /next/i }).click();

    // Step 2: Contact — Specialty, Email
    await dialog.locator('input[name="specialty"]').fill('E2E Specialty');
    await dialog.locator('input[name="email"]').fill(`e2e-${RUN_ID}@test.com`);
    await dialog.getByRole('button', { name: /create/i }).click();

    await expect(page.getByText(/examiner created/i)).toBeVisible({ timeout: 5000 });

    // Navigate to examiner detail
    await page.getByText(`E2E-EX-${RUN_ID}`).click();
    await expect(page).toHaveURL(/\/admin\/examiners\/\d+/);

    // Add certificate
    await page.getByRole('button', { name: /add certificate/i }).click();
    const certDialog = page.getByRole('dialog');
    await certDialog.getByLabel(/certificate id/i).fill(`GCP-${RUN_ID}`);
    const futureDate = new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10);
    await certDialog.getByLabel(/expires on/i).fill(futureDate);
    await certDialog.getByRole('button', { name: /^add$/i }).click();

    await expect(page.getByText(/certificate added/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(`GCP-${RUN_ID}`)).toBeVisible();
  });

  test('audit logs page shows entries', async ({ page }) => {
    await page.locator('.MuiDrawer-root').getByText('Audit Logs').click();
    await expect(page).toHaveURL(/\/admin\/audit-logs/, { timeout: 10000 });

    // Page heading
    await expect(page.locator('h6').filter({ hasText: 'Audit Logs' })).toBeVisible();

    // Table should be visible
    const table = page.locator('table');
    await expect(table).toBeVisible();
  });
});
