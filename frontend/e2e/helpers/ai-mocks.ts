import type { Page } from '@playwright/test';
import type { E2eProductSummary } from './catalog.ts';

interface StubAssistantOptions {
  products: E2eProductSummary[];
  replyContent?: string;
  status?: 'ok' | 'fallback';
}

/**
 * Intercepts ONLY the AI assistant conversation endpoints so Playwright E2E
 * tests never call the real Groq API (see docs/ai-workflow-rules.md §7),
 * while returning real database products fetched from the live catalog API.
 */
export async function stubAssistantConversation(
  page: Page,
  options: StubAssistantOptions,
): Promise<void> {
  const {
    products,
    status = 'ok',
    replyContent = 'Here are the top catalog matches within your budget, grounded in verified specs.',
  } = options;

  const conversationId = 9001;
  const createdAt = new Date().toISOString();

  const messages: Array<Record<string, unknown>> = [];

  await page.route('**/api/v1/assistant/quota', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          used: 1,
          limit: 30,
          remaining: 29,
          resets_at: new Date(Date.now() + 86_400_000).toISOString(),
        },
      }),
    });
  });

  await page.route('**/api/v1/assistant/conversations', async (route) => {
    if (route.request().method() === 'POST') {
      const body = (route.request().postDataJSON() ?? {}) as {
        title?: string;
      };

      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            id: conversationId,
            title: body.title ?? 'Shopping session',
            messages_count: 0,
            created_at: createdAt,
            updated_at: createdAt,
            messages: [],
          },
        }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data:
          messages.length > 0
            ? [
                {
                  id: conversationId,
                  title: 'Laptop for video editing',
                  messages_count: messages.length,
                  created_at: createdAt,
                  updated_at: new Date().toISOString(),
                },
              ]
            : [],
        meta: {
          current_page: 1,
          last_page: 1,
          per_page: 20,
          total: messages.length > 0 ? 1 : 0,
        },
      }),
    });
  });

  await page.route(
    `**/api/v1/assistant/conversations/${conversationId}`,
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            id: conversationId,
            title: 'Laptop for video editing',
            messages_count: messages.length,
            created_at: createdAt,
            updated_at: new Date().toISOString(),
            messages,
          },
        }),
      });
    },
  );

  await page.route(
    `**/api/v1/assistant/conversations/${conversationId}/messages`,
    async (route) => {
      const payload = (route.request().postDataJSON() ?? {}) as {
        message?: string;
      };

      const userMessage = {
        id: 1001 + messages.length,
        role: 'user',
        content: payload.message ?? 'Recommend products',
        recommendations: [],
        alternatives: [],
        status: 'ok',
        created_at: new Date().toISOString(),
      };

      const assistantReply = {
        id: 1002 + messages.length,
        role: 'assistant',
        content:
          status === 'fallback'
            ? 'AI is unavailable. Here are the best matches from the catalog.'
            : replyContent,
        recommendations: products.map((product, index) => ({
          product_id: product.id,
          reason:
            index === 0
              ? `Strongest balance of specs and value score under budget for ${product.name}.`
              : `Reliable runner-up with solid benchmark scores and everyday versatility.`,
          tradeoffs:
            index === 0
              ? ['Slightly heavier chassis under sustained load']
              : ['Higher price per spec point than the top pick'],
          product,
        })),
        alternatives: [],
        status,
        created_at: new Date().toISOString(),
      };

      messages.push(userMessage, assistantReply);

      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ data: assistantReply }),
      });
    },
  );
}

/**
 * Intercepts ONLY POST /api/v1/compare/verdict so compare verdict tests never
 * call the real Groq API while keeping POST /api/v1/compare matrix generation
 * and saved comparisons running against the live Laravel backend.
 */
export async function stubCompareVerdict(
  page: Page,
  products: E2eProductSummary[],
): Promise<void> {
  await page.route('**/api/v1/compare/verdict', async (route) => {
    const first = products[0];
    const headline = first
      ? `${first.name} delivers the strongest overall balance of specs and price.`
      : 'Both products offer competitive value for everyday use.';

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          verdict: headline,
          products: products.map((product, index) => ({
            product_id: product.id,
            name: product.name,
            strengths: [
              index === 0
                ? 'Leads the comparison on overall value score and spec balance.'
                : 'Competitive pricing with dependable day-to-day performance.',
            ],
            weaknesses: [
              index === 0
                ? 'Costs more upfront than entry-tier alternatives.'
                : 'Trails the top pick on a few benchmarked specifications.',
            ],
          })),
          quota: {
            used: 2,
            limit: 30,
            remaining: 28,
            resets_at: new Date(Date.now() + 86_400_000).toISOString(),
          },
        },
      }),
    });
  });
}
