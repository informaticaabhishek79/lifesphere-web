'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '@/lib/api';
import { useSession } from '@/lib/session';
import { Badge, Button, PageHeader, Tabs } from '@/components/ui';
import { useReauth } from '@/components/reauth';
import { DataTable, RecordDialog, type FieldSpec } from '@/components/admin';

interface ConfigRow {
  key: string;
  value: unknown;
  description: string | null;
  updatedAt: string;
}
interface Plan {
  code: string;
  name: string;
  subject: string;
  features: Record<string, unknown>;
  active: boolean;
}
type Tab = 'config' | 'plans' | 'subscriptions';

const PLAN_FIELDS: FieldSpec[] = [
  { name: 'code', label: 'Code', required: true },
  { name: 'name', label: 'Name', required: true },
  { name: 'subject', label: 'For', type: 'select', required: true, options: ['user', 'household', 'provider'].map((v) => ({ value: v, label: v })) },
  { name: 'features', label: 'Features (JSON)', type: 'json' },
  { name: 'active', label: 'Active', type: 'checkbox' },
];
const SUB_FIELDS: FieldSpec[] = [
  { name: 'subjectType', label: 'For', type: 'select', required: true, options: ['user', 'household', 'provider'].map((v) => ({ value: v, label: v })) },
  { name: 'subjectId', label: 'ID', required: true },
  { name: 'planCode', label: 'Plan code', required: true },
  { name: 'endsAt', label: 'Ends at (ISO date)', hint: 'Optional' },
  { name: 'source', label: 'Source', hint: 'e.g. manual, promo' },
];

export default function AdminConfig() {
  const { fmt } = useSession();
  const qc = useQueryClient();
  const withReauth = useReauth();
  const [tab, setTab] = useState<Tab>('config');
  const config = useQuery({ queryKey: ['admin', 'config'], queryFn: () => api.get<ConfigRow[]>('/v1/admin/config') });
  const plans = useQuery({ queryKey: ['admin', 'plans'], queryFn: () => api.get<Plan[]>('/v1/admin/plans') });
  const [edit, setEdit] = useState<{ kind: Tab; row: Record<string, unknown> | null } | null>(null);
  return (
    <div>
      <PageHeader
        title="Config & plans"
        description="Payments are not part of LifeSphere yet: plans and entitlements exist, but no money moves."
        actions={<Button onClick={() => setEdit({ kind: tab, row: tab === 'plans' ? { active: true, features: {} } : tab === 'config' ? { value: {} } : null })}>{tab === 'subscriptions' ? 'Grant subscription' : 'Add'}</Button>}
      />
      <Tabs<Tab> value={tab} onChange={setTab} tabs={[{ value: 'config', label: 'App config' }, { value: 'plans', label: 'Plans' }, { value: 'subscriptions', label: 'Subscriptions' }]} />
      {tab === 'config' && (
        <DataTable
          rows={config.data ?? []}
          rowKey={(r) => r.key}
          onRowClick={(r) => setEdit({ kind: 'config', row: r as unknown as Record<string, unknown> })}
          columns={[
            { key: 'key', label: 'Key', render: (r) => <span className="font-mono text-xs">{r.key}</span> },
            { key: 'description', label: 'Description' },
            { key: 'value', label: 'Value', render: (r) => <code className="line-clamp-2 font-mono text-xs">{JSON.stringify(r.value)}</code> },
            { key: 'updatedAt', label: 'Updated', render: (r) => fmt.date(r.updatedAt) },
          ]}
        />
      )}
      {tab === 'plans' && (
        <DataTable
          rows={plans.data ?? []}
          rowKey={(r) => r.code}
          onRowClick={(r) => setEdit({ kind: 'plans', row: r as unknown as Record<string, unknown> })}
          columns={[
            { key: 'code', label: 'Code', render: (r) => <span className="font-mono text-xs">{r.code}</span> },
            { key: 'name', label: 'Name' },
            { key: 'subject', label: 'For' },
            { key: 'features', label: 'Features', render: (r) => <code className="font-mono text-xs">{JSON.stringify(r.features)}</code> },
            { key: 'active', label: '', render: (r) => (!r.active ? <Badge>Inactive</Badge> : null) },
          ]}
        />
      )}
      {tab === 'subscriptions' && <p className="text-sm text-muted">Grant a plan to a user, household or provider manually (for pilots and partners).</p>}
      {edit && (
        <RecordDialog
          title={edit.kind === 'config' ? 'Config value' : edit.kind === 'plans' ? 'Plan' : 'Grant subscription'}
          fields={edit.kind === 'config' ? [{ name: 'key', label: 'Key', required: true, createOnly: true }, { name: 'description', label: 'Description' }, { name: 'value', label: 'Value (JSON)', type: 'json' }] : edit.kind === 'plans' ? PLAN_FIELDS : SUB_FIELDS}
          initial={edit.row}
          editing={edit.kind === 'config' && !!edit.row?.key}
          onClose={() => setEdit(null)}
          onSubmit={async (body) => {
            if (edit.kind === 'config') {
              const key = (edit.row?.key as string) ?? (body.key as string);
              await withReauth(() => api.put(`/v1/admin/config/${encodeURIComponent(key)}`, { value: body.value, description: body.description }));
            } else if (edit.kind === 'plans') await withReauth(() => api.put('/v1/admin/plans', body));
            else await withReauth(() => api.post('/v1/admin/subscriptions', { ...body, endsAt: body.endsAt ? new Date(String(body.endsAt)).toISOString() : undefined }));
            qc.invalidateQueries({ queryKey: ['admin'] });
          }}
        />
      )}
    </div>
  );
}
