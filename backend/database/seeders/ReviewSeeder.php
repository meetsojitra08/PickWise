<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Enums\ReviewStatus;
use App\Models\Product;
use App\Models\Review;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Seed deterministic, approved showcase reviews and sync product rating aggregates.
 */
class ReviewSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed six customer reviews for each catalog product.
     */
    public function run(): void
    {
        DB::transaction(function (): void {
            Product::query()->orderBy('id')->each(function (Product $product): void {
                foreach ($this->reviewsFor($product) as $reviewData) {
                    $review = Review::query()->updateOrCreate(
                        [
                            'product_id' => $product->id,
                            'author_name' => $reviewData['author_name'],
                        ],
                        [
                            'user_id' => null,
                            'rating' => $reviewData['rating'],
                            'title' => $reviewData['title'],
                            'body' => $reviewData['body'],
                        ],
                    );

                    $review->status = ReviewStatus::Approved;
                    $review->save();
                }

                $approvedReviews = $product->reviews()->approved();
                $product->rating_avg = round((float) $approvedReviews->avg('rating'), 2);
                $product->rating_count = $approvedReviews->count();
                $product->save();
            });
        });
    }

    /**
     * @return list<array{author_name: string, rating: int, title: string, body: string}>
     */
    private function reviewsFor(Product $product): array
    {
        $templates = [
            ['Maya Shah', 5, 'A great fit for my routine', 'The '.$product->name.' has been dependable in daily use. Setup was straightforward, and the overall experience feels better than I expected.'],
            ['Arjun Mehta', 5, 'Easy to recommend', 'I have used the '.$product->name.' for a few weeks now. It feels thoughtfully made, performs consistently, and offers good value for what it does.'],
            ['Nisha Rao', 4, 'Very good with one small tradeoff', 'The '.$product->name.' handles the things I use it for well. I noticed a small compromise, but it has not taken away from my overall satisfaction.'],
            ['Kabir Joshi', 4, 'Reliable day to day', 'The '.$product->name.' has been reliable so far and is easy to fit into my routine. A couple of details could be better, though nothing has been a dealbreaker.'],
            ['Isha Kapoor', 3, 'Good, but not quite for everyone', 'The '.$product->name.' gets the basics right and has been useful. I expected a little more refinement, so I would compare a few options before buying.'],
            ['Dev Malhotra', 2, 'Some strengths, but a few letdowns', 'The '.$product->name.' has useful features, but my experience has been uneven. It may suit someone with different priorities better than it suits me.'],
        ];

        return array_map(
            static fn (array $template): array => [
                'author_name' => $template[0],
                'rating' => $template[1],
                'title' => $template[2],
                'body' => $template[3],
            ],
            $templates,
        );
    }
}
