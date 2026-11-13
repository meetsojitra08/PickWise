import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/features/auth/hooks/use-auth';
import {
  createComparison,
  deleteComparison,
  getComparisons,
  getSharedComparison,
  shareComparison,
  stopSharingComparison,
} from '@/features/compare/api/saved-comparison-api';
import type {
  ComparisonListResponse,
  SavedComparison,
} from '@/features/compare/types/saved-comparison';

export const comparisonKeys = {
  all: ['comparisons'] as const,
  list: ['comparisons', 'list'] as const,
  shared: (token: string) => ['comparisons', 'shared', token] as const,
};

type ComparisonListData = InfiniteData<ComparisonListResponse>;

function patchListComparison(
  queryClient: ReturnType<typeof useQueryClient>,
  comparisonId: number,
  patch: Partial<SavedComparison>,
): void {
  queryClient.setQueryData<ComparisonListData>(
    comparisonKeys.list,
    (current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        pages: current.pages.map((page) => ({
          ...page,
          data: page.data.map((comparison) =>
            comparison.id === comparisonId
              ? { ...comparison, ...patch }
              : comparison,
          ),
        })),
      };
    },
  );
}

export function useComparisons() {
  const { isAuthenticated } = useAuth();
  const query = useInfiniteQuery({
    queryKey: comparisonKeys.list,
    queryFn: ({ pageParam, signal }) => getComparisons(pageParam, signal),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.meta.current_page < lastPage.meta.last_page
        ? lastPage.meta.current_page + 1
        : undefined,
    enabled: isAuthenticated,
  });

  return {
    ...query,
    items:
      query.data?.pages.flatMap((page) => page.data) ??
      ([] as SavedComparison[]),
    total: query.data?.pages[0]?.meta.total ?? 0,
  };
}

export function useSharedComparison(token: string) {
  return useQuery({
    queryKey: comparisonKeys.shared(token),
    queryFn: ({ signal }) => getSharedComparison(token, signal),
    enabled: token.length > 0,
  });
}

export function useCreateComparison() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      name,
      productIds,
    }: {
      name: string;
      productIds: number[];
    }) => createComparison(name, productIds),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: comparisonKeys.list });
    },
  });
}

export function useShareComparison() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (comparisonId: number) => shareComparison(comparisonId),
    onSuccess: (response, comparisonId) => {
      patchListComparison(queryClient, comparisonId, {
        share_token: response.data.share_token,
        is_shared: true,
      });
      void queryClient.invalidateQueries({ queryKey: comparisonKeys.list });
    },
  });
}

export function useStopSharingComparison() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (comparisonId: number) => stopSharingComparison(comparisonId),
    onSuccess: (_response, comparisonId) => {
      patchListComparison(queryClient, comparisonId, {
        share_token: null,
        is_shared: false,
      });
      void queryClient.invalidateQueries({ queryKey: comparisonKeys.list });
    },
  });
}

export function useDeleteComparison() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (comparisonId: number) => deleteComparison(comparisonId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: comparisonKeys.list });
    },
    onError: () => {
      toast.error("Couldn't delete this comparison. Try again.");
    },
  });
}
