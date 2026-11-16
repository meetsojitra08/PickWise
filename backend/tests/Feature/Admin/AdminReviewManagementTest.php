<?php

declare(strict_types=1);

namespace Tests\Feature\Admin;

use App\Enums\ReviewStatus;
use App\Enums\UserRole;
use App\Jobs\GenerateReviewSummary;
use App\Models\AdminActivityLog;
use App\Models\Category;
use App\Models\Product;
use App\Models\Review;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

final class AdminReviewManagementTest extends TestCase
{
    use RefreshDatabase;

    private function createAdmin(bool $isActive = true): User
    {
        /** @var User $admin */
        $admin = User::factory()->create([
            'role' => UserRole::Admin,
            'is_active' => $isActive,
        ]);

        return $admin;
    }

    private function createCustomer(): User
    {
        /** @var User $customer */
        $customer = User::factory()->create([
            'role' => UserRole::Customer,
            'is_active' => true,
        ]);

        return $customer;
    }

    public function test_it_rejects_unauthenticated_requests(): void
    {
        $product = Product::factory()->create();
        $review = Review::factory()->create(['product_id' => $product->id]);

        $this->getJson('/api/v1/admin/reviews')
            ->assertUnauthorized();

        $this->patchJson("/api/v1/admin/reviews/{$review->id}", ['status' => 'approved'])
            ->assertUnauthorized();

        $this->deleteJson("/api/v1/admin/reviews/{$review->id}")
            ->assertUnauthorized();

        $this->postJson("/api/v1/admin/products/{$product->id}/regenerate-summary")
            ->assertUnauthorized();
    }

    public function test_it_rejects_non_admin_customers(): void
    {
        $customer = $this->createCustomer();
        $product = Product::factory()->create();
        $review = Review::factory()->create(['product_id' => $product->id]);

        $this->actingAs($customer)
            ->getJson('/api/v1/admin/reviews')
            ->assertForbidden();

        $this->actingAs($customer)
            ->patchJson("/api/v1/admin/reviews/{$review->id}", ['status' => 'approved'])
            ->assertForbidden();

        $this->actingAs($customer)
            ->deleteJson("/api/v1/admin/reviews/{$review->id}")
            ->assertForbidden();

        $this->actingAs($customer)
            ->postJson("/api/v1/admin/products/{$product->id}/regenerate-summary")
            ->assertForbidden();
    }

    public function test_it_rejects_deactivated_admins(): void
    {
        $deactivatedAdmin = $this->createAdmin(isActive: false);

        $this->actingAs($deactivatedAdmin)
            ->getJson('/api/v1/admin/reviews')
            ->assertForbidden();
    }

    public function test_it_lists_reviews_with_pending_status_by_default(): void
    {
        $admin = $this->createAdmin();
        $product = Product::factory()->create();
        $customer = $this->createCustomer();

        $pendingReview = Review::factory()->create([
            'product_id' => $product->id,
            'user_id' => $customer->id,
            'status' => ReviewStatus::Pending,
            'title' => 'Pending review title',
        ]);

        $approvedReview = Review::factory()->create([
            'product_id' => $product->id,
            'user_id' => null,
            'author_name' => 'Seeded user',
            'status' => ReviewStatus::Approved,
            'title' => 'Approved review title',
        ]);

        $response = $this->actingAs($admin)
            ->getJson('/api/v1/admin/reviews')
            ->assertOk();

        $data = $response->json('data');
        $this->assertCount(1, $data);
        $this->assertSame($pendingReview->id, $data[0]['id']);
        $this->assertSame('Pending review title', $data[0]['title']);
        $this->assertSame(ReviewStatus::Pending->value, $data[0]['status']);
    }

    public function test_it_filters_reviews_by_status_and_all(): void
    {
        $admin = $this->createAdmin();
        $product = Product::factory()->create();

        Review::factory()->create([
            'product_id' => $product->id,
            'status' => ReviewStatus::Pending,
        ]);
        Review::factory()->create([
            'product_id' => $product->id,
            'status' => ReviewStatus::Approved,
        ]);
        Review::factory()->create([
            'product_id' => $product->id,
            'status' => ReviewStatus::Rejected,
        ]);

        $this->actingAs($admin)
            ->getJson('/api/v1/admin/reviews?status=approved')
            ->assertOk()
            ->assertJsonCount(1, 'data');

        $this->actingAs($admin)
            ->getJson('/api/v1/admin/reviews?status=rejected')
            ->assertOk()
            ->assertJsonCount(1, 'data');

        $this->actingAs($admin)
            ->getJson('/api/v1/admin/reviews?status=all')
            ->assertOk()
            ->assertJsonCount(3, 'data');
    }

    public function test_it_filters_reviews_by_keyword_search_and_rating(): void
    {
        $admin = $this->createAdmin();
        $productA = Product::factory()->create(['name' => 'Super Phone Alpha']);
        $productB = Product::factory()->create(['name' => 'Budget Tablet']);

        $customer = User::factory()->create(['name' => 'Alice Walker', 'email' => 'alice@example.com']);

        Review::factory()->create([
            'product_id' => $productA->id,
            'user_id' => $customer->id,
            'rating' => 5,
            'title' => 'Incredible battery life',
            'body' => 'I love how long it lasts.',
            'status' => ReviewStatus::Pending,
        ]);

        Review::factory()->create([
            'product_id' => $productB->id,
            'user_id' => null,
            'author_name' => 'Bob Builder',
            'rating' => 2,
            'title' => 'Poor screen contrast',
            'body' => 'The screen is too dim.',
            'status' => ReviewStatus::Pending,
        ]);

        // Search by review title keyword
        $this->actingAs($admin)
            ->getJson('/api/v1/admin/reviews?search=battery')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.title', 'Incredible battery life');

        // Search by product name
        $this->actingAs($admin)
            ->getJson('/api/v1/admin/reviews?search=Tablet')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.author_name', 'Bob Builder');

        // Search by author email
        $this->actingAs($admin)
            ->getJson('/api/v1/admin/reviews?search=alice@example.com')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.title', 'Incredible battery life');

        // Filter by rating
        $this->actingAs($admin)
            ->getJson('/api/v1/admin/reviews?rating=2')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.rating', 2);
    }

    public function test_it_approves_a_pending_review_updates_ratings_and_queues_summary(): void
    {
        Queue::fake();

        $admin = $this->createAdmin();
        $category = Category::factory()->create();
        $product = Product::factory()->create([
            'category_id' => $category->id,
            'rating_avg' => 0.0,
            'rating_count' => 0,
        ]);

        $review = Review::factory()->create([
            'product_id' => $product->id,
            'rating' => 5,
            'status' => ReviewStatus::Pending,
        ]);

        $response = $this->actingAs($admin)
            ->patchJson("/api/v1/admin/reviews/{$review->id}", [
                'status' => 'approved',
            ])
            ->assertOk();

        $response->assertJsonPath('data.status', 'approved')
            ->assertJsonPath('data.moderated_by', $admin->id)
            ->assertJsonPath('data.moderator.id', $admin->id);

        $review->refresh();
        $this->assertSame(ReviewStatus::Approved, $review->status);
        $this->assertSame($admin->id, $review->moderated_by);
        $this->assertNotNull($review->moderated_at);

        $product->refresh();
        $this->assertEquals(5.0, (float) $product->rating_avg);
        $this->assertSame(1, $product->rating_count);

        Queue::assertPushed(GenerateReviewSummary::class, static function (GenerateReviewSummary $job) use ($product): bool {
            return $job->productId === $product->id;
        });

        $this->assertDatabaseHas('admin_activity_logs', [
            'admin_id' => $admin->id,
            'action' => 'review.moderated',
            'subject_type' => $review->getMorphClass(),
            'subject_id' => $review->id,
        ]);
    }

    public function test_it_rejects_an_approved_review_with_reason_and_updates_ratings(): void
    {
        Queue::fake();

        $admin = $this->createAdmin();
        $category = Category::factory()->create();
        $product = Product::factory()->create([
            'category_id' => $category->id,
            'rating_avg' => 5.0,
            'rating_count' => 1,
        ]);

        $review = Review::factory()->create([
            'product_id' => $product->id,
            'rating' => 5,
            'status' => ReviewStatus::Approved,
        ]);

        $response = $this->actingAs($admin)
            ->patchJson("/api/v1/admin/reviews/{$review->id}", [
                'status' => 'rejected',
                'reason' => 'Review contains promotional external links.',
            ])
            ->assertOk();

        $response->assertJsonPath('data.status', 'rejected')
            ->assertJsonPath('data.moderated_by', $admin->id);

        $review->refresh();
        $this->assertSame(ReviewStatus::Rejected, $review->status);

        $product->refresh();
        $this->assertEquals(0.0, (float) $product->rating_avg);
        $this->assertSame(0, $product->rating_count);

        Queue::assertPushed(GenerateReviewSummary::class);

        /** @var AdminActivityLog $log */
        $log = AdminActivityLog::query()
            ->where('action', 'review.moderated')
            ->where('subject_id', $review->id)
            ->firstOrFail();

        $this->assertSame('Review contains promotional external links.', $log->changes['reason'] ?? null);
    }

    public function test_it_supports_bulk_moderation_of_reviews(): void
    {
        Queue::fake();

        $admin = $this->createAdmin();
        $product = Product::factory()->create([
            'rating_avg' => 0.0,
            'rating_count' => 0,
        ]);

        $review1 = Review::factory()->create([
            'product_id' => $product->id,
            'rating' => 4,
            'status' => ReviewStatus::Pending,
        ]);
        $review2 = Review::factory()->create([
            'product_id' => $product->id,
            'rating' => 2,
            'status' => ReviewStatus::Pending,
        ]);

        $this->actingAs($admin)
            ->patchJson('/api/v1/admin/reviews/bulk-status', [
                'review_ids' => [$review1->id, $review2->id],
                'status' => 'approved',
            ])
            ->assertOk()
            ->assertJsonPath('data.count', 2)
            ->assertJsonPath('data.status', 'approved');

        $review1->refresh();
        $review2->refresh();
        $this->assertSame(ReviewStatus::Approved, $review1->status);
        $this->assertSame(ReviewStatus::Approved, $review2->status);

        $product->refresh();
        $this->assertEquals(3.0, (float) $product->rating_avg);
        $this->assertSame(2, $product->rating_count);

        Queue::assertPushed(GenerateReviewSummary::class);

        $this->assertDatabaseHas('admin_activity_logs', [
            'admin_id' => $admin->id,
            'action' => 'review.bulk_moderated',
        ]);
    }

    public function test_it_deletes_an_approved_review_and_updates_product_ratings(): void
    {
        Queue::fake();

        $admin = $this->createAdmin();
        $product = Product::factory()->create([
            'rating_avg' => 4.0,
            'rating_count' => 1,
        ]);

        $review = Review::factory()->create([
            'product_id' => $product->id,
            'rating' => 4,
            'status' => ReviewStatus::Approved,
        ]);

        $this->actingAs($admin)
            ->deleteJson("/api/v1/admin/reviews/{$review->id}")
            ->assertNoContent();

        $this->assertDatabaseMissing('reviews', ['id' => $review->id]);

        $product->refresh();
        $this->assertEquals(0.0, (float) $product->rating_avg);
        $this->assertSame(0, $product->rating_count);

        Queue::assertPushed(GenerateReviewSummary::class);

        $this->assertDatabaseHas('admin_activity_logs', [
            'admin_id' => $admin->id,
            'action' => 'review.deleted',
            'subject_id' => $review->id,
        ]);
    }

    public function test_it_deletes_a_pending_review_without_changing_ratings(): void
    {
        $admin = $this->createAdmin();
        $product = Product::factory()->create([
            'rating_avg' => 4.5,
            'rating_count' => 2,
        ]);

        $review = Review::factory()->create([
            'product_id' => $product->id,
            'rating' => 1,
            'status' => ReviewStatus::Pending,
        ]);

        $this->actingAs($admin)
            ->deleteJson("/api/v1/admin/reviews/{$review->id}")
            ->assertNoContent();

        $this->assertDatabaseMissing('reviews', ['id' => $review->id]);

        $product->refresh();
        $this->assertEquals(4.5, (float) $product->rating_avg);
        $this->assertSame(2, $product->rating_count);
    }

    public function test_it_queues_review_summary_regeneration_from_product_endpoint(): void
    {
        Queue::fake();

        $admin = $this->createAdmin();
        $product = Product::factory()->create();

        $this->actingAs($admin)
            ->postJson("/api/v1/admin/products/{$product->id}/regenerate-summary")
            ->assertOk()
            ->assertJsonPath('data.product_id', $product->id)
            ->assertJsonPath('data.queued', true);

        Queue::assertPushed(GenerateReviewSummary::class, static function (GenerateReviewSummary $job) use ($product): bool {
            return $job->productId === $product->id;
        });

        $this->assertDatabaseHas('admin_activity_logs', [
            'admin_id' => $admin->id,
            'action' => 'product.summary_regenerated',
            'subject_id' => $product->id,
        ]);
    }
}
