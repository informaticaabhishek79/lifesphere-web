'use client';

import { WifiOff } from 'lucide-react';
import { useI18n } from '@/i18n';
import { Logo } from '@/components/brand';
import { Button } from '@/components/ui';

/** Shown by the service worker when a page is opened without a connection. Holds no personal data. */
export default function OfflinePage() {
  const { t } = useI18n();
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-5 px-6 text-center">
      <Logo />
      <span className="flex size-14 items-center justify-center rounded-full bg-surface-2 text-muted">
        <WifiOff className="size-7" aria-hidden />
      </span>
      <h1 className="font-display text-2xl font-semibold">{t('offline.title')}</h1>
      <p className="text-muted">{t('offline.body')}</p>
      <p className="text-sm text-muted">{t('offline.emergency')}</p>
      <Button onClick={() => window.location.reload()}>{t('offline.retry')}</Button>
    </main>
  );
}
