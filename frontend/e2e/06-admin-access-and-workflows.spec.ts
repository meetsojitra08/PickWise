import { expect, test } from '@playwright/test';

test.describe('Admin RBAC enforcement (live backend)', () => {
  test('blocks non-admin customer from /admin UI and /api/v1/admin/dashboard API', async ({
    baseURL,
    page,
    request,
  }) => {
    const referer = `${baseURL ?? 'http://localhost:8080'}/`;

    // Direct API check against live Laravel policy & role middleware
    // Include Referer so Sanctum recognises the stateful SPA session cookie
    const apiResponse = await request.get('/api/v1/admin/dashboard', {
      headers: {
        Accept: 'application/json',
        Referer: referer,
      },
    });
    expect(apiResponse.status()).toBe(403);

    // UI route guard redirects non-admin customers away from /admin
    await page.goto('/admin');
    await expect(page).not.toHaveURL(/\/admin/);
  });
});

test.describe('Admin console workflows (overview, catalog, moderation & audit log)', () => {
  test('navigates admin overview, products table, approves a pending review, and views audit log', async ({
    page,
  }) => {
    let reviewApproved = false;
    const nowIso = new Date().toISOString();

    await page.route('**/api/v1/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            id: 99,
            name: 'Admin Lead',
            email: 'admin@pickwise.test',
            role: 'admin',
            is_active: true,
            preferences: null,
            created_at: nowIso,
          },
        }),
      });
    });

    await page.route('**/api/v1/admin/dashboard', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            counts: {
              products: { total: 60, published: 58, unpublished: 2 },
              users: { total: 14, active: 13, customers: 12, admins: 2 },
              pending_reviews: reviewApproved ? 0 : 1,
              ai_calls_today: 18,
            },
            ai_usage_today: {
              total_calls: 18,
              successful_calls: 17,
              failed_calls: 1,
              total_tokens: 14200,
              avg_latency_ms: 820,
            },
            recent_activity: [
              {
                id: 501,
                admin: {
                  id: 99,
                  name: 'Admin Lead',
                  email: 'admin@pickwise.test',
                },
                action: 'product.updated',
                subject_type: 'Product',
                subject_id: 12,
                changes: { price: { before: '79999.00', after: '74999.00' } },
                ip_address: '127.0.0.1',
                created_at: nowIso,
              },
            ],
            pending_reviews: reviewApproved
              ? []
              : [
                  {
                    id: 701,
                    product: {
                      id: 12,
                      name: 'ThinkPad X1 Carbon Gen 12',
                      slug: 'thinkpad-x1-carbon-gen-12',
                    },
                    author_name: 'Asha Verma',
                    rating: 5,
                    title: 'Featherweight workhorse',
                    body: 'Keyboard feel and battery endurance are outstanding for travel.',
                    created_at: nowIso,
                  },
                ],
          },
        }),
      });
    });

    await page.route('**/api/v1/admin/categories**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            {
              id: 2,
              parent_id: null,
              parent: null,
              name: 'Laptops',
              slug: 'laptops',
              description: 'Ultrabooks and creator laptops',
              image_path: null,
              image_url: null,
              sort_order: 1,
              is_active: true,
              products_count: 10,
              spec_definitions_count: 6,
              children_count: 0,
              created_at: nowIso,
              updated_at: nowIso,
            },
          ],
          meta: { current_page: 1, last_page: 1, per_page: 100, total: 1 },
        }),
      });
    });

    await page.route('**/api/v1/admin/brands**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [{ id: 5, name: 'Lenovo', slug: 'lenovo', logo_url: null }],
          meta: { current_page: 1, last_page: 1, per_page: 100, total: 1 },
        }),
      });
    });

    await page.route('**/api/v1/admin/products**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            {
              id: 12,
              category_id: 2,
              brand_id: 5,
              name: 'ThinkPad X1 Carbon Gen 12',
              slug: 'thinkpad-x1-carbon-gen-12',
              summary: 'Ultralight business flagship.',
              description: 'Carbon chassis with crisp OLED display.',
              price: {
                amount: '149999.00',
                currency: 'INR',
                formatted: '₹1,49,999',
              },
              currency: 'INR',
              availability: 'in_stock',
              availability_label: 'In Stock',
              store_url: 'https://store.example.com/thinkpad-x1',
              rating_avg: 4.8,
              rating_count: 14,
              value_score: 88,
              is_published: true,
              is_deleted: false,
              category: { id: 2, name: 'Laptops', slug: 'laptops' },
              brand: { id: 5, name: 'Lenovo', slug: 'lenovo' },
              primary_image: null,
            },
          ],
          meta: { current_page: 1, last_page: 1, per_page: 25, total: 1 },
        }),
      });
    });

    await page.route('**/api/v1/admin/reviews**', async (route) => {
      if (
        route.request().method() === 'PATCH' &&
        route.request().url().includes('/api/v1/admin/reviews/701')
      ) {
        reviewApproved = true;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              id: 701,
              status: 'approved',
            },
          }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: reviewApproved
            ? []
            : [
                {
                  id: 701,
                  product: {
                    id: 12,
                    name: 'ThinkPad X1 Carbon Gen 12',
                    slug: 'thinkpad-x1-carbon-gen-12',
                  },
                  user: {
                    id: 4,
                    name: 'Asha Verma',
                    email: 'asha@example.com',
                  },
                  author_name: 'Asha Verma',
                  rating: 5,
                  title: 'Featherweight workhorse',
                  body: 'Keyboard feel and battery endurance are outstanding for travel.',
                  status: 'pending',
                  moderator: null,
                  moderated_at: null,
                  created_at: nowIso,
                  updated_at: nowIso,
                },
              ],
          meta: {
            current_page: 1,
            last_page: 1,
            per_page: 20,
            total: reviewApproved ? 0 : 1,
          },
        }),
      });
    });

    await page.route('**/api/v1/admin/users**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            {
              id: 99,
              name: 'Admin Lead',
              email: 'admin@pickwise.test',
              role: 'admin',
              is_active: true,
              reviews_count: 0,
              created_at: nowIso,
            },
          ],
          meta: { current_page: 1, last_page: 1, per_page: 50, total: 1 },
        }),
      });
    });

    await page.route('**/api/v1/admin/activity-logs**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            {
              id: 502,
              admin: {
                id: 99,
                name: 'Admin Lead',
                email: 'admin@pickwise.test',
              },
              action: 'review.moderated',
              subject_type: 'Review',
              subject_id: 701,
              changes: { status: { before: 'pending', after: 'approved' } },
              ip_address: '127.0.0.1',
              created_at: nowIso,
            },
          ],
          meta: { current_page: 1, last_page: 1, per_page: 20, total: 1 },
        }),
      });
    });

    // 1. Admin dashboard overview
    await page.goto('/admin');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Admin overview' }),
    ).toBeVisible();
    await expect(page.getByText('ThinkPad X1 Carbon Gen 12')).toBeVisible();

    // 2. Navigate to Admin Products
    await page
      .getByRole('navigation', { name: 'Admin navigation' })
      .getByRole('link', { name: 'Products' })
      .click();
    await expect(page).toHaveURL('/admin/products');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Product catalog' }),
    ).toBeVisible();
    await expect(page.getByText('ThinkPad X1 Carbon Gen 12')).toBeVisible();

    // 3. Navigate to Admin Reviews and approve the pending review
    await page
      .getByRole('navigation', { name: 'Admin navigation' })
      .getByRole('link', { name: 'Reviews' })
      .click();
    await expect(page).toHaveURL('/admin/reviews');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Review Moderation' }),
    ).toBeVisible();
    await expect(page.getByText('Featherweight workhorse')).toBeVisible();

    await page.getByRole('button', { name: 'Approve', exact: true }).click();
    await expect(
      page.getByText('No reviews waiting for approval'),
    ).toBeVisible();

    // 4. Navigate to Admin Audit Log viewer
    await page
      .getByRole('navigation', { name: 'Admin navigation' })
      .getByRole('link', { name: 'Audit Log' })
      .click();
    await expect(page).toHaveURL('/admin/activity-logs');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Audit Log Viewer' }),
    ).toBeVisible();
    await expect(page.getByTestId('log-row-502')).toContainText(
      'review.moderated',
    );
  });
});
