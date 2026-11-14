import { useCallback, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  assistantKeys,
  useAiQuota,
} from '@/features/assistant/hooks/use-assistant';
import { postCompareVerdict } from '@/features/compare/api/compare-api';
import type { CompareVerdictData } from '@/features/compare/types/compare';
import type { SavedComparisonVerdict } from '@/features/compare/types/saved-comparison';
import { isApiError } from '@/lib/api-error';

export type CompareVerdictStatus =
  'idle' | 'loading' | 'ready' | 'error' | 'quota_exceeded';

export type CompareVerdictPayload = CompareVerdictData | SavedComparisonVerdict;

export interface UseCompareVerdictOptions {
  productIds: number[];
  initialVerdict?: CompareVerdictPayload | null;
  comparisonId?: number | null;
}

function normalizeIds(ids: number[]): string {
  return [...ids].sort((a, b) => a - b).join(',');
}

export function useCompareVerdict({
  productIds,
  initialVerdict,
  comparisonId,
}: UseCompareVerdictOptions) {
  const queryClient = useQueryClient();
  const { data: quota } = useAiQuota();

  const [priority, setPriority] = useState('');
  const [generatedVerdict, setGeneratedVerdict] =
    useState<CompareVerdictData | null>(null);
  const [generatedIds, setGeneratedIds] = useState<string>('');

  const currentIdsSnapshot = useMemo(
    () => normalizeIds(productIds),
    [productIds],
  );

  const mutation = useMutation({
    mutationFn: async (customPriority?: string) => {
      const priorityToSend =
        customPriority !== undefined ? customPriority : priority.trim();
      const res = await postCompareVerdict({
        product_ids: productIds,
        priority: priorityToSend.length > 0 ? priorityToSend : undefined,
        comparison_id: comparisonId ?? undefined,
      });
      return res.data;
    },
    onSuccess: (data) => {
      setGeneratedVerdict(data);
      setGeneratedIds(currentIdsSnapshot);

      // Synchronise daily quota across app
      if (data.quota) {
        queryClient.setQueryData(assistantKeys.quota(), data.quota);
      }
    },
  });

  // Determine active verdict
  const activeVerdict: CompareVerdictPayload | null = useMemo(() => {
    if (generatedVerdict && generatedIds === currentIdsSnapshot) {
      return generatedVerdict;
    }
    if (
      initialVerdict?.verdict &&
      Array.isArray(initialVerdict.products) &&
      initialVerdict.products.length > 0
    ) {
      const initialIds = normalizeIds(
        initialVerdict.products.map((p) => p.product_id),
      );
      if (initialIds === currentIdsSnapshot) {
        return initialVerdict;
      }
    }
    return null;
  }, [generatedVerdict, generatedIds, initialVerdict, currentIdsSnapshot]);

  // Compute status derived cleanly without cascading effect setState
  const status: CompareVerdictStatus = useMemo(() => {
    if (mutation.isPending) {
      return 'loading';
    }
    if (mutation.isError) {
      const err = mutation.error;
      if (
        isApiError(err) &&
        (err.status === 429 || err.code === 'ai_quota_exceeded')
      ) {
        return 'quota_exceeded';
      }
      return 'error';
    }
    if (activeVerdict !== null) {
      return 'ready';
    }
    if (quota && quota.remaining <= 0) {
      return 'quota_exceeded';
    }
    return 'idle';
  }, [
    mutation.isPending,
    mutation.isError,
    mutation.error,
    activeVerdict,
    quota,
  ]);

  const errorMessage: string | null = useMemo(() => {
    if (!mutation.isError) {
      return null;
    }
    const err = mutation.error;
    if (
      isApiError(err) &&
      (err.status === 429 || err.code === 'ai_quota_exceeded')
    ) {
      return (
        err.message ||
        "You've used today's AI answers. Your quota will reset at midnight."
      );
    }
    return isApiError(err)
      ? err.message
      : 'Could not generate AI verdict. Please check your connection and try again.';
  }, [mutation.isError, mutation.error]);

  const generate = useCallback(
    (customPriority?: string) => {
      if (productIds.length < 2 || productIds.length > 4) {
        return;
      }
      mutation.mutate(customPriority);
    },
    [productIds, mutation],
  );

  const retry = useCallback(() => {
    generate();
  }, [generate]);

  const reset = useCallback(() => {
    setGeneratedVerdict(null);
    setGeneratedIds('');
    mutation.reset();
  }, [mutation]);

  return {
    status,
    verdictData: activeVerdict,
    priority,
    setPriority,
    errorMessage,
    isLoading: mutation.isPending,
    generate,
    retry,
    reset,
    quota,
  };
}
