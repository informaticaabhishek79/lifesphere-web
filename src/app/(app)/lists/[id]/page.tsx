'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { useMemo, useRef, useState } from 'react';
import { Archive, ArchiveRestore, Eraser, Pencil, Plus, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useAction } from '@/lib/hooks';
import { useHousehold } from '@/lib/data';
import { useSession } from '@/lib/session';
import type { ListItem as Item, ShoppingList } from '@/lib/types';
import { useI18n } from '@/i18n';
import { Badge, Button, Card, cx, ErrorNotice, IconButton, LoadingBlock, PageHeader } from '@/components/ui';
import { Input, Select } from '@/components/form';
import { FormDialog, useConfirm } from '@/components/dialog';

type Detail = ShoppingList & { items: Item[] };

export default function ListPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useI18n();
  const { me } = useSession();
  const router = useRouter();
  const qc = useQueryClient();
  const confirm = useConfirm();
  const key = ['list', id];
  const q = useQuery({ queryKey: key, queryFn: () => api.get<Detail>(`/v1/lists/${id}`), refetchInterval: 20_000 });
  const household = useHousehold(q.data?.householdId);
  const [name, setName] = useState('');
  const [qty, setQty] = useState('');
  const [unit, setUnit] = useState('');
  const [category, setCategory] = useState('');
  const [editing, setEditing] = useState<Item | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState('');
  const input = useRef<HTMLInputElement>(null);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: key });
    qc.invalidateQueries({ queryKey: ['lists'] });
  };
  const add = useAction(
    () => api.post(`/v1/lists/${id}/items`, { name: name.trim(), quantity: qty ? Number(qty) : undefined, unit: unit.trim() || undefined, category: category.trim() || undefined }),
    {
      onSuccess: () => {
        setName('');
        setQty('');
        setUnit('');
        refresh();
        input.current?.focus();
      },
    },
  );
  const toggle = useAction((item: Item) => api.patch(`/v1/lists/items/${item.id}`, { done: !item.doneAt }), {
    onSuccess: refresh,
  });
  const remove = useAction((itemId: string) => api.del(`/v1/lists/items/${itemId}`), { onSuccess: refresh });
  const clearDone = useAction(() => api.post<{ removed: number }>(`/v1/lists/${id}/clear-done`), { onSuccess: refresh });
  const archive = useAction(() => api.patch(`/v1/lists/${id}`, { archived: !q.data?.archivedAt }), { onSuccess: refresh });

  const groups = useMemo(() => {
    const open = (q.data?.items ?? []).filter((i) => !i.doneAt).sort((a, b) => a.position - b.position);
    const m = new Map<string, Item[]>();
    for (const i of open) m.set(i.category ?? '', [...(m.get(i.category ?? '') ?? []), i]);
    return [...m.entries()].sort(([a], [b]) => (a === '' ? 1 : b === '' ? -1 : a.localeCompare(b)));
  }, [q.data]);
  const done = (q.data?.items ?? []).filter((i) => i.doneAt);
  const categories = [...new Set((q.data?.items ?? []).map((i) => i.category).filter(Boolean))] as string[];
  const members = household.data?.members ?? [];
  const nameOf = (uid: string | null) => (uid === me.id ? t('common.you') : members.find((m) => m.userId === uid)?.displayName);

  if (q.isLoading) return <LoadingBlock rows={4} />;
  if (q.error || !q.data) return <ErrorNotice error={q.error} onRetry={q.refetch} />;
  const l = q.data;

  const row = (item: Item) => (
    <li key={item.id} className="flex items-center gap-3 px-4 py-2.5">
      <button
        type="button"
        role="checkbox"
        aria-checked={!!item.doneAt}
        aria-label={item.name}
        onClick={() => toggle.mutate(item)}
        className={cx('flex size-6 shrink-0 items-center justify-center rounded-full border-2', item.doneAt ? 'border-ok bg-ok text-white' : 'border-line-strong hover:border-brand')}
      >
        {item.doneAt && '✓'}
      </button>
      <div className="min-w-0 flex-1">
        <span className={cx('font-medium', item.doneAt && 'text-muted line-through')}>{item.name}</span>
        {item.quantity && (
          <span className="ms-2 text-sm text-muted">
            {Number(item.quantity)} {item.unit}
          </span>
        )}
        {item.assignedTo && <Badge className="ms-2" tone="info">{nameOf(item.assignedTo) ?? '…'}</Badge>}
      </div>
      {!item.doneAt && (
        <IconButton label={t('common.edit')} onClick={() => setEditing(item)}>
          <Pencil className="size-4" />
        </IconButton>
      )}
      <IconButton label={t('common.delete')} onClick={() => remove.mutate(item.id)}>
        <Trash2 className="size-4" />
      </IconButton>
    </li>
  );

  return (
    <div className="max-w-2xl">
      <PageHeader
        back={{ href: '/lists', label: t('nav.lists') }}
        title={l.name}
        description={household.data ? t('lists.sharedWithHousehold', { name: household.data.name }) : t('lists.justMe')}
        actions={
          <>
            <IconButton label={t('households.rename')} onClick={() => { setNewName(l.name); setRenaming(true); }}>
              <Pencil className="size-4" />
            </IconButton>
            <IconButton label={l.archivedAt ? t('lists.unarchive') : t('lists.archive')} onClick={() => archive.mutate()}>
              {l.archivedAt ? <ArchiveRestore className="size-4" /> : <Archive className="size-4" />}
            </IconButton>
            <IconButton
              label={t('common.delete')}
              onClick={async () => {
                if (!(await confirm({ title: t('lists.delete'), body: l.name, danger: true }))) return;
                await api.del(`/v1/lists/${id}`);
                qc.invalidateQueries({ queryKey: ['lists'] });
                router.replace('/lists');
              }}
            >
              <Trash2 className="size-4" />
            </IconButton>
          </>
        }
      />

      <form
        className="card mb-5 flex flex-wrap items-end gap-2 p-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) add.mutate();
        }}
      >
        <Input ref={input} aria-label={t('lists.addItem')} placeholder={t('lists.addItem')} value={name} onChange={(e) => setName(e.target.value)} fieldClassName="min-w-[10rem] flex-1" maxLength={120} />
        <Input aria-label={t('lists.qty')} placeholder={t('lists.qty')} inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value.replace(/[^\d.]/g, ''))} fieldClassName="w-20" />
        <Input aria-label={t('lists.unit')} placeholder={t('lists.unit')} value={unit} onChange={(e) => setUnit(e.target.value)} fieldClassName="w-20" maxLength={20} />
        <Input aria-label={t('common.category')} placeholder={t('common.category')} list="cats" value={category} onChange={(e) => setCategory(e.target.value)} fieldClassName="w-32" maxLength={40} />
        <datalist id="cats">
          {categories.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
        <Button type="submit" icon={<Plus className="size-4" />} loading={add.isPending} disabled={!name.trim()}>
          {t('common.add')}
        </Button>
      </form>

      {groups.length === 0 && done.length === 0 && <p className="rounded-xl bg-surface-2 px-4 py-8 text-center text-muted">{t('lists.noItems')}</p>}
      <div className="space-y-4">
        {groups.map(([cat, items]) => (
          <Card key={cat}>
            {cat && <div className="border-b border-line px-4 py-2 text-xs font-bold uppercase tracking-wide text-muted">{cat}</div>}
            <ul className="divide-y divide-line">{items.map(row)}</ul>
          </Card>
        ))}
        {done.length > 0 && (
          <Card>
            <div className="flex items-center justify-between border-b border-line px-4 py-2">
              <span className="text-xs font-bold uppercase tracking-wide text-muted">{t('lists.got', { count: done.length })}</span>
              <Button size="sm" variant="ghost" icon={<Eraser className="size-4" />} onClick={() => clearDone.mutate()}>
                {t('lists.clearDone')}
              </Button>
            </div>
            <ul className="divide-y divide-line">{done.map(row)}</ul>
          </Card>
        )}
      </div>

      {editing && (
        <ItemDialog item={editing} members={members.map((m) => ({ value: m.userId, label: m.userId === me.id ? t('common.you') : m.displayName }))} onClose={() => setEditing(null)} onSaved={refresh} />
      )}
      <FormDialog open={renaming} onClose={() => setRenaming(false)} title={t('households.rename')} disabled={!newName.trim()} onSubmit={async () => { await api.patch(`/v1/lists/${id}`, { name: newName.trim() }); refresh(); }}>
        <Input label={t('common.name')} value={newName} onChange={(e) => setNewName(e.target.value)} maxLength={80} autoFocus />
      </FormDialog>
    </div>
  );
}

function ItemDialog({ item, members, onClose, onSaved }: { item: Item; members: { value: string; label: string }[]; onClose: () => void; onSaved: () => void }) {
  const { t } = useI18n();
  const [f, setF] = useState({ name: item.name, quantity: item.quantity ? String(Number(item.quantity)) : '', unit: item.unit ?? '', category: item.category ?? '', assignedTo: item.assignedTo ?? '' });
  return (
    <FormDialog
      open
      onClose={onClose}
      title={t('common.edit')}
      disabled={!f.name.trim()}
      onSubmit={async () => {
        await api.patch(`/v1/lists/items/${item.id}`, {
          name: f.name.trim(),
          quantity: f.quantity ? Number(f.quantity) : null,
          unit: f.unit.trim() || null,
          category: f.category.trim() || null,
          assignedTo: f.assignedTo || null,
        });
        onSaved();
      }}
    >
      <Input label={t('common.name')} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
      <div className="grid grid-cols-2 gap-3">
        <Input label={t('lists.qty')} inputMode="decimal" value={f.quantity} onChange={(e) => setF({ ...f, quantity: e.target.value.replace(/[^\d.]/g, '') })} />
        <Input label={t('lists.unit')} value={f.unit} onChange={(e) => setF({ ...f, unit: e.target.value })} />
      </div>
      <Input label={t('common.category')} value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} />
      {members.length > 0 && <Select label={t('lists.whoBuys')} value={f.assignedTo} onChange={(e) => setF({ ...f, assignedTo: e.target.value })} placeholder={t('lists.anyone')} options={members} />}
    </FormDialog>
  );
}
