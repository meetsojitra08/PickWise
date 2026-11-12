<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Customer;

use App\Actions\Reviews\DeleteReview;
use App\Actions\Reviews\UpdateReview;
use App\Http\Controllers\Controller;
use App\Http\Requests\Reviews\UpdateReviewRequest;
use App\Http\Resources\ReviewResource;
use App\Http\Responses\ApiResponse;
use App\Models\Review;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpFoundation\Response;

class ReviewController extends Controller
{
    public function update(UpdateReviewRequest $request, Review $review, UpdateReview $updateReview): JsonResponse
    {
        $updated = $updateReview->execute($review, $request->validated());

        return (new ReviewResource($updated->load('user:id,name')))
            ->response()
            ->setStatusCode(Response::HTTP_OK);
    }

    public function destroy(Review $review, DeleteReview $deleteReview): \Illuminate\Http\Response
    {
        $this->authorize('delete', $review);
        $deleteReview->execute($review);

        return ApiResponse::noContent();
    }
}
