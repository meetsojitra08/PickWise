import { expect, test } from '@playwright/test';

test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Storefront discovery, catalog filtering, theme & mobile layout', () => {
  test('home page loads live showcase with security headers and navigates to category catalog', async ({
    page,
  }) => {
    const apiFailures: string[] = [];
    page.on('response', (response) => {
      if (
        response.url().includes('/api/v1/products') &&
        response.status() >= 400
      ) {
        apiFailures.push(`${response.status()} ${response.url()}`);
      }
    });

    const response = await page.goto('/');
    expect(response).not.toBeNull();
    expect(response?.status()).toBe(200);

    const headers = response?.headers() ?? {};
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['x-frame-options']).toBe('DENY');
    expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');

    await expect(
      page.getByRole('heading', {
        level: 1,
        name: /Decide what to buy, with the homework done\./i,
      }),
    ).toBeVisible();

    // Wait for live Top Value showcase cards to load from /api/v1/products
    await expect(
      page.locator('article a[href^="/products/"]').first(),
    ).toBeVisible();
    expect(apiFailures).toEqual([]);

    // Navigate from category tile into filtered catalog
    await page.getByRole('link', { name: 'Laptops' }).first().click();
    await expect(page).toHaveURL(/\/products\?category=laptops/);
    await expect(
      page.getByRole('heading', { level: 1, name: 'Find the right fit' }),
    ).toBeVisible();
    await expect(
      page.getByRole('group', { name: 'Applied filters' }),
    ).toContainText('Laptops');
  });

  test('catalog search, filters, sorting, URL persistence and clear all', async ({
    page,
  }) => {
    await page.goto('/products');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Find the right fit' }),
    ).toBeVisible();

    // Filter by category: Headphones
    await page
      .locator('aside')
      .getByRole('combobox', { name: 'Category' })
      .selectOption('headphones');
    await expect(page).toHaveURL(/category=headphones/);

    // Filter by max price and sort by top rated
    await page.locator('aside').getByLabel('Maximum').fill('30000');
    await page.getByLabel('Sort products').selectOption('rating');

    await expect(page).toHaveURL(/price_max=30000/);
    await expect(page).toHaveURL(/sort=rating/);

    const appliedFilters = page.getByRole('group', { name: 'Applied filters' });
    await expect(appliedFilters).toContainText('Headphones');
    await expect(appliedFilters).toContainText('Max price: 30000');

    // Products load for these filters
    await expect(
      page
        .getByRole('region', { name: 'Catalog results' })
        .locator('article')
        .first(),
    ).toBeVisible();

    // Reload and confirm URL-synced filters persist
    await page.reload();
    await expect(page).toHaveURL(/category=headphones/);
    await expect(page).toHaveURL(/price_max=30000/);
    await expect(page).toHaveURL(/sort=rating/);
    await expect(
      page.locator('aside').getByRole('combobox', { name: 'Category' }),
    ).toHaveValue('headphones');
    await expect(page.getByLabel('Sort products')).toHaveValue('rating');

    // Clear all filters
    await page
      .getByRole('group', { name: 'Applied filters' })
      .getByRole('button', { name: 'Clear all' })
      .click();
    await expect(page).toHaveURL(/\/products$/);
  });

  test('dark mode toggle persists cleanly across page reload', async ({
    page,
  }) => {
    await page.goto('/');

    const html = page.locator('html');
    const toggle = page.getByRole('button', {
      name: /Switch to (dark|light) theme/i,
    });
    const initiallyDark = await html.evaluate((el) =>
      el.classList.contains('dark'),
    );

    await toggle.click();

    await expect(html).toHaveClass(
      initiallyDark ? /^(?!.*\bdark\b)/ : /\bdark\b/,
    );

    await page.reload();
    await expect(html).toHaveClass(
      initiallyDark ? /^(?!.*\bdark\b)/ : /\bdark\b/,
    );
  });

  test('mobile viewport renders home and catalog filter sheet without horizontal overflow', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    const homeOverflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth,
    );
    expect(homeOverflow).toBe(false);

    await page.goto('/products');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Find the right fit' }),
    ).toBeVisible();

    const catalogOverflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth,
    );
    expect(catalogOverflow).toBe(false);

    // Open mobile filter sheet
    await page.getByRole('button', { name: 'Filters' }).click();
    await expect(
      page.getByRole('heading', { name: 'Filter products' }),
    ).toBeVisible();
  });
});
