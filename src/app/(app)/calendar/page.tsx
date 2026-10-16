'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, MapPin, Plus, Repeat, Users } from 'lucide-react';
import { api } from '@/lib/api';
import { useAction } from '@/lib/hooks';
import { useHouseholds, usePeople } from '@/lib/data';
import { isoToLocalInput, localInputToIso } from '@/lib/format';
import { useSession } from '@/lib/session';
import type { CalendarEvent, EventKind, Visibility } from '@/lib/types';
import { useI18n } from '@/i18n';
import { Badge, Button, cx, ErrorNotice, KeyValue, LoadingBlock, PageHeader } from '@/components/ui';
import { Checkbox, CheckboxGroup, Input, Segmented, Select, Textarea } from '@/components/form';
import { Dialog, FormDialog, useConfirm } from '@/components/dialog';
import { StatusBadge } from '@/components/status';

const KINDS: EventKind[] = ['appointment', 'visit', 'errand', 'activity', 'other'];
const KIND_COLOR: Record<EventKind, string> = {
  appointment: 'bg-info-soft text-info border-info/30',
  visit: 'bg-accent-soft text-accent border-accent/30',
  errand: 'bg-warn-soft text-warn border-warn/30',
  activity: 'bg-ok-soft text-ok border-ok/30',
  other: 'bg-bg-2 text-ink-2 border-line',
};

interface EventForm {
  title: string;
  kind: EventKind;
  startsAt: string;
  endsAt: string;
  allDay: boolean;
  locationText: string;
  description: string;
  repeat: string;
  householdId: string;
  visibility: Visibility;
  attendeeUserIds: string[];
  visitForUserId: string;
  reminderMinutesBefore: string;
}

const blank = (start?: Date): EventForm => {
  const s = start ?? new Date(Math.ceil(Date.now() / 3600_000) * 3600_000);
  return {
    title: '',
    kind: 'appointment',
    startsAt: isoToLocalInput(s.toISOString()),
    endsAt: isoToLocalInput(new Date(s.getTime() + 3600_000).toISOString()),
    allDay: false,
    locationText: '',
    description: '',
    repeat: '',
    householdId: '',
    visibility: 'private',
    attendeeUserIds: [],
    visitForUserId: '',
    reminderMinutesBefore: '',
  };
};

function monthRange(cursor: Date) {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - ((first.getDay() + 6) % 7)); // Monday start
  const gridEnd = new Date(gridStart);
  gridEnd.setDate(gridStart.getDate() + 42);
  return { first, gridStart, gridEnd };
}

const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

export default function CalendarPage() {
  const { t, e, tag } = useI18n();
  const { fmt, me } = useSession();
  const qc = useQueryClient();
  const [cursor, setCursor] = useState(() => new Date());
  const [view, setView] = useState<'month' | 'agenda'>('month');
  const { gridStart, gridEnd, first } = monthRange(cursor);
  const q = useQuery({
    queryKey: ['calendar', gridStart.toISOString()],
    queryFn: () => api.get<{ items: CalendarEvent[] }>('/v1/calendar/events', { from: gridStart.toISOString(), to: gridEnd.toISOString() }),
  });
  const [form, setForm] = useState<EventForm | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selected, setSelected] = useState<CalendarEvent | null>(null);

  const byDay = useMemo(() => {
    const m = new Map<string, CalendarEvent[]>();
    for (const ev of q.data?.items ?? []) {
      const k = dayKey(new Date(ev.occurrenceStart ?? ev.startsAt));
      m.set(k, [...(m.get(k) ?? []), ev]);
    }
    return m;
  }, [q.data]);

  const days = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    return d;
  });
  const weekdays = days.slice(0, 7).map((d) => new Intl.DateTimeFormat(tag, { weekday: 'short' }).format(d));
  const today = dayKey(new Date());
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['calendar'] });
    qc.invalidateQueries({ queryKey: ['dashboard'] });
  };
  const upcoming = (q.data?.items ?? []).filter((ev) => new Date(ev.occurrenceEnd ?? ev.occurrenceStart ?? ev.startsAt) >= new Date(new Date().setHours(0, 0, 0, 0)));

  return (
    <div>
      <PageHeader
        title={t('nav.calendar')}
        actions={
          <Button
            icon={<Plus className="size-4" />}
            onClick={() => {
              setEditingId(null);
              setForm(blank());
            }}
          >
            {t('calendar.new')}
          </Button>
        }
      />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} aria-label={t('common.back')}>
            <ChevronLeft className="size-4" />
          </Button>
          <h2 className="min-w-[10rem] text-center text-lg font-semibold">{new Intl.DateTimeFormat(tag, { month: 'long', year: 'numeric' }).format(first)}</h2>
          <Button variant="secondary" size="sm" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} aria-label={t('common.next')}>
            <ChevronRight className="size-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setCursor(new Date())}>
            {t('common.today')}
          </Button>
        </div>
        <Segmented
          value={view}
          onChange={setView}
          options={[
            { value: 'month', label: t('calendar.month') },
            { value: 'agenda', label: t('calendar.agenda') },
          ]}
        />
      </div>
      <ErrorNotice error={q.error} onRetry={q.refetch} />
      {q.isLoading && <LoadingBlock />}

      {view === 'month' ? (
        <div className="card overflow-hidden">
          <div className="grid grid-cols-7 border-b border-line bg-surface-2 text-center text-xs font-semibold uppercase tracking-wide text-muted">
            {weekdays.map((w) => (
              <div key={w} className="py-2">
                {w}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {days.map((d) => {
              const k = dayKey(d);
              const evs = byDay.get(k) ?? [];
              const inMonth = d.getMonth() === first.getMonth();
              return (
                <button
                  type="button"
                  key={k}
                  onClick={() => {
                    const s = new Date(d);
                    s.setHours(10, 0, 0, 0);
                    setEditingId(null);
                    setForm(blank(s));
                  }}
                  className={cx('flex min-h-[5.5rem] flex-col items-stretch justify-start border-r border-b border-line p-1.5 text-left transition-colors hover:bg-surface-2 sm:min-h-[7rem]', !inMonth && 'bg-bg/60 text-muted')}
                >
                  <span className={cx('inline-flex size-7 items-center justify-center rounded-full text-sm font-semibold', k === today && 'bg-brand text-brand-ink')}>{d.getDate()}</span>
                  <div className="mt-1 space-y-1">
                    {evs.slice(0, 3).map((ev) => (
                      <span
                        key={`${ev.id}-${ev.occurrenceStart}`}
                        role="button"
                        tabIndex={0}
                        onClick={(x) => {
                          x.stopPropagation();
                          setSelected(ev);
                        }}
                        onKeyDown={(x) => {
                          if (x.key === 'Enter') {
                            x.stopPropagation();
                            setSelected(ev);
                          }
                        }}
                        className={cx('block truncate rounded-md border px-1.5 py-0.5 text-[0.72rem] font-semibold', KIND_COLOR[ev.kind], ev.cancelledAt && 'line-through opacity-60')}
                      >
                        {!ev.allDay && <span className="hidden font-normal sm:inline">{fmt.time(ev.occurrenceStart ?? ev.startsAt)} </span>}
                        {ev.title}
                      </span>
                    ))}
                    {evs.length > 3 && <span className="block text-[0.7rem] text-muted">+{evs.length - 3}</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <ul className="space-y-2">
          {upcoming.length === 0 && <li className="rounded-xl bg-surface-2 px-4 py-8 text-center text-muted">{t('calendar.empty')}</li>}
          {upcoming.map((ev) => (
            <li key={`${ev.id}-${ev.occurrenceStart}`}>
              <button type="button" onClick={() => setSelected(ev)} className="card flex w-full items-center gap-4 px-4 py-3 text-left hover:border-line-strong">
                <div className="w-20 shrink-0 text-center">
                  <div className="text-xs font-semibold uppercase text-accent">{fmt.date(ev.occurrenceStart ?? ev.startsAt, { weekday: 'short' })}</div>
                  <div className="text-2xl font-bold">{fmt.date(ev.occurrenceStart ?? ev.startsAt, { day: 'numeric' })}</div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{ev.title}</div>
                  <div className="text-sm text-muted">
                    {ev.allDay ? t('calendar.allDay') : fmt.time(ev.occurrenceStart ?? ev.startsAt)} · {e('eventKind', ev.kind)}
                    {ev.locationText && ` · ${ev.locationText}`}
                  </div>
                </div>
                {ev.recurrenceRule && <Repeat className="size-4 text-muted" />}
              </button>
            </li>
          ))}
        </ul>
      )}

      {selected && (
        <EventDetail
          event={selected}
          meId={me.id}
          onClose={() => setSelected(null)}
          onEdit={(ev) => {
            setSelected(null);
            setEditingId(ev.id);
            setForm({
              title: ev.title,
              kind: ev.kind,
              startsAt: isoToLocalInput(ev.startsAt),
              endsAt: isoToLocalInput(ev.endsAt),
              allDay: ev.allDay,
              locationText: ev.locationText ?? '',
              description: ev.description ?? '',
              repeat: ev.recurrenceRule ?? '',
              householdId: ev.householdId ?? '',
              visibility: ev.visibility,
              attendeeUserIds: (ev.attendees ?? []).map((a) => a.userId),
              visitForUserId: ev.visitForUserId ?? '',
              reminderMinutesBefore: '',
            });
          }}
          onChanged={refresh}
        />
      )}
      {form && <EventFormDialog form={form} setForm={setForm} editingId={editingId} onClose={() => setForm(null)} onSaved={refresh} />}
    </div>
  );
}

function EventFormDialog({ form, setForm, editingId, onClose, onSaved }: { form: EventForm; setForm: (f: EventForm) => void; editingId: string | null; onClose: () => void; onSaved: () => void }) {
  const { t, e } = useI18n();
  const households = useHouseholds();
  const { others, people } = usePeople();
  const set = <K extends keyof EventForm>(k: K, v: EventForm[K]) => setForm({ ...form, [k]: v });
  return (
    <FormDialog
      open
      onClose={onClose}
      title={editingId ? t('calendar.edit') : t('calendar.new')}
      disabled={!form.title.trim() || !form.startsAt}
      onSubmit={async () => {
        const body = {
          title: form.title.trim(),
          kind: form.kind,
          startsAt: localInputToIso(form.startsAt),
          endsAt: localInputToIso(form.endsAt),
          allDay: form.allDay,
          locationText: form.locationText.trim() || undefined,
          description: form.description.trim() || undefined,
          recurrenceRule: form.repeat || undefined,
          householdId: form.householdId || undefined,
          visibility: form.visibility,
          attendeeUserIds: form.attendeeUserIds,
          visitForUserId: form.kind === 'visit' && form.visitForUserId ? form.visitForUserId : undefined,
          reminderMinutesBefore: form.reminderMinutesBefore ? Number(form.reminderMinutesBefore) : undefined,
        };
        if (editingId) await api.patch(`/v1/calendar/events/${editingId}`, body);
        else await api.post('/v1/calendar/events', body);
        onSaved();
      }}
    >
      <Input label={t('common.title')} value={form.title} onChange={(ev) => set('title', ev.target.value)} autoFocus maxLength={200} />
      <Select label={t('common.type')} value={form.kind} onChange={(ev) => set('kind', ev.target.value as EventKind)} options={KINDS.map((k) => ({ value: k, label: e('eventKind', k) }))} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input type="datetime-local" label={t('calendar.starts')} value={form.startsAt} onChange={(ev) => set('startsAt', ev.target.value)} />
        <Input type="datetime-local" label={t('calendar.ends')} optional value={form.endsAt} onChange={(ev) => set('endsAt', ev.target.value)} />
      </div>
      <Checkbox label={t('calendar.allDay')} checked={form.allDay} onChange={(v) => set('allDay', v)} />
      <Input label={t('common.where')} optional hint={t('calendar.whereHint')} value={form.locationText} onChange={(ev) => set('locationText', ev.target.value)} maxLength={200} />
      <Textarea label={t('common.notes')} optional value={form.description} onChange={(ev) => set('description', ev.target.value)} />
      <Select
        label={t('tasks.repeat')}
        value={form.repeat}
        onChange={(ev) => set('repeat', ev.target.value)}
        options={[
          { value: '', label: t('tasks.repeatNone') },
          { value: 'FREQ=DAILY', label: t('tasks.repeatDaily') },
          { value: 'FREQ=WEEKLY', label: t('tasks.repeatWeekly') },
          { value: 'FREQ=MONTHLY', label: t('tasks.repeatMonthly') },
          ...(form.repeat && !['FREQ=DAILY', 'FREQ=WEEKLY', 'FREQ=MONTHLY'].includes(form.repeat) ? [{ value: form.repeat, label: form.repeat }] : []),
        ]}
      />
      {(households.data?.length ?? 0) > 0 && (
        <Select
          label={t('tasks.belongsTo')}
          value={form.householdId}
          onChange={(ev) => setForm({ ...form, householdId: ev.target.value, visibility: ev.target.value ? 'household' : 'private' })}
          options={[{ value: '', label: t('common.personal') }, ...(households.data ?? []).map((h) => ({ value: h.id, label: h.name }))]}
        />
      )}
      <Select
        label={t('tasks.visibility')}
        value={form.visibility}
        onChange={(ev) => set('visibility', ev.target.value as Visibility)}
        options={(form.householdId ? (['household', 'shared'] as const) : (['private', 'shared'] as const)).map((v) => ({ value: v, label: e('taskVisibility', v) }))}
        hint={form.visibility === 'shared' ? t('calendar.sharedHint') : undefined}
      />
      {form.kind === 'visit' && (
        <Select label={t('calendar.visitFor')} value={form.visitForUserId} onChange={(ev) => set('visitForUserId', ev.target.value)} placeholder={t('common.none')} options={people.map((p) => ({ value: p.userId, label: p.displayName }))} />
      )}
      {others.length > 0 && (
        <CheckboxGroup label={t('calendar.invite')} options={others.map((p) => ({ value: p.userId, label: p.displayName }))} value={form.attendeeUserIds} onChange={(v) => set('attendeeUserIds', v)} />
      )}
      {!editingId && (
        <Select
          label={t('tasks.remindMe')}
          value={form.reminderMinutesBefore}
          onChange={(ev) => set('reminderMinutesBefore', ev.target.value)}
          options={[
            { value: '', label: t('tasks.noReminder') },
            { value: '15', label: t('tasks.minutesBefore', { n: 15 }) },
            { value: '60', label: t('tasks.hoursBefore', { n: 1 }) },
            { value: '1440', label: t('tasks.daysBefore', { n: 1 }) },
          ]}
        />
      )}
    </FormDialog>
  );
}

function EventDetail({ event, meId, onClose, onEdit, onChanged }: { event: CalendarEvent; meId: string; onClose: () => void; onEdit: (e: CalendarEvent) => void; onChanged: () => void }) {
  const { t, e } = useI18n();
  const { fmt } = useSession();
  const confirm = useConfirm();
  const { nameOf } = usePeople();
  const q = useQuery({ queryKey: ['calendar-event', event.id], queryFn: () => api.get<CalendarEvent>(`/v1/calendar/events/${event.id}`) });
  const ev = q.data ?? event;
  const mine = ev.attendees?.find((a) => a.userId === meId);
  const after = () => {
    q.refetch();
    onChanged();
  };
  const rsvp = useAction((status: 'accepted' | 'declined' | 'tentative') => api.post(`/v1/calendar/events/${event.id}/rsvp`, { status }), { onSuccess: after });
  const cancel = useAction(() => api.post(`/v1/calendar/events/${event.id}/cancel`), { onSuccess: after });
  const start = ev.occurrenceStart ?? event.occurrenceStart ?? ev.startsAt;
  return (
    <Dialog
      open
      onClose={onClose}
      title={ev.title}
      description={e('eventKind', ev.kind)}
      footer={
        ev.canEdit ? (
          <>
            <Button
              variant="ghost"
              className="text-danger"
              onClick={async () => {
                if (!(await confirm({ title: t('calendar.delete'), body: ev.title, danger: true }))) return;
                await api.del(`/v1/calendar/events/${ev.id}`);
                onChanged();
                onClose();
              }}
            >
              {t('common.delete')}
            </Button>
            {!ev.cancelledAt && (
              <Button variant="secondary" onClick={() => cancel.mutate()} loading={cancel.isPending}>
                {t('calendar.cancelEvent')}
              </Button>
            )}
            <Button onClick={() => onEdit(ev)}>{t('common.edit')}</Button>
          </>
        ) : undefined
      }
    >
      <div className="space-y-4">
        {ev.cancelledAt && <Badge tone="danger">{t('calendar.cancelled')}</Badge>}
        <KeyValue
          items={[
            { label: t('common.when'), value: ev.allDay ? fmt.date(start) : `${fmt.dateTime(start)}${ev.occurrenceEnd ?? ev.endsAt ? ` – ${fmt.time(ev.occurrenceEnd ?? ev.endsAt)}` : ''}` },
            { label: t('common.where'), value: ev.locationText && <span className="inline-flex items-center gap-1"><MapPin className="size-4" /> {ev.locationText}</span> },
            { label: t('tasks.repeat'), value: ev.recurrenceRule },
            { label: t('tasks.visibility'), value: e('taskVisibility', ev.visibility) },
            { label: t('calendar.visitFor'), value: nameOf(ev.visitForUserId) },
          ]}
        />
        {ev.description && <p className="whitespace-pre-wrap text-ink-2">{ev.description}</p>}
        {(ev.attendees?.length ?? 0) > 0 && (
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <Users className="size-4" /> {t('calendar.attendees')}
            </div>
            <ul className="space-y-1.5">
              {ev.attendees!.map((a) => (
                <li key={a.userId} className="flex items-center justify-between rounded-lg bg-surface-2 px-3 py-2">
                  <span>{a.userId === meId ? t('common.you') : a.displayName}</span>
                  <StatusBadge group="attendeeStatus" value={a.status} />
                </li>
              ))}
            </ul>
          </div>
        )}
        {mine && !ev.cancelledAt && (
          <div className="flex flex-wrap gap-2 border-t border-line pt-4">
            {(['accepted', 'tentative', 'declined'] as const).map((s) => (
              <Button key={s} size="sm" variant={mine.status === s ? 'primary' : 'secondary'} onClick={() => rsvp.mutate(s)}>
                {e('attendeeStatus', s)}
              </Button>
            ))}
          </div>
        )}
      </div>
    </Dialog>
  );
}
