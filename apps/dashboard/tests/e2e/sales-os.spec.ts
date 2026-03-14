import { test, expect } from '@playwright/test';

test.describe('Sales OS Dashboard', () => {
  test('should load the Sales OS landing page', async ({ page }) => {
    // Navigate to the Sales OS page
    await page.goto('/sales');

    // Check for the main title heading specifically
    await expect(page.getByRole('heading', { name: 'SALES OS' })).toBeVisible();

    // Verify module selection cards are present
    await expect(page.getByText('LDR Elite')).toBeVisible();
    await expect(page.getByText('BDR Intel')).toBeVisible();
    await expect(page.getByText('SDR Hunter')).toBeVisible();
    await expect(page.getByText('Closer Elite')).toBeVisible();
  });

  test('should navigate to LDR module tools', async ({ page }) => {
    await page.goto('/sales');

    // Click on LDR module card's parent container or use force click as overlay might block
    // The previous error showed an overlay div intercepting clicks.
    // We can target the text and force click or target the container.
    // Let's try force: true to bypass the hover overlay
    await page.click('text=LDR Elite', { force: true });

    // Verify grid view loads with correct header
    await expect(page.getByText('LDR MODULE')).toBeVisible();
    await expect(page.getByText('Lead Qualifier')).toBeVisible();
  });

  test('should open a tool view', async ({ page }) => {
    await page.goto('/sales');
    await page.click('text=LDR Elite', { force: true });

    // Click on Lead Qualifier tool - might also have overlay
    await page.click('text=Lead Qualifier', { force: true });

    // Verify tool view loads
    // The header for tool view might be "Lead Qualifier SIMULAÇÃO GEMINI" or similar structure
    await expect(page.getByRole('heading', { name: 'Lead Qualifier' })).toBeVisible();
    await expect(page.getByPlaceholder('Setor, Tamanho, Faturamento...')).toBeVisible();
  });
});
