import { useCallback } from 'react';
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router';
import { toast } from 'sonner';
import { useAuth } from '@/features/auth/hooks/use-auth';
import type { ProductSummary } from '@/features/catalog/types/catalog';
import {
  addWishlistItem,
  getWishlist,
  removeWishlistItem,
} from '@/features/wishlist/api/wishlist-api';
import { rememberWishlistIntent } from '@/features/wishlist/lib/pending-wishlist-intents';
import type {
  WishlistItem,
  WishlistResponse,
} from '@/features/wishlist/types/wishlist';

export const wishlistKeys = {
  all: ['wishlist'] as const,
};

type WishlistData = InfiniteData<WishlistResponse>;

interface WishlistMutationVariables {
  product: ProductSummary;
  save: boolean;
}

function patchWishlistData(
  current: WishlistData | undefined,
  product: ProductSummary,
  save: boolean,
): WishlistData | undefined {
  if (!current) {
    return current;
  }

  let removed = false;
  const pages = current.pages.map((page) => {
    const data = page.data.filter((item) => {
      if (item.product?.id === product.id) {
        removed = true;
        return false;
      }

      return true;
    });

    return data.length === page.data.length ? page : { ...page, data };
  });

  if (!save) {
    if (!removed) {
      return current;
    }

    return {
      ...current,
      pages: pages.map((page) => ({
        ...page,
        meta: { ...page.meta, total: Math.max(0, page.meta.total - 1) },
      })),
    };
  }

  // The API treats a repeated save as a no-op, so keep the existing row.
  if (removed) {
    return current;
  }

  const [first, ...rest] = pages;

  if (!first) {
    return current;
  }

  const optimisticItem: WishlistItem = {
    id: -product.id,
    product,
    created_at: new Date().toISOString(),
  };

  return {
    ...current,
    pages: [
      {
        ...first,
        data: [optimisticItem, ...first.data],
        meta: { ...first.meta, total: first.meta.total + 1 },
      },
      ...rest.map((page) => ({
        ...page,
        meta: { ...page.meta, total: page.meta.total + 1 },
      })),
    ],
  };
}

export function useWishlist() {
  const { isAuthenticated } = useAuth();
  const query = useInfiniteQuery({
    queryKey: wishlistKeys.all,
    queryFn: ({ pageParam, signal }) => getWishlist(pageParam, signal),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.meta.current_page < lastPage.meta.last_page
        ? lastPage.meta.current_page + 1
        : undefined,
    enabled: isAuthenticated,
  });

  const items =
    query.data?.pages.flatMap((page) => page.data) ?? ([] as WishlistItem[]);
  const savedIds = new Set(
    items
      .map((item) => item.product?.id)
      .filter((id): id is number => typeof id === 'number'),
  );

  return {
    ...query,
    items,
    savedIds,
    total: query.data?.pages[0]?.meta.total ?? 0,
  };
}

export function useWishlistMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ product, save }: WishlistMutationVariables) => {
      if (save) {
        await addWishlistItem(product.id);
        return;
      }

      await removeWishlistItem(product.id);
    },
    onMutate: async ({
      product,
      save,
    }): Promise<{ previous: WishlistData | undefined }> => {
      await queryClient.cancelQueries({ queryKey: wishlistKeys.all });
      const previous = queryClient.getQueryData<WishlistData>(wishlistKeys.all);

      queryClient.setQueryData<WishlistData>(wishlistKeys.all, (current) =>
        patchWishlistData(current, product, save),
      );

      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(wishlistKeys.all, context.previous);
      }

      toast.error("Couldn't update your wishlist. Try again.");
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: wishlistKeys.all });
    },
  });
}

/**
 * One heart click either saves or removes a product. Guests are sent to log in
 * with their intent remembered, then the save runs once they return.
 */
export function useWishlistToggle() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const mutation = useWishlistMutation();
  const { mutate } = mutation;

  const toggle = useCallback(
    (product: ProductSummary, save: boolean) => {
      if (!isAuthenticated) {
        rememberWishlistIntent(product);
        navigate('/login', { state: { from: location } });
        return;
      }

      mutate({ product, save });
    },
    [isAuthenticated, location, mutate, navigate],
  );

  const isToggling = (productId: number): boolean =>
    mutation.isPending && mutation.variables?.product.id === productId;

  return { toggle, isToggling };
}
