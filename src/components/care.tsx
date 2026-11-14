'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CalendarDays, Clock, HeartPulse, LifeBuoy, Pill, UserPlus } from 'lucide-react';
import { api } from '@/lib/api';
import { useSession } from '@/lib/session';
import type { CareItem, CarePeople, CarePerson, CareStatus, CareToday } from '@/lib/types';
import { useI18n } from '@/i18n';
import { SuggestMedicineButton } from './care-suggestions';
import { useToast } from './dialog';
import { Avatar, Badge, Button, ButtonLink, Card, cx, EmptyState, ErrorNotice, LoadingBlock } from './ui';

export const useCarePeople = () => useQuery({ queryKey: ['care', 'people'], queryFn: () => api.get<CarePeople>('/v1/care/people'), refetchInterval: 60_000 });
export const useCareToday = () => useQuery({ queryKey: ['care', 'today'], queryFn: () => api.get<CareToday>('/v1/care/today'), refetchInterval: 60_000 });

const STATUS_STYLE: Record<CareStatus, { box: string; dot: string }> = {
  help: { box: 'border-danger/40 bg-danger-soft text-danger', dot: 'bg-danger' },
  missed: { box: 'border-danger/30 bg-danger-soft text-danger', dot: 'bg-danger' },
  waiting: { box: 'border-warn/30 bg-warn-soft text-warn', dot: 'bg-warn' },
  ok: { box: 'border-ok/30 bg-ok-soft text-ok', dot: 'bg-ok' },
  quiet: { box: 'border-line bg-surface-2 text-ink-2', dot: 'bg-muted' },
  not_set_up: { box: 'border-line bg-surface-2 text-ink-2', dot: 'bg-muted' },
  starting: { box: 'border-info/30 bg-info-soft text-info', dot: 'bg-info' },
};

export function itemTone(i: CareItem): 'ok' | 'warn' | 'danger' | 'neutral' | 'info' {
  if (i.state === 'completed' || i.state === 'acknowledged') return 'ok';
  if (i.state === 'missed' || i.state === 'escalated') return 'danger';
  if (i.state === 'pending' || i.state === 'reminded') return 'warn';
  return 'neutral';
}

/** One line of the day: "BP tablet · 8:00 — Taken". */
export function CareItemRow({ item, action, large }: { item: CareItem; action?: React.ReactNode; large?: boolean }) {
  const { t } = useI18n();
  const { fmt } = useSession();
  const Icon = item.purpose === 'medicine' ? Pill : HeartPulse;
  const state =
    item.state === 'upcoming'
      ? t('care.state.later')
      : item.purpose === 'medicine' && item.state === 'completed'
        ? t('care.state.taken', { time: fmt.time(item.completedAt!) })
        : item.state === 'completed'
          ? t('care.state.checkedIn', { time: fmt.time(item.completedAt!) })
          : t(`care.state.${item.purpose === 'medicine' && ['pending', 'reminded'].includes(item.state) ? 'notYetTaken' : item.state}`);
  const tone = itemTone(item);
  return (
    <li className={cx('flex items-center gap-3 rounded-xl border px-3', large ? 'py-3.5' : 'py-2.5', tone === 'danger' ? 'border-danger/30 bg-danger-soft/40' : 'border-line bg-surface')}>
      <span className={cx('flex shrink-0 items-center justify-center rounded-xl', large ? 'size-11' : 'size-9', item.purpose === 'medicine' ? 'bg-accent-soft text-accent' : 'bg-brand-soft text-brand')}>
        <Icon className={large ? 'size-6' : 'size-5'} />
      </span>
      <span className="min-w-0 flex-1">
        <span className={cx('block truncate font-semibold', large && 'text-lg')}>{item.label}</span>
        <span className="flex flex-wrap items-center gap-x-2 text-sm text-muted">
          <span className="tabular-nums">{fmt.time(item.dueAt)}</span>
          <Badge tone={tone}>{state}</Badge>
        </span>
      </span>
      {action}
    </li>
  );
}

function PersonCard({ person }: { person: CarePerson }) {
  const { t, e } = useI18n();
  const { fmt } = useSession();
  const qc = useQueryClient();
  const toast = useToast();
  const name = person.label || person.displayName || t('care.someone');
  const follow = useMutation({
    mutationFn: (id: string) => api.post(`/v1/check-ins/events/${id}/acknowledge`, {}),
    onSuccess: () => {
      toast(t('care.followingUpDone'));
      qc.invalidateQueries({ queryKey: ['care'] });
    },
    onError: (err) => toast((err as Error).message, 'danger'),
  });
  const style = STATUS_STYLE[person.status];
  const startsAt = person.shares.filter((s) => s.status === 'pending_cooloff').map((s) => s.effectiveAt).sort()[0];
  const summary =
    person.status === 'starting'
      ? t('care.status.starting', { time: startsAt ? fmt.time(startsAt) : '' })
      : person.status === 'ok' && person.lastCheckInAt
        ? t('care.status.okAt', { time: fmt.time(person.lastCheckInAt) })
        : t(`care.status.${person.status}`, { name });

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-3 px-5 pt-5">
        <Avatar name={person.displayName} size="lg" />
        <div className="min-w-0 flex-1">
          <h2 className="font-display truncate text-xl font-semibold">{name}</h2>
          {person.label && person.displayName && <p className="truncate text-sm text-muted">{person.displayName}</p>}
        </div>
      </div>
      <div className={cx('mx-5 mt-4 flex items-start gap-2.5 rounded-xl border px-3.5 py-3 font-semibold', style.box)} role={person.status === 'help' || person.status === 'missed' ? 'alert' : undefined}>
        <span className={cx('mt-1.5 size-2.5 shrink-0 rounded-full', style.dot)} aria-hidden />
        <span>{summary}</span>
      </div>

      <div className="space-y-5 px-5 py-5">
        {person.openHelp.map((h) => (
          <div key={h.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-danger/30 px-3.5 py-3">
            <LifeBuoy className="size-5 text-danger" />
            <div className="min-w-0 flex-1">
              <div className="font-semibold">{t('care.askedForHelp', { name, time: fmt.ago(h.createdAt) })}</div>
              {h.message && <div className="text-sm text-ink-2">“{h.message}”</div>}
            </div>
            <ButtonLink href={`/help/requests/${h.id}`} size="sm" variant="danger">
              {t('care.respond')}
            </ButtonLink>
          </div>
        ))}

        {person.today && (
          <div>
            <h3 className="mb-2 text-sm font-semibold text-muted">{t('care.today')}</h3>
            {person.today.length === 0 ? (
              <p className="rounded-xl bg-surface-2 px-4 py-3 text-sm text-muted">{person.status === 'not_set_up' ? t('care.notSetUpHint', { name }) : t('care.nothingToday')}</p>
            ) : (
              <ul className="space-y-2">
                {person.today.map((i) => (
                  <CareItemRow
                    key={`${i.scheduleId}-${i.dueAt}`}
                    item={i}
                    action={
                      i.id && (i.state === 'missed' || i.state === 'escalated') ? (
                        <Button size="sm" variant="secondary" loading={follow.isPending && follow.variables === i.id} onClick={() => follow.mutate(i.id!)}>
                          {t('care.followUp')}
                        </Button>
                      ) : undefined
                    }
                  />
                ))}
              </ul>
            )}
            {person.lastCheckInAt && <p className="mt-2 text-xs text-muted">{t('care.lastCheckIn', { when: fmt.ago(person.lastCheckInAt) })}</p>}
          </div>
        )}

        {person.appointments && person.appointments.length > 0 && (
          <div>
            <h3 className="mb-2 text-sm font-semibold text-muted">{t('care.comingUp')}</h3>
            <ul className="space-y-2">
              {person.appointments.map((a) => (
                <li key={a.id} className="flex items-center gap-3 rounded-xl bg-surface-2 px-3 py-2.5">
                  <CalendarDays className="size-5 shrink-0 text-brand" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{a.title}</span>
                    {a.locationText && <span className="block truncate text-xs text-muted">{a.locationText}</span>}
                  </span>
                  <span className="shrink-0 text-sm text-muted">
                    {fmt.relativeDay(a.startsAt, { today: t('common.today'), tomorrow: t('common.tomorrow'), yesterday: t('common.yesterday') })} · {fmt.time(a.startsAt)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {person.shares.some((s) => s.scope === 'checkins.suggest' && s.status === 'active') && (
          <div>
            <SuggestMedicineButton targetUserId={person.userId} targetName={name} />
          </div>
        )}

        <div className="border-t border-line pt-4">
          <div className="mb-1.5 text-xs font-semibold text-muted">{t('care.theyShare', { name })}</div>
          <div className="flex flex-wrap gap-1.5">
            {person.shares.map((s) => (
              <Badge key={s.scope} tone={s.status === 'active' ? 'brand' : 'info'} title={s.status === 'pending_cooloff' ? e('grantStatus', 'pending_cooloff') : undefined}>
                {t(`care.scope.${s.scope.replace('.', '_')}`)}
                {s.status === 'pending_cooloff' && <Clock className="ms-1 inline size-3" aria-hidden />}
              </Badge>
            ))}
          </div>
          {person.today === null && person.status !== 'starting' && <p className="mt-2 text-xs text-muted">{t('care.noCheckinsShared', { name })}</p>}
        </div>
      </div>
    </Card>
  );
}

/** The caregiver's view: everyone who shares with them, the most urgent first, plus invitations still waiting. */
export function FamilyOverview() {
  const { t } = useI18n();
  const { fmt } = useSession();
  const q = useCarePeople();
  const qc = useQueryClient();
  const cancel = useMutation({
    mutationFn: (id: string) => api.del(`/v1/contacts/invitations/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['care'] }),
  });
  if (q.isLoading) return <LoadingBlock rows={3} />;
  if (q.error) return <ErrorNotice error={q.error} onRetry={() => q.refetch()} />;
  const d = q.data!;
  return (
    <div className="space-y-5">
      {d.people.some((p) => p.status === 'help' || p.status === 'missed') && (
        <div className="flex items-center gap-2 font-semibold text-danger">
          <AlertTriangle className="size-5" /> {t('care.needsAttention')}
        </div>
      )}
      {d.people.length === 0 && d.invitations.length === 0 && (
        <EmptyState
          icon={<HeartPulse className="size-6" />}
          title={t('care.emptyTitle')}
          body={t('care.emptyBody')}
          action={
            <ButtonLink href="/get-started?step=invite" icon={<UserPlus className="size-4" />}>
              {t('care.addFamily')}
            </ButtonLink>
          }
        />
      )}
      <div className="grid gap-5 lg:grid-cols-2">
        {d.people.map((p) => (
          <PersonCard key={p.userId} person={p} />
        ))}
        {d.invitations.map((i) => (
          <Card key={i.id} className="flex flex-col justify-between gap-4 border-dashed p-5">
            <div className="flex items-center gap-3">
              <Avatar name={i.label} size="lg" />
              <div className="min-w-0">
                <h2 className="font-display truncate text-xl font-semibold">{i.label || t('care.someone')}</h2>
                <p className="text-sm text-muted">{t('care.waitingInvite', { date: fmt.date(i.createdAt, { day: 'numeric', month: 'short' }) })}</p>
              </div>
            </div>
            <p className="text-sm text-ink-2">{t('care.waitingInviteHint')}</p>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" loading={cancel.isPending && cancel.variables === i.id} onClick={() => cancel.mutate(i.id)}>
                {t('care.cancelInvite')}
              </Button>
            </div>
          </Card>
        ))}
      </div>
      {(d.people.length > 0 || d.invitations.length > 0) && (
        <div className="flex flex-wrap gap-2">
          <ButtonLink href="/get-started?step=invite" variant="secondary" icon={<UserPlus className="size-4" />}>
            {t('care.addFamily')}
          </ButtonLink>
        </div>
      )}
    </div>
  );
}

/** "Taken" for a due medicine, "I'm OK" for a due check-in. */
export function useConfirmItem() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (i: CareItem) => api.post(`/v1/check-ins/events/${i.id}/complete`, {}),
    onSuccess: (_r, i) => {
      toast(i.purpose === 'medicine' ? t('care.takenToast') : t('dashboard.checkedIn'));
      qc.invalidateQueries({ queryKey: ['care'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (err) => toast((err as Error).message, 'danger'),
  });
}

export const isOpen = (i: CareItem) => !!i.id && ['pending', 'reminded', 'missed', 'escalated'].includes(i.state);
