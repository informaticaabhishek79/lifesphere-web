'use client';

import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { CheckSquare, Plus, Repeat, Search, Tags, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useAction, usePaged } from '@/lib/hooks';
import { useHouseholds, useTaskCategories } from '@/lib/data';
import { useSession } from '@/lib/session';
import type { IncomingAssignment, Task, TaskCategory } from '@/lib/types';
import { useI18n } from '@/i18n';
import { Badge, Button, cx, EmptyState, ErrorNotice, IconButton, LoadingBlock, LoadMore, PageHeader, Stat, Tabs } from '@/components/ui';
import { Input, Select } from '@/components/form';
import { FormDialog, useConfirm, useToast } from '@/components/dialog';
import { PriorityBadge } from '@/components/status';
import { emptyTask, formToCreate, TaskFields } from '@/components/task-form';
import { TaskList } from '@/components/task-list';

type Tab = 'mine' | 'household' | 'shared' | 'offered' | 'done';

function Inner() {
  const { t } = useI18n();
  const params = useSearchParams();
  const router = useRouter();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>((params.get('tab') as Tab) ?? 'mine');
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [householdId, setHouseholdId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [creating, setCreating] = useState(params.get('new') === '1');
  const [form, setForm] = useState(emptyTask({ title: params.get('title') ?? '' }));
  const [catsOpen, setCatsOpen] = useState(false);
  const households = useHouseholds();
  const categories = useTaskCategories();
  const summary = useQuery({ queryKey: ['tasks', 'summary'], queryFn: () => api.get<{ pending: number; overdue: number; completedThisWeek: number }>('/v1/tasks/summary') });
  const incoming = useQuery({ queryKey: ['tasks', 'incoming'], queryFn: () => api.get<IncomingAssignment[]>('/v1/tasks/assignments/incoming') });

  useEffect(() => {
    const id = setTimeout(() => setSearch(q), 300);
    return () => clearTimeout(id);
  }, [q]);

  const query =
    tab === 'mine'
      ? { scope: 'all', status: 'open' }
      : tab === 'household'
        ? { scope: 'household', status: 'open', householdId: householdId || undefined }
        : tab === 'shared'
          ? { scope: 'shared', status: 'open' }
          : tab === 'done'
            ? { scope: 'all', status: 'completed', sort: 'updated' }
            : null;
  const list = usePaged<Task>(['tasks', 'list'], '/v1/tasks', { ...(query ?? {}), q: search || undefined, categoryId: categoryId || undefined }, { enabled: !!query });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['tasks'] });
    qc.invalidateQueries({ queryKey: ['dashboard'] });
  };

  return (
    <div>
      <PageHeader
        title={t('nav.tasks')}
        actions={
          <>
            <Button variant="secondary" icon={<Tags className="size-4" />} onClick={() => setCatsOpen(true)}>
              {t('tasks.categories')}
            </Button>
            <Button
              icon={<Plus className="size-4" />}
              onClick={() => {
                setForm(emptyTask());
                setCreating(true);
              }}
            >
              {t('tasks.new')}
            </Button>
          </>
        }
      />
      {summary.data && (
        <div className="mb-6 grid grid-cols-3 gap-3">
          <Stat label={t('tasks.toDo')} value={summary.data.pending} />
          <Stat label={t('common.overdue')} value={summary.data.overdue} tone={summary.data.overdue ? 'danger' : 'neutral'} />
          <Stat label={t('tasks.doneThisWeek')} value={summary.data.completedThisWeek} tone="ok" />
        </div>
      )}

      <Tabs<Tab>
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'mine', label: t('tasks.tabOpen') },
          ...((households.data?.length ?? 0) > 0 ? [{ value: 'household' as Tab, label: t('tasks.tabHousehold') }] : []),
          { value: 'shared', label: t('tasks.tabShared') },
          { value: 'offered', label: t('tasks.tabOffered'), count: incoming.data?.length },
          { value: 'done', label: t('tasks.tabDone') },
        ]}
      />

      {tab !== 'offered' && (
        <div className="mb-4 flex flex-wrap gap-3">
          <div className="relative min-w-[14rem] flex-1">
            <Search className="pointer-events-none absolute top-3.5 left-3 size-4 text-muted" />
            <Input aria-label={t('common.search')} placeholder={t('common.search')} value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
          </div>
          {tab === 'household' && (households.data?.length ?? 0) > 1 && (
            <Select aria-label={t('nav.households')} value={householdId} onChange={(e) => setHouseholdId(e.target.value)} placeholder={t('common.all')} options={(households.data ?? []).map((h) => ({ value: h.id, label: h.name }))} fieldClassName="w-48" />
          )}
          {(categories.data?.length ?? 0) > 0 && (
            <Select aria-label={t('common.category')} value={categoryId} onChange={(e) => setCategoryId(e.target.value)} placeholder={t('tasks.allCategories')} options={(categories.data ?? []).map((c) => ({ value: c.id, label: c.name }))} fieldClassName="w-48" />
          )}
        </div>
      )}

      {tab === 'offered' ? (
        <Offered items={incoming.data} loading={incoming.isLoading} onDone={invalidate} />
      ) : (
        <>
          {list.isLoading && <LoadingBlock />}
          <ErrorNotice error={list.error} onRetry={list.refetch} />
          {!list.isLoading && list.items.length === 0 && (
            <EmptyState
              icon={<CheckSquare className="size-6" />}
              title={tab === 'done' ? t('tasks.emptyDone') : t('tasks.empty')}
              body={tab === 'shared' ? t('tasks.emptyShared') : undefined}
              action={tab === 'mine' ? <Button onClick={() => setCreating(true)}>{t('tasks.new')}</Button> : undefined}
            />
          )}
          <TaskList tasks={list.items} categories={categories.data ?? []} onChanged={invalidate} />
          <LoadMore hasMore={list.hasMore} loading={list.loadingMore} onClick={list.loadMore} />
        </>
      )}

      <FormDialog
        open={creating}
        onClose={() => {
          setCreating(false);
          if (params.get('new')) router.replace('/tasks');
        }}
        title={t('tasks.new')}
        submitLabel={t('common.create')}
        disabled={!form.title.trim() || (!!form.repeat && !form.dueAt)}
        onSubmit={async () => {
          await api.post('/v1/tasks', formToCreate(form));
          invalidate();
        }}
      >
        <TaskFields value={form} onChange={setForm} mode="create" />
      </FormDialog>

      <CategoriesDialog open={catsOpen} onClose={() => setCatsOpen(false)} categories={categories.data ?? []} />
    </div>
  );
}

export default function TasksPage() {
  return (
    <Suspense>
      <Inner />
    </Suspense>
  );
}

function Offered({ items, loading, onDone }: { items?: IncomingAssignment[]; loading: boolean; onDone: () => void }) {
  const { t } = useI18n();
  const { fmt } = useSession();
  const respond = useAction(({ id, accept }: { id: string; accept: boolean }) => api.post(`/v1/tasks/assignments/${id}/respond`, { accept }), { onSuccess: onDone });
  if (loading) return <LoadingBlock />;
  if (!items?.length) return <EmptyState title={t('tasks.noOffers')} body={t('tasks.noOffersBody')} />;
  return (
    <ul className="space-y-3">
      {items.map((a) => (
        <li key={a.id} className="card flex flex-wrap items-center gap-3 px-4 py-3.5">
          <div className="min-w-0 flex-1">
            <div className="font-semibold">{a.title}</div>
            <div className="text-sm text-muted">
              {t('tasks.offeredBy', { name: a.assignedByName })}
              {a.dueAt && ` · ${t('common.due', { when: fmt.dateTime(a.dueAt) })}`}
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => respond.mutate({ id: a.id, accept: false })}>
              {t('common.decline')}
            </Button>
            <Button size="sm" onClick={() => respond.mutate({ id: a.id, accept: true })}>
              {t('common.accept')}
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}

const COLORS = ['#0d5c58', '#b9572f', '#1f5a8a', '#17663a', '#8a5a00', '#7a3e9d', '#b42318', '#5b6770'];

function CategoriesDialog({ open, onClose, categories }: { open: boolean; onClose: () => void; categories: TaskCategory[] }) {
  const { t } = useI18n();
  const households = useHouseholds();
  const confirm = useConfirm();
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLORS[0]!);
  const [householdId, setHouseholdId] = useState('');
  const inv = [['task-categories']];
  const create = useAction(() => api.post('/v1/task-categories', { name: name.trim(), color, householdId: householdId || undefined }), { invalidate: inv, onSuccess: () => setName('') });
  const remove = useAction((id: string) => api.del(`/v1/task-categories/${id}`), { invalidate: inv });
  return (
    <FormDialog open={open} onClose={onClose} title={t('tasks.categories')} submitLabel={t('common.done')} onSubmit={() => undefined}>
      <ul className="divide-y divide-line rounded-xl border border-line">
        {categories.map((c) => (
          <li key={c.id} className="flex items-center gap-3 px-3 py-2">
            <span className="size-3 rounded-full" style={{ background: c.color ?? 'var(--muted)' }} />
            <span className="flex-1 font-medium">{c.name}</span>
            {c.householdId && <Badge tone="info">{households.data?.find((h) => h.id === c.householdId)?.name ?? t('common.household')}</Badge>}
            <IconButton
              label={t('common.delete')}
              onClick={async () => {
                if (await confirm({ title: t('common.delete'), body: c.name, danger: true })) remove.mutate(c.id);
              }}
            >
              <Trash2 className="size-4" />
            </IconButton>
          </li>
        ))}
        {categories.length === 0 && <li className="px-3 py-4 text-center text-sm text-muted">{t('common.emptyList')}</li>}
      </ul>
      <div className="space-y-3 rounded-xl bg-surface-2 p-3">
        <Input label={t('common.name')} value={name} onChange={(e) => setName(e.target.value)} maxLength={40} />
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Colour">
          {COLORS.map((c) => (
            <button key={c} type="button" role="radio" aria-checked={color === c} aria-label={c} onClick={() => setColor(c)} className={cx('size-7 rounded-full border-2', color === c ? 'border-ink' : 'border-transparent')} style={{ background: c }} />
          ))}
        </div>
        {(households.data?.length ?? 0) > 0 && (
          <Select label={t('tasks.belongsTo')} value={householdId} onChange={(e) => setHouseholdId(e.target.value)} options={[{ value: '', label: t('common.personal') }, ...(households.data ?? []).map((h) => ({ value: h.id, label: h.name }))]} />
        )}
        <Button size="sm" onClick={() => create.mutate()} loading={create.isPending} disabled={!name.trim()}>
          {t('common.add')}
        </Button>
      </div>
    </FormDialog>
  );
}
