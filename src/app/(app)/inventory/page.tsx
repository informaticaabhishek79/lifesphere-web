'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { Boxes, Plus, ShieldCheck } from 'lucide-react';
import { api } from '@/lib/api';
import { useHouseholds } from '@/lib/data';
import { useSession } from '@/lib/session';
import type { InventoryItem } from '@/lib/types';
import { useI18n } from '@/i18n';
import { Badge, Button, EmptyState, ErrorNotice, List, ListItem, LoadingBlock, PageHeader } from '@/components/ui';
import { Select } from '@/components/form';
import { FormDialog } from '@/components/dialog';
import { emptyInventory, INVENTORY_CATEGORIES, inventoryBody, InventoryFields } from '@/components/inventory-form';

function Inner() {
  const { t } = useI18n();
  const { fmt } = useSession();
  const params = useSearchParams();
  const qc = useQueryClient();
  const households = useHouseholds();
  const [householdId, setHouseholdId] = useState(params.get('household') ?? '');
  const [category, setCategory] = useState('');
  const q = useQuery({ queryKey: ['inventory', householdId, category], queryFn: () => api.get<InventoryItem[]>('/v1/inventory', { householdId: householdId || undefined, category: category || undefined }) });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyInventory(householdId));
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div className="max-w-3xl">
      <PageHeader
        title={t('nav.inventory')}
        description={t('inventory.intro')}
        actions={
          <Button icon={<Plus className="size-4" />} onClick={() => { setForm(emptyInventory(householdId)); setOpen(true); }}>
            {t('inventory.new')}
          </Button>
        }
      />
      <div className="mb-4 flex flex-wrap gap-3">
        {(households.data?.length ?? 0) > 0 && (
          <Select aria-label={t('nav.households')} value={householdId} onChange={(e) => setHouseholdId(e.target.value)} options={[{ value: '', label: t('lists.allMine') }, ...(households.data ?? []).map((h) => ({ value: h.id, label: h.name }))]} fieldClassName="w-56" />
        )}
        <Select aria-label={t('common.category')} value={category} onChange={(e) => setCategory(e.target.value)} placeholder={t('tasks.allCategories')} options={INVENTORY_CATEGORIES.map((c) => ({ value: c, label: t(`inventory.cat.${c}`) }))} fieldClassName="w-48" />
      </div>
      {q.isLoading && <LoadingBlock />}
      <ErrorNotice error={q.error} onRetry={q.refetch} />
      {q.data?.length === 0 && <EmptyState icon={<Boxes className="size-6" />} title={t('inventory.empty')} body={t('inventory.emptyBody')} action={<Button onClick={() => setOpen(true)}>{t('inventory.new')}</Button>} />}
      {(q.data?.length ?? 0) > 0 && (
        <List>
          {q.data!.map((i) => {
            const warranty = i.warrantyExpiresOn && i.warrantyExpiresOn >= today;
            return (
              <ListItem
                key={i.id}
                href={`/inventory/${i.id}`}
                leading={<span className="flex size-10 items-center justify-center rounded-xl bg-info-soft text-info"><Boxes className="size-5" /></span>}
                title={i.name}
                subtitle={[t(`inventory.cat.${i.category}`), i.brand, i.roomOrLocation].filter(Boolean).join(' · ')}
                trailing={warranty ? <Badge tone="ok"><ShieldCheck className="size-3" /> {t('inventory.warrantyTill', { date: fmt.day(i.warrantyExpiresOn) })}</Badge> : undefined}
              />
            );
          })}
        </List>
      )}
      <FormDialog
        open={open}
        onClose={() => setOpen(false)}
        title={t('inventory.new')}
        submitLabel={t('common.create')}
        size="lg"
        disabled={!form.name.trim()}
        onSubmit={async () => {
          await api.post('/v1/inventory', { ...inventoryBody(form), householdId: form.householdId || undefined });
          qc.invalidateQueries({ queryKey: ['inventory'] });
        }}
      >
        <InventoryFields value={form} onChange={setForm} mode="create" />
      </FormDialog>
    </div>
  );
}

export default function InventoryPage() {
  return (
    <Suspense>
      <Inner />
    </Suspense>
  );
}
