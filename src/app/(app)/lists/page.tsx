'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { Plus, ShoppingCart } from 'lucide-react';
import { api } from '@/lib/api';
import { useHouseholds } from '@/lib/data';
import { useSession } from '@/lib/session';
import type { ShoppingList } from '@/lib/types';
import { useI18n } from '@/i18n';
import { Badge, Button, EmptyState, ErrorNotice, List, ListItem, LoadingBlock, PageHeader } from '@/components/ui';
import { Checkbox, Input, Select } from '@/components/form';
import { FormDialog } from '@/components/dialog';

function Inner() {
  const { t } = useI18n();
  const { fmt } = useSession();
  const params = useSearchParams();
  const qc = useQueryClient();
  const households = useHouseholds();
  const [householdId, setHouseholdId] = useState(params.get('household') ?? '');
  const [archived, setArchived] = useState(false);
  const q = useQuery({ queryKey: ['lists', householdId, archived], queryFn: () => api.get<ShoppingList[]>('/v1/lists', { householdId: householdId || undefined, includeArchived: archived ? 'true' : undefined }) });
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [listHousehold, setListHousehold] = useState(householdId);
  const hhName = (id: string | null) => households.data?.find((h) => h.id === id)?.name;
  return (
    <div className="max-w-3xl">
      <PageHeader
        title={t('nav.lists')}
        actions={
          <Button icon={<Plus className="size-4" />} onClick={() => { setListHousehold(householdId); setOpen(true); }}>
            {t('lists.new')}
          </Button>
        }
      />
      <div className="mb-4 flex flex-wrap items-center gap-4">
        {(households.data?.length ?? 0) > 0 && (
          <Select aria-label={t('nav.households')} value={householdId} onChange={(e) => setHouseholdId(e.target.value)} options={[{ value: '', label: t('lists.allMine') }, ...(households.data ?? []).map((h) => ({ value: h.id, label: h.name }))]} fieldClassName="w-56" />
        )}
        <Checkbox label={t('lists.showArchived')} checked={archived} onChange={setArchived} />
      </div>
      {q.isLoading && <LoadingBlock />}
      <ErrorNotice error={q.error} onRetry={q.refetch} />
      {q.data?.length === 0 && <EmptyState icon={<ShoppingCart className="size-6" />} title={t('lists.empty')} action={<Button onClick={() => setOpen(true)}>{t('lists.new')}</Button>} />}
      {(q.data?.length ?? 0) > 0 && (
        <List>
          {q.data!.map((l) => (
            <ListItem
              key={l.id}
              href={`/lists/${l.id}`}
              leading={<span className="flex size-10 items-center justify-center rounded-xl bg-accent-soft text-accent"><ShoppingCart className="size-5" /></span>}
              title={l.name}
              subtitle={`${t('lists.openItems', { count: l.openItems ?? 0 })} · ${t('common.updated', { when: fmt.ago(l.updatedAt) })}`}
              trailing={
                <>
                  {l.householdId && <Badge tone="info">{hhName(l.householdId) ?? t('common.household')}</Badge>}
                  {l.archivedAt && <Badge>{t('lists.archived')}</Badge>}
                </>
              }
            />
          ))}
        </List>
      )}
      <FormDialog
        open={open}
        onClose={() => setOpen(false)}
        title={t('lists.new')}
        submitLabel={t('common.create')}
        disabled={!name.trim()}
        onSubmit={async () => {
          await api.post('/v1/lists', { name: name.trim(), householdId: listHousehold || undefined });
          setName('');
          qc.invalidateQueries({ queryKey: ['lists'] });
        }}
      >
        <Input label={t('common.name')} placeholder={t('lists.namePlaceholder')} value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoFocus />
        {(households.data?.length ?? 0) > 0 && (
          <Select label={t('lists.sharedWith')} value={listHousehold} onChange={(e) => setListHousehold(e.target.value)} options={[{ value: '', label: t('lists.justMe') }, ...(households.data ?? []).map((h) => ({ value: h.id, label: h.name }))]} />
        )}
      </FormDialog>
    </div>
  );
}

export default function ListsPage() {
  return (
    <Suspense>
      <Inner />
    </Suspense>
  );
}
