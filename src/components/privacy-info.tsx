'use client';

import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, XCircle } from 'lucide-react';
import { api } from '@/lib/api';
import type { DataInventory } from '@/lib/types';
import { useI18n } from '@/i18n';
import { Card, CardBody, CardHeader, LoadingBlock } from './ui';

export interface PrivacyNotice {
  policyVersion: string;
  noticeUrl: string | null;
  grievanceOfficer: { name: string | null; email: string | null };
  note?: string;
}

/** What LifeSphere collects and never collects — public, shown before sign-up and in Privacy & data. */
export function DataInventoryView() {
  const { t } = useI18n();
  const inv = useQuery({ queryKey: ['privacy', 'inventory'], queryFn: () => api.get<DataInventory>('/v1/privacy/data-inventory'), staleTime: 3600_000 });
  if (inv.isLoading) return <LoadingBlock rows={3} />;
  if (!inv.data) return null;
  const areas = [...new Set(inv.data.collected.map((c) => c.area))];
  return (
    <div className="space-y-5">
      <Card>
        <CardHeader icon={<XCircle className="size-5" />} title={t('privacy.neverCollected')} />
        <CardBody>
          <ul className="grid gap-2 sm:grid-cols-2">
            {inv.data.neverCollected.map((n) => (
              <li key={n} className="flex gap-2 text-sm">
                <XCircle className="mt-0.5 size-4 shrink-0 text-danger" /> {n}
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>
      {areas.map((area) => (
        <Card key={area}>
          <CardHeader icon={<CheckCircle2 className="size-5" />} title={area} />
          <CardBody>
            <ul className="divide-y divide-line">
              {inv.data!.collected
                .filter((c) => c.area === area)
                .map((c) => (
                  <li key={c.field} className="py-3">
                    <div className="font-semibold">{c.field}</div>
                    <dl className="mt-1 grid gap-x-4 gap-y-1 text-sm sm:grid-cols-2">
                      <div>
                        <dt className="inline font-semibold text-muted">{t('privacy.purpose')}: </dt>
                        <dd className="inline">{c.purpose}</dd>
                      </div>
                      <div>
                        <dt className="inline font-semibold text-muted">{t('privacy.retention')}: </dt>
                        <dd className="inline">{c.retention}</dd>
                      </div>
                      <div>
                        <dt className="inline font-semibold text-muted">{t('privacy.access')}: </dt>
                        <dd className="inline">{c.access}</dd>
                      </div>
                      <div>
                        <dt className="inline font-semibold text-muted">{t('privacy.thirdParties')}: </dt>
                        <dd className="inline">{c.thirdParties}</dd>
                      </div>
                    </dl>
                  </li>
                ))}
            </ul>
          </CardBody>
        </Card>
      ))}
    </div>
  );
}

export function NoticeSummary() {
  const { t } = useI18n();
  const n = useQuery({ queryKey: ['privacy', 'notice'], queryFn: () => api.get<PrivacyNotice>('/v1/privacy/notice'), staleTime: 3600_000 });
  if (!n.data) return null;
  return (
    <Card>
      <CardHeader title={t('privacy.notice')} description={t('privacy.version', { v: n.data.policyVersion })} />
      <CardBody className="space-y-2 text-sm">
        {n.data.noticeUrl && (
          <a href={n.data.noticeUrl} target="_blank" rel="noreferrer" className="font-semibold text-brand">
            {t('privacy.readFull')}
          </a>
        )}
        <div>
          <span className="font-semibold">{t('privacy.grievanceOfficer')}: </span>
          {n.data.grievanceOfficer.name ?? t('privacy.notConfigured')}
          {n.data.grievanceOfficer.email && (
            <>
              {' · '}
              <a href={`mailto:${n.data.grievanceOfficer.email}`} className="text-brand">
                {n.data.grievanceOfficer.email}
              </a>
            </>
          )}
        </div>
      </CardBody>
    </Card>
  );
}
