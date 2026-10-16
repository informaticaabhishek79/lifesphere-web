'use client';

import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { AlarmClock, Pencil, Plus, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useAction, usePaged } from '@/lib/hooks';
import { useSession } from '@/lib/session';
import type { Reminder } from '@/lib/types';
import { useI18n } from '@/i18n';
import { Badge, Button, EmptyState, ErrorNotice, IconButton, LoadingBlock, LoadMore, PageHeader, Tabs } from '@/components/ui';
import { useConfirm } from '@/components/dialog';
import { StatusBadge } from '@/components/status';
import { ReminderDialog } from '@/components/reminder-dialog';

type Tab = 'scheduled' | 'sent' | 'failed' | 'cancelled';

function Inner() {
  const { t, e } = useI18n();
  const { fmt } = useSession();
  const params = useSearchParams();
  const router = useRouter();
  const qc = useQueryClient();
  const confirm = useConfirm();
  const [tab, setTab] = useState<Tab>('scheduled');
  const [open, setOpen] = useState(params.get('new') === '1');
  const [editing, setEditing] = useState<Reminder | null>(null);
  const list = usePaged<Reminder>(['reminders'], '/v1/reminders', { status: tab });
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['reminders'] });
    qc.invalidateQueries({ queryKey: ['dashboard'] });
  };
  const remove = useAction((id: string) => api.del(`/v1/reminders/${id}`), { onSuccess: refresh });

  return (
    <div className="max-w-3xl">
      <PageHeader
        title={t('nav.reminders')}
        description={t('reminders.intro')}
        actions={
          <Button
            icon={<Plus className="size-4" />}
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            {t('reminders.new')}
          </Button>
        }
      />
      <Tabs<Tab> value={tab} onChange={setTab} tabs={(['scheduled', 'sent', 'failed', 'cancelled'] as Tab[]).map((s) => ({ value: s, label: e('reminderStatus', s) }))} />
      {list.isLoading && <LoadingBlock />}
      <ErrorNotice error={list.error} onRetry={list.refetch} />
      {!list.isLoading && list.items.length === 0 && <EmptyState icon={<AlarmClock className="size-6" />} title={t('dashboard.noReminders')} />}
      <ul className="space-y-2">
        {list.items.map((r) => (
          <li key={r.id} className="card flex items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <div className="font-medium">{r.title}</div>
              <div className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-muted">
                {fmt.relativeDay(r.fireAt, { today: t('common.today'), tomorrow: t('common.tomorrow'), yesterday: t('common.yesterday') })} · {fmt.time(r.fireAt)}
                {r.channels.map((c) => (
                  <Badge key={c}>{e('channel', c)}</Badge>
                ))}
                {r.taskId && (
                  <Link href={`/tasks/${r.taskId}`} className="font-semibold text-brand">
                    {t('reminders.openTask')}
                  </Link>
                )}
              </div>
              {r.lastError && <div className="mt-1 text-xs text-danger">{r.lastError}</div>}
            </div>
            <StatusBadge group="reminderStatus" value={r.status} />
            {r.status === 'scheduled' && (
              <IconButton
                label={t('common.edit')}
                onClick={() => {
                  setEditing(r);
                  setOpen(true);
                }}
              >
                <Pencil className="size-4" />
              </IconButton>
            )}
            <IconButton
              label={t('common.delete')}
              onClick={async () => {
                if (await confirm({ title: t('reminders.delete'), body: r.title, danger: true })) remove.mutate(r.id);
              }}
            >
              <Trash2 className="size-4" />
            </IconButton>
          </li>
        ))}
      </ul>
      <LoadMore hasMore={list.hasMore} loading={list.loadingMore} onClick={list.loadMore} />
      <ReminderDialog
        open={open}
        reminder={editing}
        defaultTitle={params.get('title') ?? undefined}
        onClose={() => {
          setOpen(false);
          if (params.get('new')) router.replace('/reminders');
        }}
        onSaved={refresh}
      />
    </div>
  );
}

export default function RemindersPage() {
  return (
    <Suspense>
      <Inner />
    </Suspense>
  );
}
