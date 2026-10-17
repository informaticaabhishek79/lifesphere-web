'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { ExternalLink, Mail, MapPin, Phone } from 'lucide-react';
import { api } from '@/lib/api';
import { usePaged } from '@/lib/hooks';
import { useSession } from '@/lib/session';
import type { ProviderPublic, Review } from '@/lib/types';
import { useI18n } from '@/i18n';
import { Badge, Button, Card, CardBody, CardHeader, ErrorNotice, LoadingBlock, LoadMore, Notice, PageHeader } from '@/components/ui';
import { StatusBadge } from '@/components/status';
import { ReportButton } from '@/components/community';
import { RequestServiceDialog, Stars, VerificationBadge } from '@/components/services';

export default function ProviderPage() {
  const { id } = useParams<{ id: string }>();
  const { t, e } = useI18n();
  const { fmt } = useSession();
  const router = useRouter();
  const q = useQuery({ queryKey: ['services', 'provider', id], queryFn: () => api.get<ProviderPublic>(`/v1/services/providers/${id}`) });
  const reviews = usePaged<Review>(['services', 'reviews', id], `/v1/services/providers/${id}/reviews`);
  const [open, setOpen] = useState(false);
  if (q.isLoading) return <LoadingBlock rows={4} />;
  if (q.error || !q.data) return <ErrorNotice error={q.error} onRetry={q.refetch} />;
  const p = q.data;
  return (
    <div className="max-w-3xl">
      <PageHeader
        back={{ href: '/services', label: t('nav.services') }}
        title={p.displayName}
        description={e('providerType', p.providerType)}
        actions={<Button onClick={() => setOpen(true)}>{t('services.request')}</Button>}
      />
      {p.sponsored && p.sponsoredDisclosure && <Notice tone="warn" className="mb-4">{p.sponsoredDisclosure}</Notice>}
      <div className="space-y-5">
        <Card>
          <CardBody className="space-y-3 pt-5">
            <div className="flex flex-wrap items-center gap-2">
              <VerificationBadge level={p.verificationLevel} />
              <Stars value={p.rating?.average} count={p.rating?.count} />
            </div>
            <p className="text-sm text-muted">{p.verificationLabel}</p>
            {p.description && <p className="whitespace-pre-wrap">{p.description}</p>}
            <div className="flex flex-wrap gap-4 text-sm">
              {p.phonePublic && (
                <a href={`tel:${p.phonePublic}`} className="inline-flex items-center gap-1 font-semibold text-brand">
                  <Phone className="size-4" /> <bdi dir="ltr">{p.phonePublic}</bdi>
                </a>
              )}
              {p.emailPublic && (
                <a href={`mailto:${p.emailPublic}`} className="inline-flex items-center gap-1 font-semibold text-brand">
                  <Mail className="size-4" /> {p.emailPublic}
                </a>
              )}
              {p.websiteUrl && (
                <a href={p.websiteUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-brand">
                  <ExternalLink className="size-4" /> {t('consumer.website')}
                </a>
              )}
            </div>
            {(p.areas?.length ?? 0) > 0 && (
              <p className="flex flex-wrap items-center gap-1.5 text-sm text-muted">
                <MapPin className="size-4" /> {p.areas!.map((a) => `${a.name}, ${a.city}`).join(' · ')}
              </p>
            )}
          </CardBody>
        </Card>
        {(p.services?.length ?? 0) > 0 && (
          <Card>
            <CardHeader title={t('services.services')} />
            <CardBody>
              <ul className="divide-y divide-line">
                {p.services!.map((s) => (
                  <li key={s.id} className="py-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium">{s.title}</span>
                      <Badge>{s.categoryName}</Badge>
                    </div>
                    {s.description && <p className="text-sm text-muted">{s.description}</p>}
                    {s.priceNote && <p className="text-sm font-semibold text-ink-2">{s.priceNote}</p>}
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        )}
        {(p.verificationChecks?.length ?? 0) > 0 && (
          <Card>
            <CardHeader title={t('services.checks')} description={t('services.checksHint')} />
            <CardBody>
              <ul className="space-y-2">
                {p.verificationChecks!.map((c, i) => (
                  <li key={i} className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="flex-1 font-medium">{e('verificationCheck', c.checkType)}</span>
                    <StatusBadge group="verificationStatus" value={c.status} />
                    {c.checkedAt && <span className="text-muted">{fmt.date(c.checkedAt)}</span>}
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        )}
        <Card>
          <CardHeader title={t('services.reviews')} />
          <CardBody>
            {reviews.items.length === 0 && <p className="text-sm text-muted">{t('services.noReviews')}</p>}
            <ul className="space-y-4">
              {reviews.items.map((r) => (
                <li key={r.id}>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-semibold">{r.reviewerName}</span>
                    <span className="text-warn">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                    <span className="text-muted">{fmt.date(r.createdAt)}</span>
                  </div>
                  {r.body && <p className="mt-1">{r.body}</p>}
                  {r.providerResponse && <p className="mt-2 rounded-lg bg-surface-2 px-3 py-2 text-sm"><strong>{p.displayName}:</strong> {r.providerResponse}</p>}
                </li>
              ))}
            </ul>
            <LoadMore hasMore={reviews.hasMore} loading={reviews.loadingMore} onClick={reviews.loadMore} />
          </CardBody>
        </Card>
        <div className="flex justify-end">
          <ReportButton targetType="provider" targetId={p.id} />
        </div>
      </div>
      <RequestServiceDialog open={open} onClose={() => setOpen(false)} provider={p} onCreated={(r) => router.push(`/service-requests/${r.id}`)} />
    </div>
  );
}
