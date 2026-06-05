import { test, expect } from '@playwright/test';

test('login page loads', async ({ page }) => {
  await page.goto('/login');
  await expect(page.locator('h1, h2').first()).toBeVisible();
});

test('display mode route is public', async ({ page }) => {
  await page.goto('/display');
  await expect(page.locator('.display-mode')).toBeVisible();
});
