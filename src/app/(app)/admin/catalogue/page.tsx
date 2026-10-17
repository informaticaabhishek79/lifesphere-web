'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '@/lib/api';
import { useServiceCategories } from '@/lib/data';
import { useSession } from '@/lib/session';
import { useCountryOptions } from '@/lib/countries';
import type { Locality, OfficialChannel, ServiceCategory } from '@/lib/types';
import { useI18n } from '@/i18n';
import { Badge, Button, PageHeader, Tabs } from '@/components/ui';
import { DataTable, RecordDialog, type FieldSpec } from '@/components/admin';

type Tab = 'categories' | 'localities' | 'channels';

const CAT_FIELDS: FieldSpec[] = [
  { name: 'name', label: 'Name', required: true },
  { name: 'slug', label: 'Slug', required: true, hint: 'lowercase-with-dashes' },
  { name: 'description', label: 'Description', type: 'textarea' },
  { name: 'sortOrder', label: 'Sort order', type: 'number' },
  { name: 'requiresVerification', label: 'Providers must be verified', type: 'checkbox' },
  { name: 'seniorSupport', label: 'Senior support (background screening required)', type: 'checkbox' },
  { name: 'active', label: 'Active', type: 'checkbox' },
];
const locFields = (countries: { value: string; label: string }[]): FieldSpec[] => [
  { name: 'name', label: 'Locality', required: true },
  { name: 'city', label: 'City', required: true },
  { name: 'state', label: 'State / region', required: true },
  { name: 'country', label: 'Country', type: 'select', required: true, options: countries },
  { name: 'pincodePrefix', label: 'Postal code start', hint: 'First part only (e.g. 110, NW1, 2150) — never a full postal code' },
  { name: 'lat', label: 'Latitude (2 decimals)' },
  { name: 'lng', label: 'Longitude (2 decimals)' },
  { name: 'active', label: 'Active', type: 'checkbox' },
];

export default function AdminCatalogue() {
  const { e } = useI18n();
  const { fmt } = useSession();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('categories');
  const cats = useServiceCategories();
  const locs = useQuery({ queryKey: ['localities', 'admin'], queryFn: () => api.get<Locality[]>('/v1/localities', { country: 'all' }) });
  const countryList = useCountryOptions('en').map((c) => ({ value: c.code, label: `${c.flag} ${c.name}` }));
  const channels = useQuery({ queryKey: ['admin', 'channels'], queryFn: () => api.get<OfficialChannel[]>('/v1/admin/official-channels') });
  const [edit, setEdit] = useState<{ kind: Tab; row: Record<string, unknown> | null } | null>(null);
  const CHANNEL_FIELDS: FieldSpec[] = [
    { name: 'name', label: 'Name', required: true },
    { name: 'kind', label: 'Kind', type: 'select', required: true, options: ['consumer', 'civic', 'government', 'helpline'].map((k) => ({ value: k, label: e('channelKind', k) })) },
    { name: 'country', label: 'Country', type: 'select', options: countryList, hint: 'Leave empty for a channel that serves every country' },
    { name: 'jurisdiction', label: 'Jurisdiction', hint: 'e.g. India, Delhi, England and Wales' },
    { name: 'topics', label: 'Topics', type: 'tags', hint: 'Comma-separated, e.g. ecommerce, garbage' },
    { name: 'url', label: 'Official URL' },
    { name: 'phone', label: 'Phone' },
    { name: 'description', label: 'Description', type: 'textarea' },
    { name: 'lastReviewedOn', label: 'Last checked', type: 'date' },
    { name: 'active', label: 'Active', type: 'checkbox' },
  ];
  const save = async (kind: Tab, id: string | undefined, body: Record<string, unknown>) => {
    const base = kind === 'categories' ? '/v1/admin/service-categories' : kind === 'localities' ? '/v1/admin/localities' : '/v1/admin/official-channels';
    if (id) await api.patch(`${base}/${id}`, body);
    else await api.post(base, body);
    qc.invalidateQueries({ queryKey: kind === 'categories' ? ['service-categories'] : kind === 'localities' ? ['localities'] : ['admin', 'channels'] });
  };
  return (
    <div>
      <PageHeader title="Catalogue" actions={<Button onClick={() => setEdit({ kind: tab, row: tab === 'categories' || tab === 'localities' || tab === 'channels' ? { active: true } : null })}>Add</Button>} />
      <Tabs<Tab> value={tab} onChange={setTab} tabs={[{ value: 'categories', label: 'Service categories' }, { value: 'localities', label: 'Localities' }, { value: 'channels', label: 'Official channels' }]} />
      {tab === 'categories' && (
        <DataTable
          rows={cats.data ?? []}
          rowKey={(r) => r.id}
          onRowClick={(r) => setEdit({ kind: 'categories', row: r as unknown as Record<string, unknown> })}
          columns={[
            { key: 'name', label: 'Name' },
            { key: 'slug', label: 'Slug', render: (r: ServiceCategory) => <span className="font-mono text-xs">{r.slug}</span> },
            { key: 'flags', label: '', render: (r: ServiceCategory) => <div className="flex gap-1">{r.seniorSupport && <Badge tone="ok">Senior</Badge>}{r.requiresVerification && <Badge tone="info">Verified only</Badge>}{!r.active && <Badge>Inactive</Badge>}</div> },
            { key: 'sortOrder', label: 'Order' },
          ]}
        />
      )}
      {tab === 'localities' && (
        <DataTable
          rows={locs.data ?? []}
          rowKey={(r) => r.id}
          onRowClick={(r) => setEdit({ kind: 'localities', row: r as unknown as Record<string, unknown> })}
          columns={[
            { key: 'name', label: 'Locality' },
            { key: 'city', label: 'City' },
            { key: 'state', label: 'State / region' },
            { key: 'country', label: 'Country' },
            { key: 'pincodePrefix', label: 'Postal start' },
          ]}
        />
      )}
      {tab === 'channels' && (
        <DataTable
          rows={channels.data ?? []}
          rowKey={(r) => r.id}
          onRowClick={(r) => setEdit({ kind: 'channels', row: r as unknown as Record<string, unknown> })}
          columns={[
            { key: 'name', label: 'Name' },
            { key: 'kind', label: 'Kind', render: (r: OfficialChannel) => e('channelKind', r.kind) },
            { key: 'jurisdiction', label: 'Jurisdiction' },
            { key: 'topics', label: 'Topics', render: (r: OfficialChannel) => r.topics.join(', ') },
            { key: 'lastReviewedOn', label: 'Checked', render: (r: OfficialChannel) => (r.lastReviewedOn ? fmt.day(r.lastReviewedOn) : <Badge tone="warn">Never</Badge>) },
            { key: 'active', label: '', render: (r: OfficialChannel) => (!r.active ? <Badge>Inactive</Badge> : null) },
          ]}
        />
      )}
      {edit && (
        <RecordDialog
          title={`${edit.row?.id ? 'Edit' : 'Add'} ${edit.kind === 'categories' ? 'category' : edit.kind === 'localities' ? 'locality' : 'official channel'}`}
          fields={edit.kind === 'categories' ? CAT_FIELDS : edit.kind === 'localities' ? locFields(countryList) : CHANNEL_FIELDS}
          initial={edit.row}
          editing={!!edit.row?.id}
          onClose={() => setEdit(null)}
          onSubmit={(body) => save(edit.kind, edit.row?.id as string | undefined, body)}
        />
      )}
    </div>
  );
}
