import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { expect, test as setup } from '@playwright/test';

const AUTH_FILE = path.resolve(import.meta.dirname, '.auth/customer.json');

const CUSTOMER_EMAIL = process.env.E2E_CUSTOMER_EMAIL ?? 'test@example.com';
const CUSTOMER_PASSWORD = process.env.E2E_CUSTOMER_PASSWORD ?? 'password';

setup('authenticate seeded customer account', async ({ page }) => {
  mkdirSync(path.dirname(AUTH_FILE), { recursive: true });

  await page.goto('/login');
  await expect(
    page.getByRole('heading', { name: 'Log in to Pickwise' }),
  ).toBeVisible();

  await page.getByLabel('Email').fill(CUSTOMER_EMAIL);
  await page.getByLabel('Password', { exact: true }).fill(CUSTOMER_PASSWORD);
  await page.getByRole('button', { name: 'Log in' }).click();

  await expect(page).toHaveURL('/');
  await expect(
    page.getByRole('button', { name: /Account menu for/i }),
  ).toBeVisible();

  await page.context().storageState({ path: AUTH_FILE });
});
