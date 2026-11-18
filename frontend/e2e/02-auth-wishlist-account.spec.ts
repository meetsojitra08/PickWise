import { expect, test } from '@playwright/test';

test.describe('Guest auth guards & registration validation', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('redirects guests from protected routes and validates register form', async ({
    page,
  }) => {
    await page.goto('/account');
    await expect(page).toHaveURL(/\/login/);
    await expect(
      page.getByRole('heading', { name: 'Log in to Pickwise' }),
    ).toBeVisible();

    await page.goto('/admin');
    await expect(page).toHaveURL(/\/login/);

    await page.getByRole('link', { name: 'Create an account' }).click();
    await expect(page).toHaveURL(/\/register/);
    await expect(
      page.getByRole('heading', { name: 'Create your account' }),
    ).toBeVisible();

    // Submit empty registration form to verify client-side Zod field errors
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page.getByLabel('Name')).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    await expect(page.getByLabel('Email')).toHaveAttribute(
      'aria-invalid',
      'true',
    );
  });

  test('customer can log in and log out via Sanctum session cookies', async ({
    page,
  }) => {
    const email = process.env.E2E_CUSTOMER_EMAIL ?? 'test@example.com';
    const password = process.env.E2E_CUSTOMER_PASSWORD ?? 'password';

    await page.goto('/login');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Log in' }).click();

    await expect(page).toHaveURL('/');
    const accountMenu = page.getByRole('button', { name: /Account menu for/i });
    await expect(accountMenu).toBeVisible();
    // Wait for initial post-login home page queries to settle so an in-flight
    // stateful GET cannot overwrite the rotated session cookie after logout.
    await page.waitForLoadState('networkidle');

    await accountMenu.click();
    await page.getByRole('menuitem', { name: 'Log out' }).click();

    await expect(
      page.getByRole('banner').getByRole('link', { name: 'Log in' }),
    ).toBeVisible();

    await page.goto('/account');
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe('Authenticated customer wishlist & preferences', () => {
  test('saves shopping preferences and persists them across reload', async ({
    page,
  }) => {
    await page.goto('/account?tab=preferences');
    await expect(
      page.getByRole('heading', { name: 'Shopping preferences' }),
    ).toBeVisible();

    const budgetInput = page.getByLabel(/Default budget/i);
    await budgetInput.fill('85000');

    await page.getByRole('button', { name: 'Save preferences' }).click();
    await expect(page.getByText('Preferences saved.')).toBeVisible();

    await page.reload();
    await expect(page.getByLabel(/Default budget/i)).toHaveValue('85000');

    // Clean up preferences back to blank baseline
    await page.getByRole('button', { name: 'Clear preferences' }).click();
    await expect(page.getByText('Preferences cleared.')).toBeVisible();
  });

  test('adds a product to wishlist from catalog and removes it from account wishlist tab', async ({
    page,
  }) => {
    await page.goto('/products?category=laptops');
    const results = page.getByRole('region', { name: 'Catalog results' });
    const firstCard = results.locator('article').first();
    await expect(firstCard).toBeVisible();

    const productName = (await firstCard.locator('h3 a').innerText()).trim();

    const addButton = firstCard.getByRole('button', {
      name: new RegExp(`(Add|Remove).*wishlist`, 'i'),
    });

    // Wait for initial wishlist fetch to finish before inspecting aria-pressed
    await expect(addButton).toBeEnabled();

    // Ensure clean starting state if already wishlisted
    if ((await addButton.getAttribute('aria-pressed')) === 'true') {
      await addButton.click();
      await expect(addButton).toHaveAttribute('aria-pressed', 'false');
    }

    await addButton.click();
    await expect(addButton).toHaveAttribute('aria-pressed', 'true');

    // Verify in Account -> Wishlist tab
    await page.goto('/account?tab=wishlist');
    await expect(
      page.getByRole('heading', { name: 'Saved products' }),
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: productName }).first(),
    ).toBeVisible();

    // Remove from wishlist tab to leave account clean
    await page
      .getByRole('button', {
        name: `Remove ${productName} from wishlist`,
      })
      .click();
    await expect(page.getByRole('link', { name: productName })).toHaveCount(0);
  });
});
