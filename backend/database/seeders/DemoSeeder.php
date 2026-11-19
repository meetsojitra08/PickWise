<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Enums\AiFeature;
use App\Enums\AiUsageStatus;
use App\Enums\AssistantReplyStatus;
use App\Enums\MessageRole;
use App\Enums\ReviewSentiment;
use App\Enums\UserRole;
use App\Models\AdminActivityLog;
use App\Models\AiConversation;
use App\Models\AiMessage;
use App\Models\AiUsageLog;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Comparison;
use App\Models\ComparisonItem;
use App\Models\Product;
use App\Models\ReviewSummary;
use App\Models\SpecDefinition;
use App\Models\User;
use App\Models\WishlistItem;
use Carbon\CarbonImmutable;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

/**
 * Deterministic, idempotent demo seeder:
 * - Demo accounts: admin@pickwise.test and customer@pickwise.test (password: password), plus test@example.com
 * - Demo customer activity: wishlist items, saved comparisons with share tokens and AI verdicts, and AI assistant threads
 * - Product AI review summaries: grounded pros, cons, and sentiment for catalog products
 * - Admin telemetry & audit trail: realistic 30-day AI usage metrics and immutable admin activity logs
 */
class DemoSeeder extends Seeder
{
    use WithoutModelEvents;

    public function run(): void
    {
        $anchorDate = CarbonImmutable::instance(now()->startOfDay());

        DB::transaction(function () use ($anchorDate): void {
            $admin = $this->seedAdminUser();
            $customer = $this->seedCustomerUser();
            $testUser = $this->seedLegacyTestUser();

            $this->seedReviewSummaries($anchorDate);
            $this->seedWishlist($customer);
            $this->seedComparisons($customer, $anchorDate);
            $this->seedAiConversations($customer, $anchorDate);
            $this->seedAiUsageLogs($customer, $testUser, $anchorDate);
            $this->seedAdminActivityLogs($admin, $anchorDate);
        });
    }

    private function seedAdminUser(): User
    {
        $admin = User::query()->firstOrNew(['email' => 'admin@pickwise.test']);
        $admin->fill([
            'name' => 'Demo Admin',
            'password' => Hash::make('password'),
        ]);
        $admin->role = UserRole::Admin;
        $admin->is_active = true;
        $admin->email_verified_at ??= now();
        $admin->save();

        return $admin;
    }

    private function seedCustomerUser(): User
    {
        $customer = User::query()->firstOrNew(['email' => 'customer@pickwise.test']);
        $customer->fill([
            'name' => 'Demo Customer',
            'password' => Hash::make('password'),
            'preferences' => [
                'budget_default' => 150000,
                'favourite_categories' => ['laptops', 'smartphones', 'headphones'],
                'priorities' => ['battery_life', 'performance', 'value_for_money'],
            ],
        ]);
        $customer->role = UserRole::Customer;
        $customer->is_active = true;
        $customer->email_verified_at ??= now();
        $customer->save();

        return $customer;
    }

    private function seedLegacyTestUser(): User
    {
        $user = User::query()->firstOrNew(['email' => 'test@example.com']);
        $user->fill([
            'name' => 'Test User',
            'password' => Hash::make('password'),
        ]);
        $user->role = UserRole::Customer;
        $user->is_active = true;
        $user->email_verified_at ??= now();
        $user->save();

        return $user;
    }

    private function seedReviewSummaries(CarbonImmutable $anchorDate): void
    {
        Product::query()->with('category')->orderBy('id')->each(function (Product $product) use ($anchorDate): void {
            $categorySlug = $product->category->slug;
            $sentiment = ($product->id % 4 === 0) ? ReviewSentiment::Mixed : ReviewSentiment::Positive;

            [$pros, $cons] = $this->prosAndConsForCategory($categorySlug, $product->name);

            ReviewSummary::query()->updateOrCreate(
                ['product_id' => $product->id],
                [
                    'summary' => "Customers consistently highlight the {$product->name}'s reliable day-to-day performance, premium build quality, and ergonomic design, with only minor tradeoffs noted for specific niche use cases.",
                    'pros' => $pros,
                    'cons' => $cons,
                    'sentiment' => $sentiment,
                    'reviews_count' => max((int) $product->rating_count, 6),
                    'generated_at' => $anchorDate->subHours(3),
                ],
            );
        });
    }

    /**
     * @return array{0: list<string>, 1: list<string>}
     */
    private function prosAndConsForCategory(string $categorySlug, string $productName): array
    {
        return match ($categorySlug) {
            'laptops' => [
                [
                    'Bright, highly color-accurate display with comfortable viewing angles',
                    'Smooth and responsive typing experience suitable for extended work sessions',
                    'Efficient thermal performance with silent or near-inaudible cooling',
                ],
                [
                    'Limited selection of legacy USB-A ports',
                    'Internal memory and storage expansion options are constrained',
                ],
            ],
            'smartphones' => [
                [
                    'Vibrant high-refresh AMOLED display with stellar outdoor daylight visibility',
                    'Dependable all-day battery life with fast wired charging support',
                    'Fluid animation smoothness and rapid app launching speed',
                ],
                [
                    'Noticeable thermal warmth during sustained 4K video recording or intensive gaming',
                    'Protective case recommended due to the slick rear glass surface',
                ],
            ],
            'headphones' => [
                [
                    'Class-leading active noise cancellation across low and mid ambient frequencies',
                    'Plush earcups and lightweight headband clamp for fatigue-free listening',
                    'Well-balanced sound signature with crisp highs and authoritative bass',
                ],
                [
                    'Carrying case is somewhat bulky when packing into compact daypacks',
                    'Microphone clarity softens slightly in blustery outdoor wind',
                ],
            ],
            'monitors' => [
                [
                    'High pixel density delivering razor-sharp text and broad color gamut coverage',
                    'Fully adjustable ergonomic stand supporting height, tilt, and vertical pivot',
                    'Clean cable management channels and convenient USB hub connectivity',
                ],
                [
                    'Integrated speakers provide modest fidelity best suited for alert chimes',
                    'HDR peak brightness is conservative in brightly lit sunlit rooms',
                ],
            ],
            'keyboards' => [
                [
                    'Crisp, highly satisfying mechanical switch actuation and tactile feedback',
                    'Sturdy chassis construction with virtually zero keyboard deck flex',
                    'Reliable multi-device Bluetooth pairing and low-latency 2.4GHz wireless',
                ],
                [
                    'Keycaps may exhibit subtle surface wear under intensive multi-year typing',
                    'Companion configuration software requires a brief learning curve',
                ],
            ],
            'smartwatches' => [
                [
                    'Accurate continuous heart-rate tracking, sleep stages, and SpO2 monitoring',
                    'Ultra-bright OLED panel that remains effortlessly readable in direct sun',
                    'Comprehensive automatic workout detection and dual-frequency GPS route mapping',
                ],
                [
                    'Requires daily or alternate-day recharging when using the always-on display',
                    'Third-party application ecosystem is more curated than desktop platforms',
                ],
            ],
            default => [
                [
                    "Dependable daily performance and thoughtful engineering in the {$productName}",
                    'Intuitive setup with clean out-of-the-box defaults',
                ],
                [
                    'Slightly higher price point than entry-level market alternatives',
                ],
            ],
        };
    }

    private function seedWishlist(User $customer): void
    {
        $wishlistSlugs = [
            'apple-macbook-air-13-m3',
            'sony-wh-1000xm5',
            'dell-ultrasharp-u2723qe',
            'samsung-galaxy-s24',
        ];

        $products = Product::query()->whereIn('slug', $wishlistSlugs)->get();

        foreach ($products as $product) {
            WishlistItem::query()->firstOrCreate([
                'user_id' => $customer->id,
                'product_id' => $product->id,
            ]);
        }
    }

    private function seedComparisons(User $customer, CarbonImmutable $anchorDate): void
    {
        // 1. Flagship Ultrabooks Comparison
        $macbook = Product::query()->where('slug', 'apple-macbook-air-13-m3')->first();
        $samsungBook = Product::query()->where('slug', 'samsung-galaxy-book4-pro')->first();
        $macbookPro = Product::query()->where('slug', 'apple-macbook-pro-14-m4')->first();

        if ($macbook && $samsungBook && $macbookPro) {
            $comparison1 = Comparison::query()->firstOrNew([
                'user_id' => $customer->id,
                'name' => 'Flagship Ultrabooks 2026',
            ]);

            $comparison1->fill([
                'share_token' => 'b8f9e1a2c3d4e5f60718293a4b5c6d7e',
                'ai_verdict' => [
                    'verdict' => 'The Apple MacBook Air 13" M3 leads in battery endurance and silent fanless operation, while the Samsung Galaxy Book4 Pro and MacBook Pro 14" M4 provide superior multi-display support and sustained compute.',
                    'products' => [
                        [
                            'product_id' => $macbook->id,
                            'name' => $macbook->name,
                            'strengths' => [
                                'Up to 18 hours of real-world battery life',
                                'Completely silent fanless aluminum chassis',
                                'Exceptional trackpad and Liquid Retina display',
                            ],
                            'weaknesses' => [
                                'Base unified memory is not upgradeable post-purchase',
                                'Natively drives only one external display when the lid is open',
                            ],
                        ],
                        [
                            'product_id' => $samsungBook->id,
                            'name' => $samsungBook->name,
                            'strengths' => [
                                'Stunning 120Hz 3K Dynamic AMOLED 2X touchscreen',
                                'Ultra-thin profile weighing only 1.23 kg',
                                'Extensive port selection including full-size HDMI 2.1',
                            ],
                            'weaknesses' => [
                                'Slightly shorter battery runtime under heavy multi-tasking',
                                'Cooling fans become audible during sustained export workloads',
                            ],
                        ],
                        [
                            'product_id' => $macbookPro->id,
                            'name' => $macbookPro->name,
                            'strengths' => [
                                'ProMotion 120Hz Liquid Retina XDR display with 1,600 nits peak HDR',
                                'Industry-leading sustained performance with active thermal architecture',
                                'Full SDXC card slot and HDMI port built into the chassis',
                            ],
                            'weaknesses' => [
                                'Noticeably heavier and thicker than the MacBook Air',
                                'Priced at a significant premium for casual workflows',
                            ],
                        ],
                    ],
                    'generated_at' => $anchorDate->subDays(2)->toIso8601ZuluString(),
                ],
            ]);
            $comparison1->save();

            $comparisonProducts = [$macbook, $samsungBook, $macbookPro];
            foreach ($comparisonProducts as $pos => $p) {
                ComparisonItem::query()->firstOrCreate(
                    [
                        'comparison_id' => $comparison1->id,
                        'product_id' => $p->id,
                    ],
                    ['position' => $pos],
                );
            }
        }

        // 2. Premium ANC Headphones Comparison
        $sony = Product::query()->where('slug', 'sony-wh-1000xm5')->first();
        $bose = Product::query()->where('slug', 'bose-quietcomfort-ultra')->first();

        if ($sony && $bose) {
            $comparison2 = Comparison::query()->firstOrNew([
                'user_id' => $customer->id,
                'name' => 'Premium ANC Headphones',
            ]);

            $comparison2->fill([
                'share_token' => 'c1d2e3f4a5b6789012345678abcdef01',
                'ai_verdict' => [
                    'verdict' => 'The Sony WH-1000XM5 excels at battery endurance and fine-grained EQ personalization, while the Bose QuietComfort Ultra provides class-leading passive isolation and a more travel-friendly folding design.',
                    'products' => [
                        [
                            'product_id' => $sony->id,
                            'name' => $sony->name,
                            'strengths' => [
                                '30-hour battery life with active noise cancellation enabled',
                                'Support for LDAC high-resolution wireless streaming',
                                'Superb 8-microphone voice isolation for video conferences',
                            ],
                            'weaknesses' => [
                                'Earcups swivel flat but do not fold inward, requiring a larger case',
                                'Ear cushions can trap warmth in warmer climates',
                            ],
                        ],
                        [
                            'product_id' => $bose->id,
                            'name' => $bose->name,
                            'strengths' => [
                                'Benchmark active noise reduction against airplane engine rumble',
                                'Folds compactly into an ultra-slim zippered travel case',
                                'Gentle, balanced clamping force ideal for sensitive eyeglass wearers',
                            ],
                            'weaknesses' => [
                                '24-hour battery endurance is slightly shorter than Sony',
                                'Immersive Audio spatial mode accelerates battery discharge',
                            ],
                        ],
                    ],
                    'generated_at' => $anchorDate->subDays(4)->toIso8601ZuluString(),
                ],
            ]);
            $comparison2->save();

            $headphoneProducts = [$sony, $bose];
            foreach ($headphoneProducts as $pos => $p) {
                ComparisonItem::query()->firstOrCreate(
                    [
                        'comparison_id' => $comparison2->id,
                        'product_id' => $p->id,
                    ],
                    ['position' => $pos],
                );
            }
        }
    }

    private function seedAiConversations(User $customer, CarbonImmutable $anchorDate): void
    {
        $macbook = Product::query()->where('slug', 'apple-macbook-air-13-m3')->first();
        $samsungBook = Product::query()->where('slug', 'samsung-galaxy-book4-pro')->first();

        if ($macbook && $samsungBook) {
            $conv1 = AiConversation::query()->firstOrNew([
                'user_id' => $customer->id,
                'title' => 'Best laptop for software development under ₹1,50,000',
            ]);
            $conv1->last_message_at = Carbon::instance($anchorDate->subDays(1)->setHour(14)->setMinute(30));
            $conv1->save();

            if ($conv1->messages()->doesntExist()) {
                AiMessage::query()->create([
                    'conversation_id' => $conv1->id,
                    'role' => MessageRole::User,
                    'content' => 'I need a fast, reliable laptop for software engineering and web development. My budget is ₹1,50,000. Battery life, quiet fans, and a crisp display are my top priorities.',
                    'payload' => null,
                    'status' => AssistantReplyStatus::Ok,
                    'created_at' => $anchorDate->subDays(1)->setHour(14)->setMinute(28),
                ]);

                AiMessage::query()->create([
                    'conversation_id' => $conv1->id,
                    'role' => MessageRole::Assistant,
                    'content' => 'Based on your requirements for software development, all-day battery efficiency, and an exceptional display under ₹1,50,000, here are our two highest-rated catalog recommendations:',
                    'payload' => [
                        'recommendations' => [
                            [
                                'product_id' => $macbook->id,
                                'reason' => 'Outstanding 18-hour battery endurance, zero fan noise with completely silent passive cooling, and a razor-sharp 500-nit Liquid Retina display.',
                                'tradeoffs' => [
                                    'Base memory is non-upgradeable; choose 16GB or 24GB unified memory if running heavy Docker or VM environments.',
                                    'Supports only a single external display when the laptop lid is open.',
                                ],
                            ],
                            [
                                'product_id' => $samsungBook->id,
                                'reason' => 'High-performance Intel Core Ultra processor with generous RAM for multi-container development, paired with a gorgeous 120Hz 3K AMOLED panel.',
                                'tradeoffs' => [
                                    'Fans will spin audibly under sustained compiler tasks.',
                                ],
                            ],
                        ],
                        'alternatives' => [],
                    ],
                    'status' => AssistantReplyStatus::Ok,
                    'created_at' => $anchorDate->subDays(1)->setHour(14)->setMinute(30),
                ]);
            }
        }

        $sony = Product::query()->where('slug', 'sony-wh-1000xm5')->first();
        $bose = Product::query()->where('slug', 'bose-quietcomfort-ultra')->first();

        if ($sony && $bose) {
            $conv2 = AiConversation::query()->firstOrNew([
                'user_id' => $customer->id,
                'title' => 'Comfortable noise-cancelling headphones for long travel',
            ]);
            $conv2->last_message_at = Carbon::instance($anchorDate->subDays(3)->setHour(11)->setMinute(15));
            $conv2->save();

            if ($conv2->messages()->doesntExist()) {
                AiMessage::query()->create([
                    'conversation_id' => $conv2->id,
                    'role' => MessageRole::User,
                    'content' => 'Looking for over-ear headphones that cancel cabin noise effectively on long flights and stay comfortable for 6+ hours.',
                    'payload' => null,
                    'status' => AssistantReplyStatus::Ok,
                    'created_at' => $anchorDate->subDays(3)->setHour(11)->setMinute(12),
                ]);

                AiMessage::query()->create([
                    'conversation_id' => $conv2->id,
                    'role' => MessageRole::Assistant,
                    'content' => 'For long-haul flights and extended listening comfort, headband clamping force and low-frequency noise isolation are paramount. Here are two benchmark options from our catalog:',
                    'payload' => [
                        'recommendations' => [
                            [
                                'product_id' => $bose->id,
                                'reason' => 'Plush synthetic protein leather cushions and minimal clamping pressure engineered specifically for fatigue-free comfort on long-haul flights.',
                                'tradeoffs' => [
                                    '24-hour battery life is slightly behind Sony\'s 30-hour benchmark.',
                                ],
                            ],
                            [
                                'product_id' => $sony->id,
                                'reason' => 'Exceptional 30-hour battery life with ANC on, accompanied by rapid 3-minute quick charging that gives 3 hours of playback.',
                                'tradeoffs' => [
                                    'Carrying case is larger because the earcups rotate flat rather than folding into the headband.',
                                ],
                            ],
                        ],
                        'alternatives' => [],
                    ],
                    'status' => AssistantReplyStatus::Ok,
                    'created_at' => $anchorDate->subDays(3)->setHour(11)->setMinute(15),
                ]);
            }
        }
    }

    private function seedAiUsageLogs(User $customer, User $testUser, CarbonImmutable $anchorDate): void
    {
        if (AiUsageLog::query()->where('user_id', $customer->id)->exists()) {
            return;
        }

        $models = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'];
        $users = [$customer->id, $testUser->id, null]; // null simulates guest traffic

        // Seed 30 days of daily AI telemetry
        for ($daysAgo = 29; $daysAgo >= 0; $daysAgo--) {
            $date = $anchorDate->subDays($daysAgo);
            $callsToday = ($daysAgo % 7 === 0 || $daysAgo % 7 === 6) ? 3 : 5; // higher on weekdays

            for ($i = 0; $i < $callsToday; $i++) {
                $feature = match (($daysAgo + $i) % 3) {
                    0 => AiFeature::Assistant,
                    1 => AiFeature::Compare,
                    default => AiFeature::ReviewSummary,
                };

                $isRateLimited = ($daysAgo === 5 && $i === 0);
                $isError = ($daysAgo === 12 && $i === 1);

                $status = $isRateLimited
                    ? AiUsageStatus::RateLimited
                    : ($isError ? AiUsageStatus::Error : AiUsageStatus::Ok);

                $errorCode = $isRateLimited ? 'rate_limit_exceeded' : ($isError ? 'ai_unavailable' : null);
                $userId = $users[($daysAgo + $i) % count($users)];

                AiUsageLog::query()->create([
                    'user_id' => $userId,
                    'feature' => $feature,
                    'model' => $models[$i % count($models)],
                    'prompt_tokens' => $isRateLimited ? 0 : 850 + ($i * 120),
                    'completion_tokens' => $isRateLimited ? 0 : ($isError ? 0 : 280 + ($i * 45)),
                    'latency_ms' => $isRateLimited ? 12 : ($isError ? 520 : 380 + ($i * 90)),
                    'status' => $status,
                    'error_code' => $errorCode,
                    'created_at' => $date->setHour(9 + ($i * 2))->setMinute(15 + ($i * 8)),
                ]);
            }
        }
    }

    private function seedAdminActivityLogs(User $admin, CarbonImmutable $anchorDate): void
    {
        if (AdminActivityLog::query()->where('admin_id', $admin->id)->exists()) {
            return;
        }

        $macbook = Product::query()->where('slug', 'apple-macbook-air-13-m3')->first();
        $laptopsCat = Category::query()->where('slug', 'laptops')->first();
        $brandApple = Brand::query()->where('slug', 'apple')->first();
        $specDef = SpecDefinition::query()->first();

        $logs = [
            [
                'action' => 'product.updated',
                'subject_type' => Product::class,
                'subject_id' => $macbook?->id,
                'changes' => [
                    'price' => ['before' => 114900, 'after' => 109900],
                    'availability' => ['before' => 'low_stock', 'after' => 'in_stock'],
                ],
                'created_at' => $anchorDate->subDays(1)->setHour(10)->setMinute(15),
            ],
            [
                'action' => 'category.updated',
                'subject_type' => Category::class,
                'subject_id' => $laptopsCat?->id,
                'changes' => [
                    'is_active' => ['before' => false, 'after' => true],
                ],
                'created_at' => $anchorDate->subDays(3)->setHour(14)->setMinute(40),
            ],
            [
                'action' => 'brand.updated',
                'subject_type' => Brand::class,
                'subject_id' => $brandApple?->id,
                'changes' => [
                    'website_url' => ['before' => 'https://apple.com', 'after' => 'https://www.apple.com/in/'],
                ],
                'created_at' => $anchorDate->subDays(5)->setHour(11)->setMinute(20),
            ],
            [
                'action' => 'review.moderated',
                'subject_type' => Product::class,
                'subject_id' => $macbook?->id,
                'changes' => [
                    'status' => ['before' => 'pending', 'after' => 'approved'],
                ],
                'created_at' => $anchorDate->subDays(7)->setHour(16)->setMinute(5),
            ],
            [
                'action' => 'spec_definition.updated',
                'subject_type' => SpecDefinition::class,
                'subject_id' => $specDef?->id,
                'changes' => [
                    'is_filterable' => ['before' => false, 'after' => true],
                ],
                'created_at' => $anchorDate->subDays(9)->setHour(9)->setMinute(30),
            ],
            [
                'action' => 'user.updated',
                'subject_type' => User::class,
                'subject_id' => $admin->id,
                'changes' => [
                    'is_active' => ['before' => false, 'after' => true],
                ],
                'created_at' => $anchorDate->subDays(12)->setHour(15)->setMinute(0),
            ],
        ];

        foreach ($logs as $log) {
            AdminActivityLog::query()->create([
                'admin_id' => $admin->id,
                'action' => $log['action'],
                'subject_type' => $log['subject_type'],
                'subject_id' => $log['subject_id'],
                'changes' => $log['changes'],
                'ip_address' => '127.0.0.1',
                'created_at' => $log['created_at'],
            ]);
        }
    }
}
