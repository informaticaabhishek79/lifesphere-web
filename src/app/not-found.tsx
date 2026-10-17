'use client';

import Link from 'next/link';
import { useI18n } from '@/i18n';

export default function NotFound() {
  const { t } = useI18n();
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="font-display text-5xl font-semibold text-brand">404</div>
      <p className="max-w-sm text-muted">{t('common.notFound')}</p>
      <Link href="/" className="rounded-xl bg-brand px-4 py-2.5 font-semibold text-brand-ink">
        {t('nav.home')}
      </Link>
    </div>
  );
}
