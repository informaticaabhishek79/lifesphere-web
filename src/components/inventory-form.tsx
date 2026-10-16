'use client';

import type { InventoryItem } from '@/lib/types';
import { useHouseholds } from '@/lib/data';
import { useI18n } from '@/i18n';
import { Input, Select, Textarea } from './form';

export const INVENTORY_CATEGORIES = ['appliance', 'electronics', 'furniture', 'vehicle', 'plumbing', 'electrical', 'water', 'safety', 'other'];

export interface InventoryFormValue {
  name: string;
  category: string;
  brand: string;
  model: string;
  roomOrLocation: string;
  installedOn: string;
  purchaseDate: string;
  warrantyExpiresOn: string;
  notes: string;
  householdId: string;
}

export const emptyInventory = (householdId = ''): InventoryFormValue => ({
  name: '',
  category: 'appliance',
  brand: '',
  model: '',
  roomOrLocation: '',
  installedOn: '',
  purchaseDate: '',
  warrantyExpiresOn: '',
  notes: '',
  householdId,
});

export const inventoryToForm = (i: InventoryItem): InventoryFormValue => ({
  name: i.name,
  category: i.category,
  brand: i.brand ?? '',
  model: i.model ?? '',
  roomOrLocation: i.roomOrLocation ?? '',
  installedOn: i.installedOn ?? '',
  purchaseDate: i.purchaseDate ?? '',
  warrantyExpiresOn: i.warrantyExpiresOn ?? '',
  notes: i.notes ?? '',
  householdId: i.householdId ?? '',
});

export const inventoryBody = (v: InventoryFormValue) => ({
  name: v.name.trim(),
  category: v.category,
  brand: v.brand.trim() || undefined,
  model: v.model.trim() || undefined,
  roomOrLocation: v.roomOrLocation.trim() || undefined,
  installedOn: v.installedOn || undefined,
  purchaseDate: v.purchaseDate || undefined,
  warrantyExpiresOn: v.warrantyExpiresOn || undefined,
  notes: v.notes.trim() || undefined,
});

export function InventoryFields({ value, onChange, mode }: { value: InventoryFormValue; onChange: (v: InventoryFormValue) => void; mode: 'create' | 'edit' }) {
  const { t } = useI18n();
  const households = useHouseholds();
  const set = <K extends keyof InventoryFormValue>(k: K, v: InventoryFormValue[K]) => onChange({ ...value, [k]: v });
  return (
    <div className="space-y-4">
      <Input label={t('common.name')} placeholder={t('inventory.namePlaceholder')} value={value.name} onChange={(e) => set('name', e.target.value)} maxLength={120} autoFocus />
      <div className="grid gap-4 sm:grid-cols-2">
        <Select label={t('common.category')} value={value.category} onChange={(e) => set('category', e.target.value)} options={INVENTORY_CATEGORIES.map((c) => ({ value: c, label: t(`inventory.cat.${c}`) }))} />
        <Input label={t('inventory.room')} optional value={value.roomOrLocation} onChange={(e) => set('roomOrLocation', e.target.value)} maxLength={60} />
        <Input label={t('inventory.brand')} optional value={value.brand} onChange={(e) => set('brand', e.target.value)} maxLength={60} />
        <Input label={t('inventory.model')} optional value={value.model} onChange={(e) => set('model', e.target.value)} maxLength={80} />
        <Input type="date" label={t('inventory.purchaseDate')} optional value={value.purchaseDate} onChange={(e) => set('purchaseDate', e.target.value)} />
        <Input type="date" label={t('inventory.installedOn')} optional value={value.installedOn} onChange={(e) => set('installedOn', e.target.value)} />
        <Input type="date" label={t('inventory.warrantyUntil')} optional value={value.warrantyExpiresOn} onChange={(e) => set('warrantyExpiresOn', e.target.value)} />
        {mode === 'create' && (households.data?.length ?? 0) > 0 && (
          <Select label={t('tasks.belongsTo')} value={value.householdId} onChange={(e) => set('householdId', e.target.value)} options={[{ value: '', label: t('common.personal') }, ...(households.data ?? []).map((h) => ({ value: h.id, label: h.name }))]} />
        )}
      </div>
      <Textarea label={t('common.notes')} optional value={value.notes} onChange={(e) => set('notes', e.target.value)} />
      <p className="text-[0.82rem] text-muted">{t('inventory.noSerials')}</p>
    </div>
  );
}
