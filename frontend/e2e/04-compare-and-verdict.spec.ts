import { expect, test } from '@playwright/test';
import { stubCompareVerdict } from './helpers/ai-mocks.ts';
import { fetchCatalogProducts } from './helpers/catalog.ts';

test.describe('Product comparison matrix, AI verdict, saved comparison & share link', () => {
  test('selects products into tray, inspects matrix, gets AI verdict, saves and shares comparison', async ({
    browser,
    page,
    request,
  }) => {
    test.setTimeout(90_000);
    const laptops = await fetchCatalogProducts(request, {
      category: 'laptops',
      per_page: '3',
    });
    expect(laptops.length).toBeGreaterThanOrEqual(2);
    const [firstLaptop, secondLaptop] = laptops;

    // Intercept ONLY the Groq-backed compare verdict endpoint
    await stubCompareVerdict(page, [firstLaptop, secondLaptop]);

    // Start on laptops catalog and clear any pre-existing tray state
    await page.goto('/products?category=laptops');
    const clearTray = page.getByRole('button', { name: 'Clear comparison' });
    if (await clearTray.isVisible()) {
      await clearTray.click();
    }

    // Add two laptops to the floating compare tray
    const results = page.getByRole('region', { name: 'Catalog results' });
    await results
      .getByRole('button', { name: `Add ${firstLaptop.name} to comparison` })
      .click();
    await results
      .getByRole('button', { name: `Add ${secondLaptop.name} to comparison` })
      .click();

    const tray = page.getByRole('complementary', { name: 'Compare tray' });
    await expect(tray).toBeVisible();
    await expect(tray).toContainText('2 of 4 selected');

    // Verify tray persists across reload
    await page.reload();
    await expect(
      page.getByRole('complementary', { name: 'Compare tray' }),
    ).toContainText('2 of 4 selected');

    // Navigate to /compare from tray
    await page
      .getByRole('complementary', { name: 'Compare tray' })
      .getByRole('link', { name: 'Compare' })
      .click();
    await expect(page).toHaveURL('/compare');
    await expect(
      page.getByRole('heading', {
        level: 1,
        name: 'Compare products side by side',
      }),
    ).toBeVisible();

    // Real backend comparison matrix renders both laptops and spec rows
    const table = page.locator('table');
    await expect(table).toBeVisible();
    await expect(table).toContainText(firstLaptop.name);
    await expect(table).toContainText(secondLaptop.name);

    // Toggle "Show only differences"
    const diffCheckbox = page.getByLabel(/Show only differences/i);
    await diffCheckbox.click();
    await expect(diffCheckbox).toBeChecked();
    await diffCheckbox.click();
    await expect(diffCheckbox).not.toBeChecked();

    // Request AI verdict (served by deterministic stub; Groq API never called)
    await page.getByRole('button', { name: 'Get AI verdict' }).click();
    await expect(
      page.getByText(
        `${firstLaptop.name} delivers the strongest overall balance of specs and price.`,
      ),
    ).toBeVisible();

    // Save comparison to customer account
    const comparisonName = `E2E Laptop Showdown ${Date.now()}`;
    await page.getByLabel('Name this comparison').fill(comparisonName);
    await page.getByRole('button', { name: 'Save comparison' }).click();
    await expect(
      page.getByRole('link', { name: 'View your saved comparisons' }),
    ).toBeVisible();

    // Open Account -> Saved comparisons tab
    await page
      .getByRole('link', { name: 'View your saved comparisons' })
      .click();
    await expect(page).toHaveURL(/\/account\?tab=comparisons/);

    const savedCard = page
      .locator('article')
      .filter({ hasText: comparisonName });
    await expect(savedCard).toBeVisible();

    // Generate read-only share link and verify it opens in an unauthenticated guest context
    await savedCard.getByRole('button', { name: 'Share' }).click();
    const shareInput = savedCard.getByLabel('Read-only share link');
    await expect(shareInput).toBeVisible();
    const shareUrl = await shareInput.inputValue();
    expect(shareUrl).toMatch(/\/compare\/shared\/[A-Za-z0-9]+$/);

    const guestContext = await browser.newContext({
      storageState: { cookies: [], origins: [] },
    });
    const guestPage = await guestContext.newPage();
    await guestPage.goto(shareUrl);
    await expect(guestPage.locator('table')).toBeVisible();
    await expect(guestPage.locator('table')).toContainText(firstLaptop.name);
    await expect(guestPage.locator('table')).toContainText(secondLaptop.name);
    await guestContext.close();

    // Clean up: delete saved comparison and clear compare tray
    await savedCard.getByRole('button', { name: 'Delete' }).click();
    await savedCard.getByRole('button', { name: 'Confirm delete' }).click();
    await expect(savedCard).toHaveCount(0);

    const trayClearAfter = page.getByRole('button', {
      name: 'Clear comparison',
    });
    if (await trayClearAfter.isVisible()) {
      await trayClearAfter.click();
    }
  });
});
