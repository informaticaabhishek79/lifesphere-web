'use client';

import { useEffect } from 'react';
import { RotateCcw } from 'lucide-react';
import { useI18n } from '@/i18n';
import { Button, ButtonLink, EmptyState } from '@/components/ui';

/** Shown when a screen fails to render, so one broken page never blanks the whole app. */
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useI18n();
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <EmptyState
      title={t('common.somethingWrong')}
      body={error.digest ? `Ref: ${error.digest}` : undefined}
      action={
        <div className="flex gap-2">
          <Button icon={<RotateCcw className="size-4" />} onClick={reset}>
            {t('common.retry')}
          </Button>
          <ButtonLink href="/" variant="secondary">
            {t('nav.home')}
          </ButtonLink>
        </div>
      }
    />
  );
}
