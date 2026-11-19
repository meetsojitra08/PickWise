import { expect, test } from '@playwright/test';
import { stubAssistantConversation } from './helpers/ai-mocks.ts';
import { fetchCatalogProducts } from './helpers/catalog.ts';

test.describe('AI shopping assistant journey', () => {
  test('home hero query deep-links into assistant, renders grounded picks, and launches real compare matrix', async ({
    page,
    request,
  }) => {
    const laptops = await fetchCatalogProducts(request, {
      category: 'laptops',
      price_max: '150000',
      per_page: '2',
    });
    expect(laptops.length).toBeGreaterThanOrEqual(2);
    const pickedLaptops = laptops.slice(0, 2);

    await stubAssistantConversation(page, {
      products: pickedLaptops,
      replyContent:
        'Here are two verified laptops that balance creator performance and value under your budget.',
    });

    // Start from the Home hero command bar
    await page.goto('/');
    await page
      .getByPlaceholder("What are you shopping for, and what's your budget?")
      .fill('Laptop for video editing under 150000');
    await page.getByRole('button', { name: /Ask Assistant/i }).click();

    // Navigates to /assistant and cleans up URL params on mount
    await expect(page).toHaveURL(/\/assistant$/);
    await expect(
      page.getByRole('heading', { level: 1, name: 'Shopping Assistant' }),
    ).toBeVisible();

    // Grounded recommendation cards display real database products
    await expect(
      page.getByText(
        'Here are two verified laptops that balance creator performance and value under your budget.',
      ),
    ).toBeVisible();
    await expect(page.getByText(pickedLaptops[0].name).first()).toBeVisible();
    await expect(page.getByText(pickedLaptops[1].name).first()).toBeVisible();

    // One-click "Compare these" loads the AI picks into the real compare page
    await page.getByRole('button', { name: /Compare these \(2\)/i }).click();
    await expect(page).toHaveURL('/compare');
    const matrixTable = page.locator('table');
    await expect(matrixTable).toBeVisible();
    await expect(matrixTable).toContainText(pickedLaptops[0].name);
    await expect(matrixTable).toContainText(pickedLaptops[1].name);

    // Clear compare tray afterwards
    const clearTray = page.getByRole('button', { name: 'Clear comparison' });
    if (await clearTray.isVisible()) {
      await clearTray.click();
    }
  });

  test('displays graceful fallback banner and catalog matches when AI is unavailable', async ({
    page,
    request,
  }) => {
    const headphones = await fetchCatalogProducts(request, {
      category: 'headphones',
      per_page: '2',
    });
    expect(headphones.length).toBeGreaterThanOrEqual(2);

    await stubAssistantConversation(page, {
      products: headphones.slice(0, 2),
      status: 'fallback',
    });

    await page.goto('/assistant');
    await page.getByLabel('Filter by category').selectOption('headphones');
    await page.getByLabel('Maximum budget in rupees').fill('35000');
    await page
      .getByLabel('Message to assistant')
      .fill('Best ANC headphones for flights');
    await page.getByRole('button', { name: 'Send message' }).click();

    await expect(page.getByText('AI is temporarily unavailable')).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Matching products' }),
    ).toBeVisible();
    await expect(page.getByText(headphones[0].name).first()).toBeVisible();
  });
});
