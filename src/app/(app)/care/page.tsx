'use client';

import { useI18n } from '@/i18n';
import { FamilyOverview } from '@/components/care';
import { PageHeader } from '@/components/ui';

export default function CarePage() {
  const { t } = useI18n();
  return (
    <div>
      <PageHeader title={t('care.familyTitle')} description={t('care.caregiverIntro')} />
      <FamilyOverview />
    </div>
  );
}
