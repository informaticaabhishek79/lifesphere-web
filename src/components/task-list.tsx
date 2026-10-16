'use client';

import Link from 'next/link';
import { Repeat } from 'lucide-react';
import { api } from '@/lib/api';
import { useAction } from '@/lib/hooks';
import { useHouseholds } from '@/lib/data';
import { useSession } from '@/lib/session';
import type { Task, TaskCategory } from '@/lib/types';
import { useI18n } from '@/i18n';
import { Badge, cx } from './ui';
import { PriorityBadge } from './status';
import { useToast } from './dialog';

export function TaskList({ tasks, categories, onChanged }: { tasks: Task[]; categories: TaskCategory[]; onChanged: () => void }) {
  const { t } = useI18n();
  const { fmt } = useSession();
  const toast = useToast();
  const households = useHouseholds();
  const complete = useAction((task: Task) => (task.status === 'completed' ? api.post(`/v1/tasks/${task.id}/reopen`) : api.post<{ next: Task | null }>(`/v1/tasks/${task.id}/complete`)), {
    onSuccess: (r) => {
      const next = (r as { next?: Task | null } | undefined)?.next;
      if (next?.dueAt) toast(t('tasks.nextOccurrence', { when: fmt.dateTime(next.dueAt) }));
      onChanged();
    },
  });
  const catName = (id: string | null) => categories.find((c) => c.id === id);
  const hhName = (id: string | null) => households.data?.find((h) => h.id === id)?.name;
  if (!tasks.length) return null;
  return (
    <ul className="card divide-y divide-line overflow-hidden">
      {tasks.map((task) => {
        const done = task.status === 'completed';
        const cat = catName(task.categoryId);
        return (
          <li key={task.id} className="flex items-center gap-3 px-4 py-3">
            <button
              type="button"
              role="checkbox"
              aria-checked={done}
              aria-label={done ? t('tasks.markNotDone') : t('tasks.markDone')}
              onClick={() => complete.mutate(task)}
              className={cx('flex size-6 shrink-0 items-center justify-center rounded-lg border-2 transition-colors', done ? 'border-ok bg-ok text-white' : 'border-line-strong hover:border-brand')}
            >
              {done && <span aria-hidden>✓</span>}
            </button>
            <Link href={`/tasks/${task.id}`} className="min-w-0 flex-1">
              <div className={cx('truncate font-medium', done && 'text-muted line-through')}>{task.title}</div>
              <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
                {task.dueAt && (
                  <span className={cx('font-medium', task.overdue && !done ? 'text-danger' : 'text-muted')}>
                    {task.overdue && !done ? `${t('common.overdue')} · ` : ''}
                    {fmt.relativeDay(task.dueAt, { today: t('common.today'), tomorrow: t('common.tomorrow'), yesterday: t('common.yesterday') })}
                    {!task.allDay && ` · ${fmt.time(task.dueAt)}`}
                  </span>
                )}
                {task.recurrenceRule && <Repeat className="size-3.5 text-muted" aria-label={t('tasks.repeat')} />}
                {task.householdId && <Badge tone="info">{hhName(task.householdId) ?? t('common.household')}</Badge>}
                {task.isChore && <Badge tone="neutral">{t('tasks.chore')}</Badge>}
                {task.visibility === 'shared' && <Badge tone="accent">{t('tasks.shared')}</Badge>}
                {cat && (
                  <Badge tone="neutral">
                    <span className="size-2 rounded-full" style={{ background: cat.color ?? 'var(--muted)' }} />
                    {cat.name}
                  </Badge>
                )}
              </div>
            </Link>
            <PriorityBadge value={task.priority} />
          </li>
        );
      })}
    </ul>
  );
}

