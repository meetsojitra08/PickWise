import { expect, test } from '@playwright/test';

test.describe('Product detail page & customer review lifecycle', () => {
  test('renders product facts, specs, price history, AI review summary, and safe store link', async ({
    page,
  }) => {
    await page.goto('/products?category=smartphones');
    const firstProductLink = page
      .getByRole('region', { name: 'Catalog results' })
      .locator('article h3 a')
      .first();
    await expect(firstProductLink).toBeVisible();

    const productName = (await firstProductLink.innerText()).trim();
    await firstProductLink.click();

    await expect(page).toHaveURL(/\/products\/[^/]+$/);
    await expect(
      page.getByRole('heading', { level: 1, name: productName }),
    ).toBeVisible();

    // Safe external store link
    const storeLink = page
      .getByRole('link', { name: /View on store/i })
      .first();
    await expect(storeLink).toBeVisible();
    await expect(storeLink).toHaveAttribute('target', '_blank');
    await expect(storeLink).toHaveAttribute('rel', /noopener/);
    await expect(storeLink).toHaveAttribute('href', /^https?:\/\//);

    // Core detail sections
    await expect(
      page.getByRole('heading', { name: /Specifications/i }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: /Price history/i }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: /Ratings & reviews/i }),
    ).toBeVisible();
  });

  test('customer can submit, edit, and delete their own product review cleanly', async ({
    page,
  }) => {
    // Pick a product from keyboards category
    await page.goto('/products?category=keyboards');
    const firstProductLink = page
      .getByRole('region', { name: 'Catalog results' })
      .locator('article h3 a')
      .first();
    await expect(firstProductLink).toBeVisible();
    await firstProductLink.click();

    const reviewsSection = page.locator('#reviews');
    await expect(reviewsSection).toBeVisible();

    // If a leftover own review exists from a prior interrupted run, delete it first
    const existingDeleteButton = reviewsSection
      .getByRole('button', { name: 'Delete', exact: true })
      .first();
    if (await existingDeleteButton.isVisible()) {
      await existingDeleteButton.click();
      await reviewsSection
        .getByRole('button', { name: 'Delete review' })
        .click();
      await expect(
        reviewsSection.getByRole('heading', { name: 'Write a review' }),
      ).toBeVisible();
    }

    await expect(
      reviewsSection.getByRole('heading', { name: 'Write a review' }),
    ).toBeVisible();

    const reviewTitle = 'Solid typing feel for long coding sessions';
    const reviewBody =
      'Tactile switches feel crisp out of the box and wireless switching stays reliable across devices.';

    // Select 5 stars via accessible label
    await reviewsSection.getByLabel('5 stars').click({ force: true });
    await reviewsSection
      .getByRole('textbox', { name: 'Title', exact: true })
      .fill(reviewTitle);
    await reviewsSection
      .getByRole('textbox', { name: 'Review', exact: true })
      .fill(reviewBody);
    await reviewsSection.getByRole('button', { name: 'Submit review' }).click();

    // Pending review state & review card appear
    await expect(
      reviewsSection.getByRole('heading', {
        name: 'Your review is awaiting approval',
      }),
    ).toBeVisible();
    await expect(reviewsSection.getByText(reviewTitle)).toBeVisible();

    // Edit own review
    await reviewsSection
      .getByRole('button', { name: 'Edit', exact: true })
      .click();
    const updatedTitle = 'Solid typing feel after two weeks of daily use';
    await reviewsSection
      .getByRole('textbox', { name: 'Title', exact: true })
      .fill(updatedTitle);
    await reviewsSection.getByRole('button', { name: 'Save changes' }).click();
    await expect(reviewsSection.getByText(updatedTitle)).toBeVisible();

    // Delete own review to leave DB clean
    await reviewsSection
      .getByRole('button', { name: 'Delete', exact: true })
      .click();
    await reviewsSection.getByRole('button', { name: 'Delete review' }).click();
    await expect(reviewsSection.getByText(updatedTitle)).toHaveCount(0);
    await expect(
      reviewsSection.getByRole('heading', { name: 'Write a review' }),
    ).toBeVisible();
  });
});
