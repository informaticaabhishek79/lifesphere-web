'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '@/lib/api';
import { usePaged } from '@/lib/hooks';
import { useSession } from '@/lib/session';
import { useI18n } from '@/i18n';
import { Badge, Button, LoadingBlock, LoadMore, PageHeader } from '@/components/ui';
import { Select, Textarea } from '@/components/form';
import { FormDialog } from '@/components/dialog';
import { StatusBadge } from '@/components/status';
import { DataTable, shortId } from '@/components/admin';

interface Row {
  id: string;
  userId: string;
  type: string;
  status: string;
  details: string | null;
  dueAt: string;
  createdAt: string;
  completedAt: string | null;
  handledBy: string | null;
}

export default function AdminPrivacy() {
  const { e } = useI18n();
  const { fmt } = useSession();
  const qc = useQueryClient();
  const [status, setStatus] = useState('');
  const [type, setType] = useState('');
  const list = usePaged<Row>(['admin', 'privacy'], '/v1/admin/privacy-requests', { status: status || undefined, type: type || undefined });
  const [act, setAct] = useState<{ row: Row; action: 'start' | 'complete' | 'reject' | 'retry_export'; note: string } | null>(null);
  const now = Date.now();
  return (
    <div>
      <PageHeader title="Privacy requests" description="Exports run automatically. Corrections and grievances need a person to respond before the due date." />
      <div className="mb-4 flex flex-wrap gap-3">
        <Select aria-label="Status" value={status} onChange={(ev) => setStatus(ev.target.value)} placeholder="Open (received + in progress)" options={['received', 'in_progress', 'completed', 'rejected', 'cancelled'].map((s) => ({ value: s, label: e('privacyRequestStatus', s) }))} fieldClassName="w-64" />
        <Select aria-label="Type" value={type} onChange={(ev) => setType(ev.target.value)} placeholder="All types" options={['export', 'delete', 'correction', 'grievance'].map((s) => ({ value: s, label: e('privacyRequestType', s) }))} fieldClassName="w-48" />
      </div>
      {list.isLoading && <LoadingBlock />}
      <DataTable
        rows={list.items}
        rowKey={(r) => r.id}
        columns={[
          { key: 'createdAt', label: 'Received', render: (r) => fmt.date(r.createdAt) },
          { key: 'type', label: 'Type', render: (r) => e('privacyRequestType', r.type) },
          { key: 'userId', label: 'User', render: (r) => <span className="font-mono">{shortId(r.userId)}</span> },
          { key: 'details', label: 'Details', render: (r) => <span className="line-clamp-3">{r.details ?? '—'}</span> },
          { key: 'dueAt', label: 'Due', render: (r) => (new Date(r.dueAt).getTime() < now && !r.completedAt ? <Badge tone="danger">Overdue {fmt.date(r.dueAt)}</Badge> : fmt.date(r.dueAt)) },
          { key: 'status', label: 'Status', render: (r) => <StatusBadge group="privacyRequestStatus" value={r.status} /> },
          {
            key: 'x',
            label: '',
            render: (r) =>
              r.status === 'received' || r.status === 'in_progress' ? (
                <div className="flex flex-wrap gap-1">
                  {r.status === 'received' && (
                    <Button size="sm" variant="secondary" onClick={() => setAct({ row: r, action: 'start', note: '' })}>
                      Start
                    </Button>
                  )}
                  {r.type === 'export' && (
                    <Button size="sm" variant="secondary" onClick={() => setAct({ row: r, action: 'retry_export', note: '' })}>
                      Retry export
                    </Button>
                  )}
                  {r.type !== 'export' && r.type !== 'delete' && (
                    <Button size="sm" onClick={() => setAct({ row: r, action: 'complete', note: '' })}>
                      Complete
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="text-danger" onClick={() => setAct({ row: r, action: 'reject', note: '' })}>
                    Reject
                  </Button>
                </div>
              ) : null,
          },
        ]}
      />
      <LoadMore hasMore={list.hasMore} loading={list.loadingMore} onClick={list.loadMore} />
      {act && (
        <FormDialog
          open
          danger={act.action === 'reject'}
          onClose={() => setAct(null)}
          title={`${act.action.replace('_', ' ')} — ${e('privacyRequestType', act.row.type)}`}
          disabled={(act.action === 'reject' || act.action === 'complete') && act.note.trim().length < 3}
          onSubmit={async () => {
            await api.post(`/v1/admin/privacy-requests/${act.row.id}/action`, { action: act.action, note: act.note.trim() || undefined });
            qc.invalidateQueries({ queryKey: ['admin', 'privacy'] });
          }}
        >
          <Textarea label="Note to the user" optional={act.action === 'start' || act.action === 'retry_export'} value={act.note} onChange={(ev) => setAct({ ...act, note: ev.target.value })} rows={3} />
        </FormDialog>
      )}
    </div>
  );
}
