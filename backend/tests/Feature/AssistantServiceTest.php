<?php

declare(strict_types=1);

use App\Data\Assistant\AssistantQuery;
use App\Enums\AiFailureReason;
use App\Enums\AiFeature;
use App\Enums\AiUsageStatus;
use App\Enums\AssistantReplyStatus;
use App\Models\AiUsageLog;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Models\ProductSpec;
use App\Models\SpecDefinition;
use App\Models\User;
use App\Services\AssistantService;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

/**
 * @return array{category: Category, brand: Brand}
 */
function assistantCatalog(): array
{
    return [
        'category' => Category::factory()->create(['name' => 'Laptops', 'slug' => 'laptops']),
        'brand' => Brand::factory()->create(['name' => 'Aurora']),
    ];
}

test('a valid reply recommends only products that were sent and inside the budget', function (): void {
    config()->set('ai.groq.model', 'test-model');

    ['category' => $category, 'brand' => $brand] = assistantCatalog();
    $user = User::factory()->create();

    $editing = Product::factory()->for($category)->for($brand)->withValueScore(90)->create([
        'name' => 'Aurora 14 Editing Laptop',
        'price' => '82000.00',
        'summary' => 'Colour-accurate display and 32GB of memory.',
        'rating_avg' => '4.60',
        'rating_count' => 42,
    ]);

    $everyday = Product::factory()->for($category)->for($brand)->withValueScore(80)->create([
        'name' => 'Aurora Air Everyday Laptop',
        'price' => '61000.00',
        'rating_avg' => '4.30',
        'rating_count' => 18,
    ]);

    $overBudget = Product::factory()->for($category)->for($brand)->create([
        'name' => 'Aurora Studio Over Budget Laptop',
        'price' => '95000.00',
    ]);

    Product::factory()->for($category)->for($brand)->unpublished()->create([
        'name' => 'Aurora Hidden Prototype',
        'price' => '70000.00',
    ]);

    Product::factory()->create([
        'name' => 'ChillMax Refrigerator',
        'price' => '45000.00',
    ]);

    $ram = SpecDefinition::factory()->for($category)->numeric('GB')->create([
        'key' => 'ram_gb',
        'label' => 'RAM',
        'sort_order' => 1,
    ]);

    ProductSpec::factory()->for($editing)->create([
        'spec_definition_id' => $ram->id,
        'value_text' => null,
        'value_number' => 32,
        'value_bool' => null,
    ]);

    $fake = fakeGroqClient()->willReturn([
        'message' => 'The Aurora 14 is the best fit for video editing.',
        'recommendations' => [
            [
                'product_id' => $editing->id,
                'reason' => '32GB of memory and a colour-accurate display.',
                'tradeoffs' => ['Fans get loud', 'Heavy', 'Short battery', str_repeat('x', 200), 'Fifth point'],
            ],
            ['product_id' => $overBudget->id, 'reason' => 'Ignored the budget.'],
            ['product_id' => 999999, 'reason' => 'A product that does not exist.'],
        ],
    ]);

    $answer = app(AssistantService::class)->answer(
        new AssistantQuery('laptop for video editing', 'laptops', '90000.00'),
        $user,
    );

    expect($answer->status)->toBe(AssistantReplyStatus::Ok)
        ->and($answer->content)->toBe('The Aurora 14 is the best fit for video editing.')
        ->and($answer->recommendations)->toHaveCount(1)
        ->and($answer->recommendations[0]->product->is($editing))->toBeTrue()
        ->and($answer->recommendations[0]->reason)->toBe('32GB of memory and a colour-accurate display.')
        ->and($answer->recommendations[0]->tradeoffs)->toHaveCount(4)
        ->and($answer->recommendations[0]->tradeoffs[0])->toBe('Fans get loud')
        ->and($answer->recommendations[0]->tradeoffs[3])->toEndWith('...')
        ->and(mb_strlen($answer->recommendations[0]->tradeoffs[3]))->toBe(123)
        ->and($answer->alternatives)->toBe([]);

    $prompt = $fake->lastUserPrompt();

    expect($prompt)
        ->toContain('laptop for video editing')
        ->toContain('Aurora 14 Editing Laptop')
        ->toContain('Aurora Air Everyday Laptop')
        ->toContain('"RAM":"32 GB"')
        ->not->toContain('Aurora Studio Over Budget Laptop')
        ->not->toContain('Aurora Hidden Prototype')
        ->not->toContain('ChillMax Refrigerator');

    $log = AiUsageLog::query()->sole();

    expect($log->feature)->toBe(AiFeature::Assistant)
        ->and($log->status)->toBe(AiUsageStatus::Ok)
        ->and($log->user_id)->toBe($user->id)
        ->and($log->model)->toBe('test-model')
        ->and($log->error_code)->toBeNull();
});

test('a reply with no usable product id falls back to the matching catalog products', function (): void {
    ['category' => $category, 'brand' => $brand] = assistantCatalog();

    $first = Product::factory()->for($category)->for($brand)->withValueScore(90)->create([
        'name' => 'Aurora 14 Editing Laptop',
        'price' => '82000.00',
    ]);
    $second = Product::factory()->for($category)->for($brand)->withValueScore(80)->create([
        'name' => 'Aurora Air Everyday Laptop',
        'price' => '61000.00',
    ]);

    $fake = fakeGroqClient()->willReturn([
        'message' => 'Here is a product that does not exist.',
        'recommendations' => [
            ['product_id' => 999999, 'reason' => 'Invented product.'],
        ],
    ]);

    $answer = app(AssistantService::class)->answer(
        new AssistantQuery('laptop for video editing', 'laptops', '90000.00'),
    );

    expect($answer->status)->toBe(AssistantReplyStatus::Fallback)
        ->and($answer->content)->toBe('AI is unavailable right now. Here are the best matches from the catalog.')
        ->and($answer->recommendations)->toHaveCount(2)
        ->and($answer->recommendations[0]->product->is($first))->toBeTrue()
        ->and($answer->recommendations[1]->product->is($second))->toBeTrue()
        ->and($answer->recommendations[0]->reason)->toBeNull()
        ->and($fake->calls())->toHaveCount(1);

    $log = AiUsageLog::query()->sole();

    expect($log->status)->toBe(AiUsageStatus::Error)
        ->and($log->error_code)->toBe(AiFailureReason::InvalidJson->value);
});

test('a provider failure returns catalog products and logs the failure', function (): void {
    ['category' => $category, 'brand' => $brand] = assistantCatalog();

    $product = Product::factory()->for($category)->for($brand)->create([
        'name' => 'Aurora 14 Editing Laptop',
        'price' => '82000.00',
    ]);

    $fake = fakeGroqClient()->willFail(AiFailureReason::Connection);

    $answer = app(AssistantService::class)->answer(
        new AssistantQuery('laptop for video editing', 'laptops', '90000.00'),
    );

    expect($answer->status)->toBe(AssistantReplyStatus::Fallback)
        ->and($answer->recommendations)->toHaveCount(1)
        ->and($answer->recommendations[0]->product->is($product))->toBeTrue()
        ->and($fake->calls())->toHaveCount(1);

    $log = AiUsageLog::query()->sole();

    expect($log->feature)->toBe(AiFeature::Assistant)
        ->and($log->status)->toBe(AiUsageStatus::Error)
        ->and($log->error_code)->toBe(AiFailureReason::Connection->value);
});

test('a reply with the wrong shape falls back instead of throwing', function (): void {
    ['category' => $category, 'brand' => $brand] = assistantCatalog();

    Product::factory()->for($category)->for($brand)->create([
        'name' => 'Aurora 14 Editing Laptop',
        'price' => '82000.00',
    ]);

    fakeGroqClient()->willReturn([
        'message' => 'The products key is missing.',
    ]);

    $answer = app(AssistantService::class)->answer(
        new AssistantQuery('laptop for video editing', 'laptops', '90000.00'),
    );

    expect($answer->status)->toBe(AssistantReplyStatus::Fallback);

    $log = AiUsageLog::query()->sole();

    expect($log->status)->toBe(AiUsageStatus::Error)
        ->and($log->error_code)->toBe(AiFailureReason::InvalidJson->value);
});

test('an off-topic reply may return no recommendations without falling back', function (): void {
    ['category' => $category, 'brand' => $brand] = assistantCatalog();

    Product::factory()->for($category)->for($brand)->create([
        'name' => 'Aurora 14 Editing Laptop',
        'price' => '82000.00',
    ]);

    fakeGroqClient()->willReturn([
        'message' => 'I can only help with shopping decisions.',
        'recommendations' => [],
    ]);

    $answer = app(AssistantService::class)->answer(
        new AssistantQuery('what is the weather today?', 'laptops'),
    );

    expect($answer->status)->toBe(AssistantReplyStatus::Ok)
        ->and($answer->content)->toBe('I can only help with shopping decisions.')
        ->and($answer->recommendations)->toBe([]);

    expect(AiUsageLog::query()->sole()->status)->toBe(AiUsageStatus::Ok);
});

test('products over budget are never sent to the AI and become labelled alternatives', function (): void {
    ['category' => $category, 'brand' => $brand] = assistantCatalog();

    $ceiling = Product::factory()->for($category)->for($brand)->create([
        'name' => 'Aurora 14 Editing Laptop',
        'price' => '100000.00',
    ]);
    Product::factory()->for($category)->for($brand)->create([
        'name' => 'Aurora Studio Way Over Budget',
        'price' => '120000.00',
    ]);

    $fake = fakeGroqClient();

    $answer = app(AssistantService::class)->answer(
        new AssistantQuery('laptop for video editing', 'laptops', '90000.00'),
    );

    expect($answer->status)->toBe(AssistantReplyStatus::Ok)
        ->and($answer->content)->toContain('15% over budget')
        ->and($answer->recommendations)->toBe([])
        ->and($answer->alternatives)->toHaveCount(1)
        ->and($answer->alternatives[0]->product->is($ceiling))->toBeTrue()
        ->and($answer->alternatives[0]->reason)->toBeNull()
        ->and($fake->calls())->toBe([]);

    expect(AiUsageLog::query()->count())->toBe(0);
});

test('nothing inside the alternative window returns a helpful message without calling the AI', function (): void {
    ['category' => $category, 'brand' => $brand] = assistantCatalog();

    Product::factory()->for($category)->for($brand)->create([
        'name' => 'Aurora Studio Way Over Budget',
        'price' => '200000.00',
    ]);

    $fake = fakeGroqClient();

    $answer = app(AssistantService::class)->answer(
        new AssistantQuery('laptop for video editing', 'laptops', '90000.00'),
    );

    expect($answer->status)->toBe(AssistantReplyStatus::Ok)
        ->and($answer->content)->toContain('No products match')
        ->and($answer->recommendations)->toBe([])
        ->and($answer->alternatives)->toBe([])
        ->and($fake->calls())->toBe([]);
});

test('without a category the message keyword search narrows the candidates', function (): void {
    $laptops = Category::factory()->create(['name' => 'Laptops', 'slug' => 'laptops']);
    $appliances = Category::factory()->create(['name' => 'Appliances', 'slug' => 'appliances']);
    $brand = Brand::factory()->create();

    $laptop = Product::factory()->for($laptops)->for($brand)->create([
        'name' => 'Aurora Editing Laptop',
        'price' => '82000.00',
    ]);
    Product::factory()->for($appliances)->for($brand)->create([
        'name' => 'ChillMax Editing Fridge',
        'summary' => 'A cold box for the kitchen.',
        'description' => 'Stores food at low temperatures.',
        'price' => '45000.00',
    ]);

    $fake = fakeGroqClient()->willReturn([
        'message' => 'The Aurora is the best editing laptop here.',
        'recommendations' => [
            ['product_id' => $laptop->id, 'reason' => 'Made for editing.'],
        ],
    ]);

    $answer = app(AssistantService::class)->answer(
        new AssistantQuery('editing laptop', null, '90000.00'),
    );

    expect($answer->status)->toBe(AssistantReplyStatus::Ok)
        ->and($answer->recommendations)->toHaveCount(1)
        ->and($answer->recommendations[0]->product->is($laptop))->toBeTrue();

    expect($fake->lastUserPrompt())
        ->toContain('Aurora Editing Laptop')
        ->not->toContain('ChillMax Editing Fridge');
});

test('alternatives are capped at the three cheapest products inside the 15% window', function (): void {
    ['category' => $category, 'brand' => $brand] = assistantCatalog();

    foreach (['96000.00', '92000.00', '98000.00', '91000.00'] as $index => $price) {
        Product::factory()->for($category)->for($brand)->create([
            'name' => 'Aurora Alternative '.$index,
            'price' => $price,
        ]);
    }

    $answer = app(AssistantService::class)->answer(
        new AssistantQuery('laptop for video editing', 'laptops', '90000.00'),
    );

    expect($answer->alternatives)->toHaveCount(3)
        ->and($answer->alternatives[0]->product->price)->toBe('91000.00')
        ->and($answer->alternatives[1]->product->price)->toBe('92000.00')
        ->and($answer->alternatives[2]->product->price)->toBe('96000.00');
});
