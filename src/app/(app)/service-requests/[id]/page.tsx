'use client';

import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { Phone, Star } from 'lucide-react';
import { api } from '@/lib/api';
import { localInputToIso } from '@/lib/format';
import { usePeople } from '@/lib/data';
import { useSession } from '@/lib/session';
import type { ServiceRequest, ServiceRequestStatus } from '@/lib/types';
import { useI18n } from '@/i18n';
import { Badge, Button, Card, CardBody, CardHeader, cx, ErrorNotice, KeyValue, LoadingBlock, Notice, PageHeader } from '@/components/ui';
import { Input, Textarea } from '@/components/form';
import { FormDialog } from '@/components/dialog';
import { StatusBadge } from '@/components/status';
import { ReportButton } from '@/components/community';
import { VerificationBadge } from '@/components/services';

export default function ServiceRequestPage() {
  const { id } = useParams<{ id: string }>();
  const { t, e } = useI18n();
  const { fmt } = useSession();
  const qc = useQueryClient();
  const { nameOf } = usePeople();
  const key = ['service-request', id];
  const q = useQuery({ queryKey: key, queryFn: () => api.get<ServiceRequest>(`/v1/service-requests/${id}`), refetchInterval: 30_000 });
  const [to, setTo] = useState<ServiceRequestStatus | null>(null);
  const [note, setNote] = useState('');
  const [when, setWhen] = useState('');
  const [review, setReview] = useState<{ rating: number; body: string } | null>(null);
  const refresh = () => {
    qc.invalidateQueries({ queryKey: key });
    qc.invalidateQueries({ queryKey: ['service-requests'] });
    qc.invalidateQueries({ queryKey: ['dashboard'] });
  };
  if (q.isLoading) return <LoadingBlock rows={4} />;
  if (q.error || !q.data) return <ErrorNotice error={q.error} onRetry={q.refetch} />;
  const r = q.data;
  const canReview = r.status === 'completed' && r.myRole === 'customer' && !r.review && r.providerId;
  return (
    <div className="max-w-3xl">
      <PageHeader back={{ href: r.myRole === 'provider' ? '/provider-portal' : '/service-requests', label: r.myRole === 'provider' ? t('nav.providerPortal') : t('nav.serviceRequests') }} title={r.title} actions={<StatusBadge group="serviceRequestStatus" value={r.status} />} />
      <div className="space-y-5">
        {r.allowedNextStatuses && r.allowedNextStatuses.length > 0 && (
          <Card>
            <CardBody className="pt-5">
              <div className="mb-2 text-sm font-semibold">{t('consumer.moveTo')}</div>
              <div className="flex flex-wrap gap-2">
                {r.allowedNextStatuses.map((s) => (
                  <Button key={s} size="sm" variant={['cancelled', 'declined', 'disputed'].includes(s) ? 'secondary' : 'primary'} onClick={() => { setNote(''); setWhen(''); setTo(s); }}>
                    {e('serviceRequestStatus', s)}
                  </Button>
                ))}
              </div>
            </CardBody>
          </Card>
        )}
        {!r.providerId && r.status === 'requested' && <Notice tone="info">{t('services.waitingForProvider')}</Notice>}
        <Card>
          <CardBody className="space-y-4 pt-5">
            {r.description && <p className="whitespace-pre-wrap">{r.description}</p>}
            <KeyValue
              items={[
                { label: t('services.scheduled'), value: r.scheduledAt ? fmt.dateTime(r.scheduledAt) : undefined },
                { label: t('services.preferred'), value: r.preferredStart ? `${fmt.dateTime(r.preferredStart)}${r.preferredEnd ? ` – ${fmt.dateTime(r.preferredEnd)}` : ''}` : undefined },
                { label: t('services.locationNote'), value: r.locationNote },
                { label: t('services.forSomeone'), value: nameOf(r.onBehalfOfUserId) },
                { label: t('common.reason'), value: r.statusReason },
              ]}
            />
          </CardBody>
        </Card>
        {r.provider && (
          <Card>
            <CardHeader title={r.myRole === 'provider' ? t('services.yourBusiness') : t('services.provider')} />
            <CardBody className="space-y-2">
              <Link href={`/services/providers/${r.provider.id}`} className="font-semibold hover:text-brand">
                {r.provider.displayName}
              </Link>
              <div className="flex flex-wrap gap-2">
                <VerificationBadge level={r.provider.verificationLevel} label={r.provider.verificationLabel} />
                {r.provider.sponsored && <Badge tone="warn">{t('services.sponsored')}</Badge>}
              </div>
              {r.provider.phonePublic && r.myRole !== 'provider' && (
                <a href={`tel:${r.provider.phonePublic}`} className="inline-flex items-center gap-1 text-sm font-semibold text-brand">
                  <Phone className="size-4" /> {r.provider.phonePublic}
                </a>
              )}
            </CardBody>
          </Card>
        )}
        {(r.history?.length ?? 0) > 0 && (
          <Card>
            <CardHeader title={t('services.history')} />
            <CardBody>
              <ol className="relative space-y-3 border-l-2 border-line pl-5">
                {r.history!.map((h) => (
                  <li key={h.id} className="relative">
                    <span className="absolute top-1.5 -left-[1.62rem] size-3 rounded-full border-2 border-surface bg-brand" />
                    <div className="font-medium">{e('serviceRequestStatus', h.toStatus)}</div>
                    <div className="text-sm text-muted">{fmt.dateTime(h.createdAt)}</div>
                    {h.note && <div className="text-sm">{h.note}</div>}
                  </li>
                ))}
              </ol>
            </CardBody>
          </Card>
        )}
        {r.review && (
          <Card>
            <CardHeader title={t('services.yourReview')} />
            <CardBody>
              <div className="text-warn">{'★'.repeat(r.review.rating)}{'☆'.repeat(5 - r.review.rating)}</div>
              {r.review.body && <p className="mt-1">{r.review.body}</p>}
              {r.review.providerResponse && <p className="mt-2 rounded-lg bg-surface-2 px-3 py-2 text-sm">{r.review.providerResponse}</p>}
            </CardBody>
          </Card>
        )}
        {canReview && (
          <Button icon={<Star className="size-4" />} onClick={() => setReview({ rating: 5, body: '' })}>
            {t('services.leaveReview')}
          </Button>
        )}
        <div className="flex justify-end">
          <ReportButton targetType="service_request" targetId={r.id} />
        </div>
      </div>

      {to && (
        <FormDialog
          open
          onClose={() => setTo(null)}
          title={e('serviceRequestStatus', to)}
          danger={['cancelled', 'declined', 'disputed'].includes(to)}
          disabled={to === 'scheduled' && !when}
          onSubmit={async () => {
            await api.post(`/v1/service-requests/${id}/status`, { status: to, note: note.trim() || undefined, scheduledAt: to === 'scheduled' ? localInputToIso(when) : undefined });
            refresh();
          }}
        >
          {to === 'scheduled' && <Input type="datetime-local" label={t('services.scheduledFor', { when: '' })} value={when} onChange={(ev) => setWhen(ev.target.value)} />}
          <Textarea label={t('common.notes')} optional value={note} onChange={(ev) => setNote(ev.target.value)} rows={2} />
        </FormDialog>
      )}
      {review && (
        <FormDialog
          open
          onClose={() => setReview(null)}
          title={t('services.leaveReview')}
          description={t('services.reviewHint')}
          onSubmit={async () => {
            await api.post(`/v1/service-requests/${id}/review`, { rating: review.rating, body: review.body.trim() || undefined });
            refresh();
          }}
        >
          <div className="flex gap-1" role="radiogroup" aria-label={t('services.rating')}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" role="radio" aria-checked={review.rating === n} aria-label={String(n)} onClick={() => setReview({ ...review, rating: n })} className={cx('text-3xl', n <= review.rating ? 'text-warn' : 'text-line-strong')}>
                ★
              </button>
            ))}
          </div>
          <Textarea label={t('services.reviewText')} optional value={review.body} onChange={(ev) => setReview({ ...review, body: ev.target.value })} rows={3} maxLength={1000} />
        </FormDialog>
      )}
    </div>
  );
}
