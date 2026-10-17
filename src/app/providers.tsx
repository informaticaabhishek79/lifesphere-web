'use client';

import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { ApiError } from '@/lib/api';
import { I18nProvider, type Locale } from '@/i18n';
import type { Dict } from '@/i18n/load';
import { ConfirmProvider, ToastProvider } from '@/components/dialog';
import { ReauthProvider } from '@/components/reauth';

export function Providers({ locale, dict, region, children }: { locale: Locale; dict: Dict | null; region: string | null; children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 15_000,
            refetchOnWindowFocus: true,
            retry: (count, err) => !(err instanceof ApiError && err.status >= 400 && err.status < 500) && count < 2,
          },
        },
        queryCache: new QueryCache(),
        mutationCache: new MutationCache(),
      }),
  );
  return (
    <QueryClientProvider client={client}>
      <I18nProvider initial={locale} initialDict={dict} initialRegion={region}>
        <ToastProvider>
          <ConfirmProvider>
            <ReauthProvider>{children}</ReauthProvider>
          </ConfirmProvider>
        </ToastProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
}
