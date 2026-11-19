/**
 * Screenshot capture spec for docs/screenshots/
 *
 * Run with:
 *   npx playwright test e2e/screenshots.spec.ts --project=chromium
 *
 * Outputs 7 PNGs to ../docs/screenshots/
 * This file is not part of the regular CI suite.
 */

import path from 'path';
import { fileURLToPath } from 'url';
import { test, expect } from '@playwright/test';
import { fetchCatalogProducts } from './helpers/catalog.ts';
import { stubCompareVerdict } from './helpers/ai-mocks.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OUT = path.resolve(__dirname, '../../docs/screenshots');

// Helpers -----------------------------------------------------------------

async function dismissCookieBanner(page: import('@playwright/test').Page) {
  const dismiss = page.locator(
    '[data-dismiss], [aria-label="Close"], button:has-text("Got it")',
  );
  if (await dismiss.count())
    await dismiss
      .first()
      .click()
      .catch(() => {});
}

async function snap(
  page: import('@playwright/test').Page,
  filename: string,
  options?: { clip?: { x: number; y: number; width: number; height: number } },
) {
  await page.waitForTimeout(1000);
  await page.screenshot({
    path: path.join(OUT, filename),
    fullPage: false,
    animations: 'disabled',
    ...options,
  });
  console.log(`  ✔ saved ${filename}`);
}

// -------------------------------------------------------------------------

test.describe('Portfolio screenshots', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  // 01 — Home hero --------------------------------------------------------
  test('01-home-hero', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await dismissCookieBanner(page);
    await expect(
      page.locator('h1, [data-testid="hero-heading"], main h2').first(),
    ).toBeVisible({ timeout: 15000 });
    await snap(page, '01-home-hero.png');
  });

  // 02 — Catalog page -----------------------------------------------------
  test('02-catalog', async ({ page }) => {
    await page.goto('/products');
    await page.waitForLoadState('networkidle');
    await dismissCookieBanner(page);
    await expect(
      page.locator('article a[href^="/products/"]').first(),
    ).toBeVisible({ timeout: 20000 });
    await snap(page, '02-catalog.png');
  });

  // 03 — Product detail ---------------------------------------------------
  test('03-product-detail', async ({ page }) => {
    await page.goto('/products');
    await page.waitForLoadState('networkidle');
    const firstProductLink = page
      .locator('article a[href^="/products/"]')
      .first();
    await expect(firstProductLink).toBeVisible({ timeout: 20000 });
    const href = await firstProductLink.getAttribute('href');
    await page.goto(href ?? '/products/macbook-pro-14-m3');
    await page.waitForLoadState('networkidle');
    await dismissCookieBanner(page);
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 20000 });
    await snap(page, '03-product-detail.png');
  });

  // 04 — Compare matrix ---------------------------------------------------
  test('04-compare-matrix', async ({ page, request }) => {
    test.setTimeout(90_000);
    const laptops = await fetchCatalogProducts(request, {
      category: 'laptops',
      per_page: '3',
    });
    expect(laptops.length).toBeGreaterThanOrEqual(2);
    const [firstLaptop, secondLaptop] = laptops;

    await stubCompareVerdict(page, [firstLaptop, secondLaptop]);

    await page.goto('/products?category=laptops');
    await page.waitForLoadState('networkidle');
    await dismissCookieBanner(page);

    const clearTray = page.getByRole('button', { name: 'Clear comparison' });
    if (await clearTray.isVisible()) {
      await clearTray.click();
    }

    const results = page.getByRole('region', { name: 'Catalog results' });
    await results
      .getByRole('button', { name: `Add ${firstLaptop.name} to comparison` })
      .click();
    await results
      .getByRole('button', { name: `Add ${secondLaptop.name} to comparison` })
      .click();

    const tray = page.getByRole('complementary', { name: 'Compare tray' });
    await expect(tray).toBeVisible();

    await tray.getByRole('link', { name: 'Compare' }).click();
    await expect(page).toHaveURL('/compare');
    await expect(page.locator('table')).toBeVisible();

    const getVerdictBtn = page.getByRole('button', { name: 'Get AI verdict' });
    if (await getVerdictBtn.isVisible()) {
      await getVerdictBtn.click();
      await expect(
        page.getByText(
          `${firstLaptop.name} delivers the strongest overall balance of specs and price.`,
        ),
      ).toBeVisible({ timeout: 10000 });
    }

    await snap(page, '04-compare-matrix.png');
  });

  // 05 — AI assistant (dark mode) -----------------------------------------
  test('05-assistant', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('pickwise-theme', 'dark');
    });
    await page.goto('/assistant');
    await page.waitForLoadState('networkidle');
    await dismissCookieBanner(page);
    await snap(page, '05-assistant.png');
  });

  // 06 — Admin dashboard --------------------------------------------------
  test('06-admin-dashboard', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      storageState: { cookies: [], origins: [] },
    });
    const page = await context.newPage();
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.getByLabel('Email').fill('admin@pickwise.test');
    await page.getByLabel('Password', { exact: true }).fill('password');
    await page.getByRole('button', { name: 'Log in' }).click();
    await expect(page).toHaveURL('/');

    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
    await dismissCookieBanner(page);
    await expect(
      page.getByRole('heading', { name: 'Admin overview' }),
    ).toBeVisible({ timeout: 20000 });
    await snap(page, '06-admin-dashboard.png');
    await context.close();
  });

  // 07 — Mobile catalog (390px) -------------------------------------------
  test('07-mobile-catalog', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();
    await page.goto('/products');
    await page.waitForLoadState('networkidle');
    await dismissCookieBanner(page);
    await expect(
      page.locator('article a[href^="/products/"]').first(),
    ).toBeVisible({ timeout: 20000 });
    await snap(page, '07-mobile-catalog.png');
    await context.close();
  });
});
