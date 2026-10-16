'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { isoToLocalInput, localInputToIso } from '@/lib/format';
import type { Reminder } from '@/lib/types';
import { useI18n } from '@/i18n';
import { FormDialog } from './dialog';
import { CheckboxGroup, Input } from './form';

const CHANNELS = ['in_app', 'push', 'sms', 'email'] as const;

export function ReminderDialog({
  open,
  onClose,
  reminder,
  taskId,
  eventId,
  defaultTitle,
  defaultAt,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  reminder?: Reminder | null;
  taskId?: string;
  eventId?: string;
  defaultTitle?: string;
  defaultAt?: string | null;
  onSaved: () => void;
}) {
  const { t, e } = useI18n();
  const [title, setTitle] = useState('');
  const [at, setAt] = useState('');
  const [channels, setChannels] = useState<string[]>(['in_app', 'push']);
  useEffect(() => {
    if (!open) return;
    setTitle(reminder?.title ?? defaultTitle ?? '');
    setAt(isoToLocalInput(reminder?.fireAt ?? defaultAt ?? new Date(Date.now() + 3600_000).toISOString()));
    setChannels(reminder?.channels ?? ['in_app', 'push']);
  }, [open, reminder, defaultTitle, defaultAt]);
  return (
    <FormDialog
      open={open}
      onClose={onClose}
      title={reminder ? t('reminders.edit') : t('reminders.new')}
      disabled={!title.trim() || !at || channels.length === 0}
      onSubmit={async () => {
        const body = { title: title.trim(), fireAt: localInputToIso(at), channels };
        if (reminder) await api.patch(`/v1/reminders/${reminder.id}`, body);
        else await api.post('/v1/reminders', { ...body, taskId, eventId });
        onSaved();
      }}
    >
      <Input label={t('common.title')} value={title} onChange={(ev) => setTitle(ev.target.value)} maxLength={200} autoFocus />
      <Input type="datetime-local" label={t('common.when')} value={at} onChange={(ev) => setAt(ev.target.value)} />
      <CheckboxGroup label={t('reminders.channels')} hint={t('reminders.channelsHint')} options={CHANNELS.map((c) => ({ value: c, label: e('channel', c) }))} value={channels} onChange={setChannels} />
    </FormDialog>
  );
}
