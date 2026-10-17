'use client';

import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { BellRing, Check, HeartPulse, Pencil, Plus, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useAction } from '@/lib/hooks';
import { isoToLocalInput, localInputToIso } from '@/lib/format';
import { useSession } from '@/lib/session';
import type { CheckInEvent, CheckInKind, CheckInPerson, CheckInSchedule, Grant } from '@/lib/types';
import { useI18n } from '@/i18n';
import { Avatar, Badge, Button, ButtonLink, Card, CardBody, CardHeader, cx, EmptyState, ErrorNotice, IconButton, LoadingBlock, Notice, PageHeader, Tabs } from '@/components/ui';
import { Checkbox, CheckboxGroup, Input, Select, Switch } from '@/components/form';
import { FormDialog, useConfirm, useToast } from '@/components/dialog';
import { StatusBadge } from '@/components/status';

type Tab = 'mine' | 'people';
const KINDS: CheckInKind[] = ['daily', 'weekly', 'one_off', 'visit_confirmation', 'assistance_confirmation'];

interface ScheduleForm {
  id?: string;
  label: string;
  kind: CheckInKind;
  timeLocal: string;
  daysOfWeek: string[];
  oneOffAt: string;
  reminderAfterMinutes: string;
  graceMinutes: string;
  escalate: boolean;
  escalationContactIds: string[];
  consent: boolean;
  active: boolean;
}

const blank = (): ScheduleForm => ({ label: '', kind: 'daily', timeLocal: '09:00', daysOfWeek: ['1', '3', '5'], oneOffAt: '', reminderAfterMinutes: '15', graceMinutes: '30', escalate: false, escalationContactIds: [], consent: false, active: true });

export default function CheckInsPage() {
  const { t, e, tag } = useI18n();
  const { fmt, me } = useSession();
  const qc = useQueryClient();
  const toast = useToast();
  const confirm = useConfirm();
  const [tab, setTab] = useState<Tab>('mine');
  const schedules = useQuery({ queryKey: ['checkins', 'schedules'], queryFn: () => api.get<CheckInSchedule[]>('/v1/check-ins/schedules') });
  const events = useQuery({ queryKey: ['checkins', 'events'], queryFn: () => api.get<CheckInEvent[]>('/v1/check-ins/events') });
  const people = useQuery({ queryKey: ['checkins', 'people'], queryFn: () => api.get<CheckInPerson[]>('/v1/check-ins/people') });
  const alertGrants = useQuery({ queryKey: ['grants', 'live'], queryFn: () => api.get<Grant[]>('/v1/grants', { direction: 'all' }) });
  const alertContacts = (alertGrants.data ?? []).filter((g) => g.direction === 'given' && g.scope === 'checkins.alerts');
  const [form, setForm] = useState<ScheduleForm | null>(null);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['checkins'] });
    qc.invalidateQueries({ queryKey: ['dashboard'] });
  };
  const now = useAction(() => api.post<{ status: string; message?: string }>('/v1/check-ins/now', {}), {
    onSuccess: (r) => {
      toast(r.status === 'no_open_check_in' ? t('checkins.nothingOpen') : t('dashboard.checkedIn'));
      refresh();
    },
  });
  const remove = useAction((id: string) => api.del(`/v1/check-ins/schedules/${id}`), { onSuccess: refresh });
  const toggle = useAction((s: CheckInSchedule) => api.patch(`/v1/check-ins/schedules/${s.id}`, { active: !s.active }), { onSuccess: refresh });
  const weekday = (d: number) => new Intl.DateTimeFormat(tag, { weekday: 'short' }).format(new Date(2026, 0, 4 + d));
  const describe = (s: CheckInSchedule) =>
    s.kind === 'daily'
      ? `${e('checkInKind', 'daily')} · ${s.timeLocal}`
      : s.kind === 'weekly'
        ? `${(s.daysOfWeek ?? []).map(weekday).join(', ')} · ${s.timeLocal}`
        : `${e('checkInKind', s.kind)} · ${fmt.dateTime(s.oneOffAt)}`;
  const openToday = (events.data ?? []).filter((ev) => ['pending', 'reminded', 'missed', 'escalated'].includes(ev.state) && new Date(ev.dueAt).getTime() < Date.now() + 2 * 3600_000);

  return (
    <div className="max-w-3xl">
      <PageHeader title={t('nav.checkins')} description={t('checkins.intro')} />
      <Tabs<Tab>
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'mine', label: t('checkins.mine') },
          { value: 'people', label: t('dashboard.peopleICheckOn'), count: people.data?.filter((p) => p.latest && ['missed', 'escalated'].includes(p.latest.state)).length },
        ]}
      />

      {tab === 'mine' && (
        <div className="space-y-5">
          <Card className="overflow-hidden">
            <div className="flex flex-col items-center gap-4 bg-ok-soft px-5 py-8 text-center">
              <HeartPulse className="size-10 text-ok" />
              <p className="max-w-md text-ink-2">{openToday.length ? t('checkins.openPrompt') : t('checkins.anytime')}</p>
              <Button size="xl" className="min-w-[16rem] bg-ok hover:bg-ok/90" icon={<Check className="size-6" />} loading={now.isPending} onClick={() => now.mutate()}>
                {t('dashboard.checkInNow')}
              </Button>
            </div>
          </Card>

          <Card>
            <CardHeader
              title={t('checkins.schedules')}
              action={
                <Button size="sm" icon={<Plus className="size-4" />} onClick={() => setForm(blank())}>
                  {t('checkins.newSchedule')}
                </Button>
              }
            />
            <CardBody>
              {schedules.isLoading && <LoadingBlock rows={2} />}
              <ErrorNotice error={schedules.error} />
              {schedules.data?.length === 0 && <p className="text-sm text-muted">{t('checkins.noSchedules')}</p>}
              <ul className="divide-y divide-line">
                {schedules.data?.map((s) => (
                  <li key={s.id} className="flex flex-wrap items-center gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <div className={cx('font-medium', !s.active && 'text-muted')}>{s.label}</div>
                      <div className="text-sm text-muted">{describe(s)}</div>
                      {s.escalate && s.escalationContacts.length > 0 && (
                        <div className="mt-1 flex flex-wrap items-center gap-1 text-xs">
                          <BellRing className="size-3.5 text-accent" />
                          {t('checkins.alerts', { names: s.escalationContacts.map((c) => c.displayName).join(', '), mins: s.reminderAfterMinutes + s.graceMinutes })}
                        </div>
                      )}
                      {s.active && s.nextDueAt && <div className="mt-0.5 text-xs text-muted">{t('checkins.next', { when: fmt.dateTime(s.nextDueAt) })}</div>}
                    </div>
                    <Switch label={<span className="sr-only">{t('inventory.active')}</span>} checked={s.active} onChange={() => toggle.mutate(s)} />
                    <IconButton
                      label={t('common.edit')}
                      onClick={() =>
                        setForm({
                          id: s.id,
                          label: s.label,
                          kind: s.kind,
                          timeLocal: s.timeLocal ?? '09:00',
                          daysOfWeek: (s.daysOfWeek ?? []).map(String),
                          oneOffAt: isoToLocalInput(s.oneOffAt),
                          reminderAfterMinutes: String(s.reminderAfterMinutes),
                          graceMinutes: String(s.graceMinutes),
                          escalate: s.escalate,
                          escalationContactIds: s.escalationContacts.map((c) => c.userId),
                          consent: s.escalate,
                          active: s.active,
                        })
                      }
                    >
                      <Pencil className="size-4" />
                    </IconButton>
                    <IconButton label={t('common.delete')} onClick={async () => { if (await confirm({ title: t('checkins.deleteSchedule'), body: s.label, danger: true })) remove.mutate(s.id); }}>
                      <Trash2 className="size-4" />
                    </IconButton>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title={t('checkins.recent')} />
            <CardBody>
              {events.data?.length === 0 && <p className="text-sm text-muted">{t('common.emptyList')}</p>}
              <ul className="divide-y divide-line">
                {events.data?.slice(0, 20).map((ev) => (
                  <li key={ev.id}>
                    <Link href={`/check-ins/events/${ev.id}`} className="flex items-center gap-3 py-2.5 hover:text-brand">
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium">{ev.label}</span>
                        <span className="text-sm text-muted">{fmt.dateTime(ev.dueAt)}</span>
                      </span>
                      <StatusBadge group="checkInState" value={ev.state} />
                    </Link>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        </div>
      )}

      {tab === 'people' && (
        <div className="space-y-3">
          {people.isLoading && <LoadingBlock />}
          {people.data?.length === 0 && <EmptyState icon={<HeartPulse className="size-6" />} title={t('checkins.noPeople')} body={t('checkins.noPeopleBody')} />}
          {people.data?.map((p) => {
            const st = p.latest?.state;
            const alarm = st === 'missed' || st === 'escalated';
            return (
              <Card key={p.userId} className={alarm ? 'border-danger/50' : undefined}>
                <CardBody className="flex flex-wrap items-center gap-3 pt-4">
                  <Avatar name={p.displayName} />
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold">{p.displayName}</div>
                    <div className="text-sm text-muted">
                      {p.latest ? t('checkins.lastDue', { when: fmt.dateTime(p.latest.dueAt) }) : t('checkins.noneYet')}
                      {p.receivesAlerts && <Badge className="ms-2" tone="accent">{t('checkins.youGetAlerts')}</Badge>}
                    </div>
                  </div>
                  {st && <StatusBadge group="checkInState" value={st} />}
                  {p.latest && (
                    <ButtonLink href={`/check-ins/events/${p.latest.id}`} size="sm" variant={alarm ? 'danger' : 'secondary'}>
                      {alarm ? t('checkins.followUp') : t('common.view')}
                    </ButtonLink>
                  )}
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}

      {form && (
        <FormDialog
          open
          onClose={() => setForm(null)}
          title={form.id ? t('common.edit') : t('checkins.newSchedule')}
          size="lg"
          disabled={!form.label.trim() || (form.escalate && (!form.consent || form.escalationContactIds.length === 0)) || (['daily', 'weekly'].includes(form.kind) ? !form.timeLocal : !form.oneOffAt)}
          onSubmit={async () => {
            const recurring = form.kind === 'daily' || form.kind === 'weekly';
            const body = {
              label: form.label.trim(),
              kind: form.kind,
              timeLocal: recurring ? form.timeLocal : undefined,
              daysOfWeek: form.kind === 'weekly' ? form.daysOfWeek.map(Number) : undefined,
              oneOffAt: recurring ? undefined : localInputToIso(form.oneOffAt),
              timezone: me.profile.timezone,
              reminderAfterMinutes: Number(form.reminderAfterMinutes),
              graceMinutes: Number(form.graceMinutes),
              escalate: form.escalate,
              escalationContactIds: form.escalate ? form.escalationContactIds : [],
              consentToAlertContacts: form.escalate ? form.consent : undefined,
              active: form.active,
            };
            if (form.id) await api.patch(`/v1/check-ins/schedules/${form.id}`, body);
            else await api.post('/v1/check-ins/schedules', body);
            refresh();
          }}
        >
          <Input label={t('common.name')} placeholder={t('checkins.labelPlaceholder')} value={form.label} onChange={(ev) => setForm({ ...form, label: ev.target.value })} maxLength={80} autoFocus />
          <Select label={t('checkins.how')} value={form.kind} onChange={(ev) => setForm({ ...form, kind: ev.target.value as CheckInKind })} options={KINDS.map((k) => ({ value: k, label: e('checkInKind', k) }))} />
          {form.kind === 'daily' || form.kind === 'weekly' ? (
            <Input type="time" label={t('common.time')} value={form.timeLocal} onChange={(ev) => setForm({ ...form, timeLocal: ev.target.value })} fieldClassName="max-w-[12rem]" />
          ) : (
            <Input type="datetime-local" label={t('common.when')} value={form.oneOffAt} onChange={(ev) => setForm({ ...form, oneOffAt: ev.target.value })} />
          )}
          {form.kind === 'weekly' && (
            <div className="flex flex-wrap gap-2" role="group" aria-label={t('checkins.days')}>
              {[1, 2, 3, 4, 5, 6, 0].map((d) => {
                const on = form.daysOfWeek.includes(String(d));
                return (
                  <button key={d} type="button" aria-pressed={on} onClick={() => setForm({ ...form, daysOfWeek: on ? form.daysOfWeek.filter((x) => x !== String(d)) : [...form.daysOfWeek, String(d)] })} className={cx('rounded-lg border px-3 py-1.5 text-sm font-semibold', on ? 'border-brand bg-brand text-brand-ink' : 'border-line-strong')}>
                    {weekday(d)}
                  </button>
                );
              })}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Input type="number" min={5} max={240} label={t('checkins.remindAfter')} value={form.reminderAfterMinutes} onChange={(ev) => setForm({ ...form, reminderAfterMinutes: ev.target.value })} />
            <Input type="number" min={5} max={720} label={t('checkins.grace')} value={form.graceMinutes} onChange={(ev) => setForm({ ...form, graceMinutes: ev.target.value })} />
          </div>
          <div className="space-y-3 rounded-xl bg-surface-2 p-4">
            <Switch label={t('checkins.escalate')} hint={t('checkins.escalateHint')} checked={form.escalate} onChange={(v) => setForm({ ...form, escalate: v })} />
            {form.escalate &&
              (alertContacts.length === 0 ? (
                <Notice tone="warn" action={<Link href="/sharing" className="font-semibold underline">{t('nav.sharing')}</Link>}>
                  {t('checkins.needAlertGrant')}
                </Notice>
              ) : (
                <>
                  <CheckboxGroup label={t('checkins.whoToAlert')} options={alertContacts.map((g) => ({ value: g.granteeId, label: g.granteeName, hint: g.status === 'pending_cooloff' ? t('sharing.startsAt', { when: fmt.dateTime(g.effectiveAt) }) : undefined }))} value={form.escalationContactIds} onChange={(v) => setForm({ ...form, escalationContactIds: v.slice(0, 5) })} />
                  <Checkbox label={t('checkins.consent')} checked={form.consent} onChange={(v) => setForm({ ...form, consent: v })} />
                </>
              ))}
          </div>
        </FormDialog>
      )}
    </div>
  );
}
