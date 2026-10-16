'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { CheckCircle2, Hand, MapPin, XCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { useAction } from '@/lib/hooks';
import { useSession } from '@/lib/session';
import type { HelpRequest } from '@/lib/types';
import { useI18n } from '@/i18n';
import { Badge, Button, ButtonLink, Card, CardBody, CardHeader, ErrorNotice, KeyValue, LoadingBlock, Notice, PageHeader } from '@/components/ui';
import { useConfirm } from '@/components/dialog';
import { StatusBadge } from '@/components/status';

export default function HelpRequestPage() {
  const { id } = useParams<{ id: string }>();
  const { t, e } = useI18n();
  const { fmt, me } = useSession();
  const qc = useQueryClient();
  const confirm = useConfirm();
  const q = useQuery({ queryKey: ['help', 'request', id], queryFn: () => api.get<HelpRequest>(`/v1/help/requests/${id}`), refetchInterval: 15_000 });
  const refresh = () => qc.invalidateQueries({ queryKey: ['help'] });
  const ack = useAction(() => api.post(`/v1/help/requests/${id}/acknowledge`), { onSuccess: refresh, success: t('help.acked') });
  const resolve = useAction(() => api.post(`/v1/help/requests/${id}/resolve`), { onSuccess: refresh });
  const cancel = useAction(() => api.post(`/v1/help/requests/${id}/cancel`), { onSuccess: refresh });

  if (q.isLoading) return <LoadingBlock rows={3} />;
  if (q.error || !q.data) return <ErrorNotice error={q.error} onRetry={q.refetch} />;
  const h = q.data;
  const mine = h.requesterId === me.id;
  const myRecipient = h.recipients.find((r) => r.userId === me.id);
  const active = h.status === 'open' || h.status === 'acknowledged';

  return (
    <div className="max-w-2xl">
      <PageHeader
        back={{ href: '/help', label: t('nav.help') }}
        title={mine ? e('helpKind', h.kind) : t('help.needsHelp', { name: h.requesterName })}
        description={fmt.dateTime(h.createdAt)}
        actions={<StatusBadge group="helpStatus" value={h.status} />}
      />
      {!mine && active && (
        <Notice tone="danger" className="mb-5" title={t('help.respondTitle')}>
          {t('help.respondBody')}
        </Notice>
      )}
      <div className="space-y-5">
        <Card>
          <CardBody className="space-y-4 pt-5">
            {h.message && <p className="rounded-xl bg-surface-2 px-4 py-3 text-lg">“{h.message}”</p>}
            <KeyValue
              items={[
                { label: t('common.type'), value: e('helpKind', h.kind) },
                { label: t('help.resolvedAt'), value: h.resolvedAt ? fmt.dateTime(h.resolvedAt) : undefined },
              ]}
            />
            {h.location && (
              <div className="rounded-xl border border-line p-4">
                <div className="flex items-center gap-2 font-semibold">
                  <MapPin className="size-5 text-danger" /> {t('help.location')}
                </div>
                <p className="mt-1 text-sm text-muted">{t('help.locationVisibleUntil', { until: fmt.dateTime(h.location.visibleUntil) })}</p>
                <ButtonLink href={`https://www.openstreetmap.org/?mlat=${h.location.lat}&mlon=${h.location.lng}#map=17/${h.location.lat}/${h.location.lng}`} target="_blank" rel="noreferrer" size="sm" variant="secondary" className="mt-3">
                  {t('help.openMap')}
                </ButtonLink>
              </div>
            )}
            {h.serviceRequestId && (
              <ButtonLink href={`/service-requests/${h.serviceRequestId}`} variant="secondary" size="sm">
                {t('help.viewServiceRequest')}
              </ButtonLink>
            )}
          </CardBody>
        </Card>

        {h.recipients.length > 0 && (
          <Card>
            <CardHeader title={t('help.whoWasAlerted')} description={t('checkins.deliveryHonest')} />
            <CardBody>
              <ul className="divide-y divide-line">
                {h.recipients.map((r) => (
                  <li key={r.userId} className="py-2.5">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium">{r.userId === me.id ? t('common.you') : r.displayName}</span>
                      {r.acknowledgedAt ? <Badge tone="ok">{t('help.respondedAt', { when: fmt.time(r.acknowledgedAt) })}</Badge> : <Badge>{t('help.noResponseYet')}</Badge>}
                    </div>
                    {r.deliveries && r.deliveries.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {r.deliveries.map((d, i) => (
                          <Badge key={i} tone={d.status === 'delivered' ? 'ok' : d.status === 'failed' ? 'danger' : d.status === 'simulated' ? 'accent' : 'neutral'}>
                            {e('channel', d.channel)}: {e('deliveryStatus', d.status)}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        )}

        {active && (
          <div className="flex flex-wrap gap-2">
            {!mine && myRecipient && !myRecipient.acknowledgedAt && (
              <Button size="lg" icon={<Hand className="size-5" />} loading={ack.isPending} onClick={() => ack.mutate()}>
                {t('help.imResponding')}
              </Button>
            )}
            <Button size="lg" variant="secondary" icon={<CheckCircle2 className="size-5" />} loading={resolve.isPending} onClick={() => resolve.mutate()}>
              {t('help.markResolved')}
            </Button>
            {mine && (
              <Button
                size="lg"
                variant="ghost"
                icon={<XCircle className="size-5" />}
                onClick={async () => {
                  if (await confirm({ title: t('help.cancelTitle'), body: t('help.cancelBody') })) cancel.mutate();
                }}
              >
                {t('help.cancel')}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
