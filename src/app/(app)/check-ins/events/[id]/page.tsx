'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { Check, PhoneCall } from 'lucide-react';
import { api } from '@/lib/api';
import { useAction } from '@/lib/hooks';
import { useSession } from '@/lib/session';
import type { CheckInEvent } from '@/lib/types';
import { useI18n } from '@/i18n';
import { Badge, Button, Card, CardBody, CardHeader, ErrorNotice, LoadingBlock, Notice, PageHeader } from '@/components/ui';
import { Input } from '@/components/form';
import { StatusBadge } from '@/components/status';

export default function CheckInEventPage() {
  const { id } = useParams<{ id: string }>();
  const { t, e } = useI18n();
  const { fmt, me } = useSession();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['checkins', 'event', id], queryFn: () => api.get<CheckInEvent>(`/v1/check-ins/events/${id}`), refetchInterval: 30_000 });
  const [note, setNote] = useState('');
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['checkins'] });
    qc.invalidateQueries({ queryKey: ['dashboard'] });
  };
  const ack = useAction(() => api.post(`/v1/check-ins/events/${id}/acknowledge`, { note: note.trim() || undefined }), { onSuccess: refresh, success: t('checkins.acknowledged') });
  const complete = useAction(() => api.post(`/v1/check-ins/events/${id}/complete`, { note: note.trim() || undefined }), { onSuccess: refresh, success: t('dashboard.checkedIn') });

  if (q.isLoading) return <LoadingBlock rows={3} />;
  if (q.error || !q.data) return <ErrorNotice error={q.error} onRetry={q.refetch} />;
  const ev = q.data;
  const mine = ev.userId === me.id;
  const open = ['pending', 'reminded', 'missed', 'escalated'].includes(ev.state);
  const steps: { label: string; at: string | null }[] = [
    { label: t('checkins.stepDue'), at: ev.dueAt },
    { label: t('checkins.stepReminded'), at: ev.remindedAt },
    { label: t('checkins.stepMissed'), at: ev.missedAt },
    { label: t('checkins.stepEscalated'), at: ev.escalatedAt },
    { label: t('checkins.stepCompleted'), at: ev.completedAt },
    { label: t('checkins.stepAcknowledged'), at: ev.acknowledgedAt },
  ];

  return (
    <div className="max-w-2xl">
      <PageHeader back={{ href: '/check-ins', label: t('nav.checkins') }} title={t('checkins.eventTitle')} description={fmt.dateTime(ev.dueAt)} actions={<StatusBadge group="checkInState" value={ev.state} />} />
      {(ev.state === 'missed' || ev.state === 'escalated') && !mine && (
        <Notice tone="danger" className="mb-5" title={t('checkins.missedTitle')}>
          {t('checkins.missedBody')}
        </Notice>
      )}
      <div className="space-y-5">
        <Card>
          <CardBody className="pt-5">
            <ol className="relative space-y-4 border-s-2 border-line ps-5">
              {steps
                .filter((s) => s.at)
                .map((s) => (
                  <li key={s.label} className="relative">
                    <span className="absolute top-1.5 -start-[1.62rem] size-3 rounded-full border-2 border-surface bg-brand" />
                    <div className="font-medium">{s.label}</div>
                    <div className="text-sm text-muted">{fmt.dateTime(s.at)}</div>
                  </li>
                ))}
            </ol>
            {ev.note && <p className="mt-4 rounded-xl bg-surface-2 px-4 py-3 italic">“{ev.note}”</p>}
          </CardBody>
        </Card>

        {(ev.alertDeliveries?.length ?? 0) > 0 && (
          <Card>
            <CardHeader title={t('checkins.alertsSent')} description={t('checkins.deliveryHonest')} />
            <CardBody>
              <ul className="divide-y divide-line">
                {ev.alertDeliveries!.map((a) => (
                  <li key={a.recipientUserId} className="py-2.5">
                    <div className="font-medium">{a.recipientUserId === me.id ? t('common.you') : a.displayName}</div>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {a.channels.length === 0 && <Badge>{t('checkins.inAppOnly')}</Badge>}
                      {a.channels.map((c, i) => (
                        <Badge key={i} tone={c.status === 'delivered' ? 'ok' : c.status === 'failed' ? 'danger' : c.status === 'simulated' ? 'accent' : 'neutral'}>
                          {e('channel', c.channel)}: {e('deliveryStatus', c.status)}
                        </Badge>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        )}

        {open && (
          <Card>
            <CardBody className="space-y-3 pt-5">
              <Input label={t('common.notes')} optional placeholder={mine ? t('checkins.notePlaceholderMine') : t('checkins.notePlaceholder')} value={note} onChange={(ev2) => setNote(ev2.target.value)} maxLength={200} />
              <div className="flex flex-wrap gap-2">
                {mine ? (
                  <Button size="lg" className="bg-ok hover:bg-ok/90" icon={<Check className="size-5" />} loading={complete.isPending} onClick={() => complete.mutate()}>
                    {t('dashboard.checkInNow')}
                  </Button>
                ) : (
                  <Button size="lg" icon={<PhoneCall className="size-5" />} loading={ack.isPending} onClick={() => ack.mutate()}>
                    {t('checkins.iFollowedUp')}
                  </Button>
                )}
              </div>
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}
