'use client';

import { useState } from 'react';
import type { Task } from '@/lib/types';
import { isoToLocalInput, localInputToIso } from '@/lib/format';
import { useHouseholds, usePeople, useTaskCategories } from '@/lib/data';
import { useI18n } from '@/i18n';
import { Checkbox, CheckboxGroup, Input, Select, Textarea } from './form';

export interface TaskFormValue {
  title: string;
  notes: string;
  priority: Task['priority'];
  dueAt: string; // datetime-local
  allDay: boolean;
  repeat: '' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'CUSTOM';
  rrule: string;
  categoryId: string;
  householdId: string;
  visibility: Task['visibility'];
  isChore: boolean;
  assigneeUserIds: string[];
  reminderMinutesBefore: string;
}

export function emptyTask(partial: Partial<TaskFormValue> = {}): TaskFormValue {
  return {
    title: '',
    notes: '',
    priority: 'normal',
    dueAt: '',
    allDay: false,
    repeat: '',
    rrule: '',
    categoryId: '',
    householdId: '',
    visibility: 'private',
    isChore: false,
    assigneeUserIds: [],
    reminderMinutesBefore: '',
    ...partial,
  };
}

export function taskToForm(t: Task): TaskFormValue {
  const rule = t.recurrenceRule ?? '';
  const simple = /^FREQ=(DAILY|WEEKLY|MONTHLY)$/.exec(rule)?.[1] as TaskFormValue['repeat'] | undefined;
  return emptyTask({
    title: t.title,
    notes: t.notes ?? '',
    priority: t.priority,
    dueAt: isoToLocalInput(t.dueAt),
    allDay: t.allDay,
    repeat: rule ? (simple ?? 'CUSTOM') : '',
    rrule: rule,
    categoryId: t.categoryId ?? '',
    householdId: t.householdId ?? '',
    visibility: t.visibility,
    isChore: t.isChore,
  });
}

export function rruleOf(v: TaskFormValue): string | null {
  if (!v.repeat) return null;
  if (v.repeat === 'CUSTOM') return v.rrule.trim() || null;
  return `FREQ=${v.repeat}`;
}

export function formToCreate(v: TaskFormValue) {
  return {
    title: v.title.trim(),
    notes: v.notes.trim() || undefined,
    priority: v.priority,
    dueAt: localInputToIso(v.dueAt),
    allDay: v.allDay,
    recurrenceRule: rruleOf(v) ?? undefined,
    categoryId: v.categoryId || undefined,
    householdId: v.householdId || undefined,
    visibility: v.householdId ? (v.visibility === 'private' ? 'household' : v.visibility) : v.visibility,
    isChore: v.householdId ? v.isChore : undefined,
    assigneeUserIds: v.assigneeUserIds.length ? v.assigneeUserIds : undefined,
    reminderMinutesBefore: v.reminderMinutesBefore && v.dueAt ? Number(v.reminderMinutesBefore) : undefined,
  };
}

export function formToUpdate(v: TaskFormValue) {
  return {
    title: v.title.trim(),
    notes: v.notes.trim() || null,
    priority: v.priority,
    dueAt: localInputToIso(v.dueAt) ?? null,
    allDay: v.allDay,
    recurrenceRule: rruleOf(v),
    categoryId: v.categoryId || null,
    visibility: v.visibility,
    isChore: v.isChore,
  };
}

export function TaskFields({ value, onChange, mode }: { value: TaskFormValue; onChange: (v: TaskFormValue) => void; mode: 'create' | 'edit' }) {
  const { t, e } = useI18n();
  const households = useHouseholds();
  const categories = useTaskCategories();
  const { others } = usePeople();
  const set = <K extends keyof TaskFormValue>(k: K, val: TaskFormValue[K]) => onChange({ ...value, [k]: val });
  const cats = (categories.data ?? []).filter((c) => (value.householdId ? c.householdId === value.householdId || !c.householdId : !c.householdId));
  const [more, setMore] = useState(mode === 'edit');

  return (
    <div className="space-y-4">
      <Input label={t('common.title')} value={value.title} onChange={(ev) => set('title', ev.target.value)} maxLength={200} autoFocus required placeholder={t('tasks.titlePlaceholder')} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input type="datetime-local" label={t('tasks.due')} optional value={value.dueAt} onChange={(ev) => set('dueAt', ev.target.value)} />
        <Select label={t('tasks.priority')} value={value.priority} onChange={(ev) => set('priority', ev.target.value as Task['priority'])} options={(['low', 'normal', 'high', 'urgent'] as const).map((p) => ({ value: p, label: e('taskPriority', p) }))} />
      </div>
      {mode === 'create' && (households.data?.length ?? 0) > 0 && (
        <Select
          label={t('tasks.belongsTo')}
          value={value.householdId}
          onChange={(ev) => onChange({ ...value, householdId: ev.target.value, visibility: ev.target.value ? 'household' : 'private', categoryId: '' })}
          options={[{ value: '', label: t('common.personal') }, ...(households.data ?? []).map((h) => ({ value: h.id, label: h.name }))]}
        />
      )}
      {!more ? (
        <button type="button" className="text-sm font-semibold text-brand" onClick={() => setMore(true)}>
          + {t('tasks.moreOptions')}
        </button>
      ) : (
        <div className="space-y-4 rounded-xl bg-surface-2 p-4">
          <Textarea label={t('common.notes')} optional value={value.notes} onChange={(ev) => set('notes', ev.target.value)} rows={3} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label={t('tasks.repeat')}
              value={value.repeat}
              onChange={(ev) => set('repeat', ev.target.value as TaskFormValue['repeat'])}
              options={[
                { value: '', label: t('tasks.repeatNone') },
                { value: 'DAILY', label: t('tasks.repeatDaily') },
                { value: 'WEEKLY', label: t('tasks.repeatWeekly') },
                { value: 'MONTHLY', label: t('tasks.repeatMonthly') },
                { value: 'CUSTOM', label: t('tasks.repeatCustom') },
              ]}
            />
            <Select label={t('common.category')} value={value.categoryId} onChange={(ev) => set('categoryId', ev.target.value)} placeholder={t('common.none')} options={cats.map((c) => ({ value: c.id, label: c.name }))} />
          </div>
          {value.repeat === 'CUSTOM' && <Input label={t('tasks.rrule')} hint={t('tasks.rruleHint')} value={value.rrule} onChange={(ev) => set('rrule', ev.target.value)} placeholder="FREQ=WEEKLY;BYDAY=MO,TH" />}
          {value.repeat && !value.dueAt && <p className="text-[0.82rem] font-medium text-warn">{t('tasks.repeatNeedsDue')}</p>}
          <Select
            label={t('tasks.visibility')}
            value={value.visibility}
            onChange={(ev) => set('visibility', ev.target.value as Task['visibility'])}
            options={(value.householdId ? (['household', 'shared'] as const) : (['private', 'shared'] as const)).map((v) => ({ value: v, label: e('taskVisibility', v) }))}
            hint={value.visibility === 'shared' ? t('tasks.sharedHint') : undefined}
          />
          {value.householdId && <Checkbox label={t('tasks.isChore')} checked={value.isChore} onChange={(c) => set('isChore', c)} />}
          <Checkbox label={t('tasks.allDay')} checked={value.allDay} onChange={(c) => set('allDay', c)} />
          {mode === 'create' && value.dueAt && (
            <Select
              label={t('tasks.remindMe')}
              value={value.reminderMinutesBefore}
              onChange={(ev) => set('reminderMinutesBefore', ev.target.value)}
              options={[
                { value: '', label: t('tasks.noReminder') },
                { value: '0', label: t('tasks.atTime') },
                { value: '15', label: t('tasks.minutesBefore', { n: 15 }) },
                { value: '60', label: t('tasks.hoursBefore', { n: 1 }) },
                { value: '1440', label: t('tasks.daysBefore', { n: 1 }) },
              ]}
            />
          )}
          {mode === 'create' && others.length > 0 && (
            <CheckboxGroup label={t('tasks.offerTo')} hint={t('tasks.offerToHint')} options={others.map((p) => ({ value: p.userId, label: p.displayName }))} value={value.assigneeUserIds} onChange={(v) => set('assigneeUserIds', v)} />
          )}
        </div>
      )}
    </div>
  );
}
