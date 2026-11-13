<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Customer;

use App\Actions\Wishlist\AddWishlistItem;
use App\Actions\Wishlist\RemoveWishlistItem;
use App\Http\Controllers\Controller;
use App\Http\Requests\Wishlist\IndexWishlistRequest;
use App\Http\Requests\Wishlist\StoreWishlistItemRequest;
use App\Http\Resources\WishlistItemResource;
use App\Http\Responses\ApiResponse;
use App\Models\Product;
use App\Models\User;
use App\Models\WishlistItem;
use App\Queries\Wishlist\WishlistItemsQuery;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;

class WishlistController extends Controller
{
    public function __construct(
        private readonly WishlistItemsQuery $wishlist,
        private readonly AddWishlistItem $addWishlistItem,
        private readonly RemoveWishlistItem $removeWishlistItem,
    ) {}

    public function index(IndexWishlistRequest $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $items = $this->wishlist->forUser(
            $user,
            (int) $request->validated('page', 1),
            (int) $request->validated('per_page', 24),
        );

        return WishlistItemResource::collection($items)
            ->response()
            ->setStatusCode(SymfonyResponse::HTTP_OK);
    }

    public function store(StoreWishlistItemRequest $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $product = Product::query()->published()->findOrFail((int) $request->validated('product_id'));
        $item = $this->addWishlistItem->execute($user, $product);
        $status = $item->wasRecentlyCreated ? SymfonyResponse::HTTP_CREATED : SymfonyResponse::HTTP_OK;

        return (new WishlistItemResource(
            $item->load(['product.category', 'product.brand', 'product.primaryImage']),
        ))->response()->setStatusCode($status);
    }

    public function destroy(Request $request, int $productId): Response
    {
        $this->authorize('viewAny', WishlistItem::class);

        /** @var User $user */
        $user = $request->user();
        $item = $this->wishlist->findForUser($user, $productId);

        if ($item instanceof WishlistItem) {
            $this->authorize('delete', $item);
            $this->removeWishlistItem->execute($item);
        }

        return ApiResponse::noContent();
    }
}
