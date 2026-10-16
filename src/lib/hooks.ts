'use client';

import { QueryKey, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from './api';
import type { Page } from './types';
import { useToast } from '@/components/dialog';
import { useReauth } from '@/components/reauth';
import { errorMessage } from '@/components/ui';
import { useI18n } from '@/i18n';

/** Cursor-paginated list (`{ items, nextCursor }`). */
export function usePaged<T, Extra extends object = object>(key: QueryKey, path: string, query: Record<string, unknown> = {}, opts: { enabled?: boolean; limit?: number } = {}) {
  const q = useInfiniteQuery({
    queryKey: [...key, query],
    queryFn: ({ pageParam, signal }) =>
      api.get<Page<T> & Extra>(path, { ...(query as Record<string, string>), limit: opts.limit ?? 25, cursor: pageParam ?? undefined }, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor ?? null,
    enabled: opts.enabled ?? true,
  });
  const pages = q.data?.pages ?? [];
  return {
    items: pages.flatMap((p) => p.items),
    first: pages[0] as (Page<T> & Extra) | undefined,
    hasMore: !!q.hasNextPage,
    loadMore: () => q.fetchNextPage(),
    loadingMore: q.isFetchingNextPage,
    isLoading: q.isLoading,
    error: q.error,
    refetch: q.refetch,
  };
}

/**
 * A mutation that refreshes the given queries, shows a toast, and handles
 * the confirm-it's-you step for sensitive actions.
 */
export function useAction<TVars = void, TResult = unknown>(
  fn: (v: TVars) => Promise<TResult>,
  opts: { invalidate?: QueryKey[]; success?: string | ((r: TResult) => string | undefined); onSuccess?: (r: TResult, v: TVars) => void; silentError?: boolean } = {},
) {
  const qc = useQueryClient();
  const toast = useToast();
  const withReauth = useReauth();
  const { t } = useI18n();
  return useMutation({
    mutationFn: (v: TVars) => withReauth(() => fn(v)),
    onSuccess: (r, v) => {
      for (const k of opts.invalidate ?? []) qc.invalidateQueries({ queryKey: k });
      const msg = typeof opts.success === 'function' ? opts.success(r) : opts.success;
      if (msg) toast(msg);
      opts.onSuccess?.(r, v);
    },
    onError: (e) => {
      if (!opts.silentError) toast(errorMessage(e, t), 'danger');
    },
  });
}

export { api };
