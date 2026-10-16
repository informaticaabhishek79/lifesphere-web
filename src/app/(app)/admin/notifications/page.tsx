'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useI18n } from '@/i18n';
import { LoadingBlock, Notice, PageHeader } from '@/components/ui';
import { DataTable } from '@/components/admin';

interface Failure {
  channel: string;
  provider: string | null;
  template: string | null;
  lastError: string | null;
  n: number;
}

export default function AdminNotificationFailures() {
  const { e } = useI18n();
  const q = useQuery({ queryKey: ['admin', 'notif-failures'], queryFn: () => api.get<Failure[]>('/v1/admin/notifications/failures'), refetchInterval: 60_000 });
  return (
    <div>
      <PageHeader title="Delivery failures" description="Failed SMS, email and push deliveries in the last 7 days, grouped by cause." />
      <Notice tone="info" className="mb-4">
        Help and missed check-in alerts that fail are retried automatically. Persistent failures usually mean provider credentials, DLT templates or sender IDs need attention.
      </Notice>
      {q.isLoading && <LoadingBlock />}
      <DataTable
        rows={q.data ?? []}
        rowKey={(r) => `${r.channel}-${r.provider}-${r.template}-${r.lastError}`}
        empty="No failures in the last 7 days."
        columns={[
          { key: 'channel', label: 'Channel', render: (r) => e('channel', r.channel) },
          { key: 'provider', label: 'Provider' },
          { key: 'template', label: 'Template', render: (r) => <span className="font-mono text-xs">{r.template ?? '—'}</span> },
          { key: 'lastError', label: 'Error', render: (r) => <span className="text-danger">{r.lastError ?? '—'}</span> },
          { key: 'n', label: 'Count' },
        ]}
      />
    </div>
  );
}
