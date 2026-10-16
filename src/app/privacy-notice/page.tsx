'use client';

import Link from 'next/link';
import { useI18n } from '@/i18n';
import { Logo } from '@/components/brand';
import { DataInventoryView, NoticeSummary } from '@/components/privacy-info';

export default function PublicPrivacyPage() {
  const { t } = useI18n();
  return (
    <div className="mx-auto max-w-3xl px-5 py-8">
      <Link href="/sign-in" className="mb-8 inline-block">
        <Logo />
      </Link>
      <h1 className="font-display text-3xl font-semibold">{t('privacy.title')}</h1>
      <p className="mt-2 mb-6 text-muted">{t('privacy.intro')}</p>
      <div className="space-y-5">
        <NoticeSummary />
        <DataInventoryView />
      </div>
    </div>
  );
}
