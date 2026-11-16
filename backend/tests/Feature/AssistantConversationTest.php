<?php

declare(strict_types=1);

use App\Enums\AiFailureReason;
use App\Enums\AssistantReplyStatus;
use App\Enums\MessageRole;
use App\Models\AiConversation;
use App\Models\AiMessage;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function (): void {
    config()->set('ai.groq.model', 'test-model');
});

test('a customer can start a conversation and see it in their conversation list', function (): void {
    $customer = User::factory()->create();

    $createResponse = $this->actingAs($customer)
        ->postJson('/api/v1/assistant/conversations', [
            'title' => 'Laptops for creative work',
        ])
        ->assertCreated()
        ->assertJsonPath('data.title', 'Laptops for creative work')
        ->assertJsonPath('data.messages', []);

    $conversationId = (int) $createResponse->json('data.id');

    $this->actingAs($customer)
        ->getJson('/api/v1/assistant/conversations')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.id', $conversationId)
        ->assertJsonPath('data.0.title', 'Laptops for creative work')
        ->assertJsonPath('data.0.messages_count', 0);
});

test('a customer only sees their own conversations in reverse chronological order', function (): void {
    $customer = User::factory()->create();
    $otherCustomer = User::factory()->create();

    $older = AiConversation::factory()->for($customer)->create([
        'title' => 'Older Conversation',
        'last_message_at' => now()->subHours(2),
    ]);

    $newer = AiConversation::factory()->for($customer)->create([
        'title' => 'Newer Conversation',
        'last_message_at' => now()->subHour(),
    ]);

    AiConversation::factory()->for($otherCustomer)->create([
        'title' => 'Other Customer Conversation',
    ]);

    AiConversation::factory()->guest('guest-session-123')->create([
        'title' => 'Guest Conversation',
    ]);

    $response = $this->actingAs($customer)
        ->getJson('/api/v1/assistant/conversations')
        ->assertOk()
        ->assertJsonCount(2, 'data');

    expect($response->json('data.0.id'))->toBe($newer->id)
        ->and($response->json('data.1.id'))->toBe($older->id);
});

test('a guest can create and list conversations with their session key', function (): void {
    $this->withHeader('X-Session-Key', 'guest-session-abc')
        ->postJson('/api/v1/assistant/conversations', [
            'title' => 'Guest Search',
        ])
        ->assertCreated()
        ->assertJsonPath('data.title', 'Guest Search');

    $this->withHeader('X-Session-Key', 'guest-session-abc')
        ->getJson('/api/v1/assistant/conversations')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.title', 'Guest Search');

    // A different guest cannot see it
    $this->withHeader('X-Session-Key', 'guest-session-xyz')
        ->getJson('/api/v1/assistant/conversations')
        ->assertOk()
        ->assertJsonCount(0, 'data');
});

test('viewing a conversation returns its messages with product details batch-loaded', function (): void {
    $customer = User::factory()->create();
    $conversation = AiConversation::factory()->for($customer)->create(['title' => 'Monitors']);

    $category = Category::factory()->create(['name' => 'Monitors', 'slug' => 'monitors']);
    $brand = Brand::factory()->create(['name' => 'ViewSonic']);
    $product = Product::factory()->for($category)->for($brand)->create([
        'name' => 'ProArt 27 4K Monitor',
        'price' => '39999.00',
    ]);

    AiMessage::factory()->for($conversation)->create([
        'role' => MessageRole::User,
        'content' => 'I need a 4k monitor for photography',
    ]);

    AiMessage::factory()->for($conversation)->assistant(
        payload: [
            'recommendations' => [
                [
                    'product_id' => $product->id,
                    'reason' => '100% sRGB accuracy and 4K resolution.',
                    'tradeoffs' => ['No USB-C charging'],
                ],
            ],
            'alternatives' => [],
        ],
    )->create([
        'content' => 'Here is a great colour-accurate monitor.',
        'status' => AssistantReplyStatus::Ok,
    ]);

    $response = $this->actingAs($customer)
        ->getJson("/api/v1/assistant/conversations/{$conversation->id}")
        ->assertOk()
        ->assertJsonPath('data.id', $conversation->id)
        ->assertJsonPath('data.title', 'Monitors')
        ->assertJsonCount(2, 'data.messages');

    $assistantMessage = $response->json('data.messages.1');
    expect($assistantMessage['role'])->toBe('assistant')
        ->and($assistantMessage['recommendations'])->toHaveCount(1)
        ->and($assistantMessage['recommendations'][0]['product_id'])->toBe($product->id)
        ->and($assistantMessage['recommendations'][0]['reason'])->toBe('100% sRGB accuracy and 4K resolution.')
        ->and($assistantMessage['recommendations'][0]['product']['name'])->toBe('ProArt 27 4K Monitor');
});

test('a user cannot view, message, or delete another users conversation', function (): void {
    $alice = User::factory()->create();
    $bob = User::factory()->create();

    $conversation = AiConversation::factory()->for($alice)->create();

    $this->actingAs($bob)
        ->getJson("/api/v1/assistant/conversations/{$conversation->id}")
        ->assertForbidden();

    $this->actingAs($bob)
        ->postJson("/api/v1/assistant/conversations/{$conversation->id}/messages", [
            'message' => 'Sneaking into another chat',
        ])
        ->assertForbidden();

    $this->actingAs($bob)
        ->deleteJson("/api/v1/assistant/conversations/{$conversation->id}")
        ->assertForbidden();
});

test('a customer sends a message, gets grounded recommendations, and spends one daily quota', function (): void {
    $customer = User::factory()->create();
    $conversation = AiConversation::factory()->for($customer)->create(['title' => null]);

    $category = Category::factory()->create(['name' => 'Laptops', 'slug' => 'laptops']);
    $brand = Brand::factory()->create(['name' => 'Aurora']);

    $laptop = Product::factory()->for($category)->for($brand)->withValueScore(88)->create([
        'name' => 'Aurora 14 Creator Laptop',
        'price' => '85000.00',
    ]);

    fakeGroqClient()->willReturn([
        'message' => 'The Aurora 14 is the top choice for video editing under ₹90,000.',
        'recommendations' => [
            [
                'product_id' => $laptop->id,
                'reason' => 'Fast processor and colour-accurate screen.',
                'tradeoffs' => ['Battery lasts ~6 hours'],
            ],
        ],
    ]);

    $response = $this->actingAs($customer)
        ->postJson("/api/v1/assistant/conversations/{$conversation->id}/messages", [
            'message' => 'Laptop for video editing under 90,000',
            'category' => 'laptops',
            'budget_max' => '90000.00',
        ])
        ->assertCreated()
        ->assertJsonPath('data.role', 'assistant')
        ->assertJsonPath('data.content', 'The Aurora 14 is the top choice for video editing under ₹90,000.')
        ->assertJsonPath('data.status', 'ok')
        ->assertJsonPath('data.recommendations.0.product_id', $laptop->id)
        ->assertJsonPath('data.recommendations.0.reason', 'Fast processor and colour-accurate screen.')
        ->assertJsonPath('data.recommendations.0.product.name', 'Aurora 14 Creator Laptop');

    // Messages saved in database
    expect($conversation->messages()->count())->toBe(2);

    $userMessage = $conversation->messages()->where('role', MessageRole::User)->sole();
    expect($userMessage->content)->toBe('Laptop for video editing under 90,000')
        ->and($userMessage->payload['constraints']['category'])->toBe('laptops')
        ->and($userMessage->payload['constraints']['budget_max'])->toBe('90000.00');

    // Title updated from user message
    $conversation->refresh();
    expect($conversation->title)->toBe('Laptop for video editing under 90,000')
        ->and($conversation->last_message_at)->not->toBeNull();

    // Daily quota consumed
    $this->actingAs($customer)
        ->getJson('/api/v1/assistant/quota')
        ->assertJsonPath('data.used', 1)
        ->assertJsonPath('data.remaining', 29);
});

test('when Groq is down, the assistant returns fallback products and does not spend quota', function (): void {
    $customer = User::factory()->create();
    $conversation = AiConversation::factory()->for($customer)->create();

    $category = Category::factory()->create(['name' => 'Laptops', 'slug' => 'laptops']);
    $brand = Brand::factory()->create(['name' => 'Aurora']);

    $laptop = Product::factory()->for($category)->for($brand)->withValueScore(85)->create([
        'name' => 'Aurora Catalog Fallback Laptop',
        'price' => '75000.00',
    ]);

    fakeGroqClient()->willFail(AiFailureReason::Connection);

    $response = $this->actingAs($customer)
        ->postJson("/api/v1/assistant/conversations/{$conversation->id}/messages", [
            'message' => 'Find me a laptop under 80000',
            'category' => 'laptops',
            'budget_max' => '80000.00',
        ])
        ->assertCreated()
        ->assertJsonPath('data.status', 'fallback')
        ->assertJsonPath('data.recommendations.0.product_id', $laptop->id)
        ->assertJsonPath('data.recommendations.0.reason', null);

    // Assistant message saved with status: fallback
    $assistantMessage = $conversation->messages()->where('role', MessageRole::Assistant)->sole();
    expect($assistantMessage->status)->toBe(AssistantReplyStatus::Fallback);

    // Quota was NOT spent
    $this->actingAs($customer)
        ->getJson('/api/v1/assistant/quota')
        ->assertJsonPath('data.used', 0)
        ->assertJsonPath('data.remaining', 30);
});

test('messages endpoint validates message length, category slug, and budget amount', function (): void {
    $customer = User::factory()->create();
    $conversation = AiConversation::factory()->for($customer)->create();

    // Message too short
    $this->actingAs($customer)
        ->postJson("/api/v1/assistant/conversations/{$conversation->id}/messages", [
            'message' => 'a',
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['message'], 'error.details');

    // Message too long (> 500 chars)
    $this->actingAs($customer)
        ->postJson("/api/v1/assistant/conversations/{$conversation->id}/messages", [
            'message' => str_repeat('m', 501),
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['message'], 'error.details');

    // Non-existent category
    $this->actingAs($customer)
        ->postJson("/api/v1/assistant/conversations/{$conversation->id}/messages", [
            'message' => 'Looking for laptops',
            'category' => 'non-existent-category',
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['category'], 'error.details');

    // Negative budget
    $this->actingAs($customer)
        ->postJson("/api/v1/assistant/conversations/{$conversation->id}/messages", [
            'message' => 'Looking for laptops',
            'budget_max' => '-100',
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['budget_max'], 'error.details');
});

test('messages endpoint returns 429 when daily quota is exhausted', function (): void {
    config()->set('ai.daily_quota.user', 1);

    $customer = User::factory()->create();
    $conversation = AiConversation::factory()->for($customer)->create();

    Category::factory()->create(['name' => 'Laptops', 'slug' => 'laptops']);

    fakeGroqClient()->willReturn([
        'message' => 'First reply.',
        'recommendations' => [],
    ]);

    // First message uses the 1 quota
    $this->actingAs($customer)
        ->postJson("/api/v1/assistant/conversations/{$conversation->id}/messages", [
            'message' => 'First question about laptops',
            'category' => 'laptops',
        ])
        ->assertCreated();

    // Second message blocked by daily quota
    $this->actingAs($customer)
        ->postJson("/api/v1/assistant/conversations/{$conversation->id}/messages", [
            'message' => 'Second question about laptops',
            'category' => 'laptops',
        ])
        ->assertStatus(429)
        ->assertJsonPath('error.code', 'ai_quota_exceeded');
});

test('messages endpoint is rate-limited at 10 requests per minute', function (): void {
    $customer = User::factory()->create();
    $conversation = AiConversation::factory()->for($customer)->create();

    fakeGroqClient()->willReturn([
        'message' => 'Quick reply.',
        'recommendations' => [],
    ]);

    for ($i = 0; $i < 10; $i++) {
        $this->actingAs($customer)
            ->postJson("/api/v1/assistant/conversations/{$conversation->id}/messages", [
                'message' => "Message number {$i}",
            ])
            ->assertCreated();
    }

    $this->actingAs($customer)
        ->postJson("/api/v1/assistant/conversations/{$conversation->id}/messages", [
            'message' => 'Eleventh message',
        ])
        ->assertStatus(429)
        ->assertJsonPath('error.code', 'rate_limited');
});

test('deleting a conversation removes it and cascades its messages', function (): void {
    $customer = User::factory()->create();
    $conversation = AiConversation::factory()->for($customer)->create();

    AiMessage::factory()->for($conversation)->count(3)->create();

    $this->actingAs($customer)
        ->deleteJson("/api/v1/assistant/conversations/{$conversation->id}")
        ->assertNoContent();

    expect(AiConversation::query()->find($conversation->id))->toBeNull()
        ->and(AiMessage::query()->where('conversation_id', $conversation->id)->count())->toBe(0);
});

test('saved user preferences are included in prompt when customer posts message', function (): void {
    $category = Category::factory()->create(['name' => 'Laptops', 'slug' => 'laptops']);
    $brand = Brand::factory()->create(['name' => 'Aurora']);
    $laptop = Product::factory()->for($category)->for($brand)->create([
        'name' => 'Aurora 14 Creator Laptop',
        'price' => '85000.00',
    ]);

    $customer = User::factory()->create([
        'name' => 'Jane Shopper',
        'email' => 'jane@example.com',
        'preferences' => [
            'budget_default' => 90000,
            'favourite_categories' => ['laptops'],
            'priorities' => ['display quality', 'portability'],
        ],
    ]);

    $conversation = AiConversation::factory()->for($customer)->create();

    $fake = fakeGroqClient()->willReturn([
        'message' => 'Here is a recommendation tailored to your preferences.',
        'recommendations' => [
            ['product_id' => $laptop->id, 'reason' => 'Great display.'],
        ],
    ]);

    $this->actingAs($customer)
        ->postJson("/api/v1/assistant/conversations/{$conversation->id}/messages", [
            'message' => 'Show me the best laptop for UI design',
            'category' => 'laptops',
        ])
        ->assertCreated();

    $prompt = $fake->lastUserPrompt();
    expect($prompt)
        ->toContain('Shopper saved preferences')
        ->toContain('- Default budget: 90000.00 INR')
        ->toContain('- Favourite categories: Laptops')
        ->toContain('- Priorities: display quality, portability')
        ->not->toContain('Jane Shopper')
        ->not->toContain('jane@example.com');
});
