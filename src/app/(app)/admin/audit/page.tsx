'use client';

import { useState } from 'react';
import { usePaged } from '@/lib/hooks';
import { useSession } from '@/lib/session';
import { Badge, Button, LoadingBlock, LoadMore, PageHeader } from '@/components/ui';
import { Input } from '@/components/form';
import { DataTable, shortId } from '@/components/admin';

interface AuditRow {
  id: string;
  actorId: string | null;
  actorType: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  subjectUserId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export default function AdminAudit() {
  const { fmt } = useSession();
  const [draft, setDraft] = useState({ action: '', actorId: '', subjectUserId: '', targetId: '' });
  const [filters, setFilters] = useState(draft);
  const list = usePaged<AuditRow>(['admin', 'audit'], '/v1/admin/audit', Object.fromEntries(Object.entries(filters).map(([k, v]) => [k, v.trim() || undefined])));
  return (
    <div>
      <PageHeader title="Audit log" description="Identifiers and counts only — the log never stores message text, names or phone numbers." />
      <form
        className="card mb-4 grid gap-3 p-4 sm:grid-cols-5"
        onSubmit={(ev) => {
          ev.preventDefault();
          setFilters(draft);
        }}
      >
        <Input aria-label="Action" placeholder="action, e.g. grant.created" value={draft.action} onChange={(ev) => setDraft({ ...draft, action: ev.target.value })} />
        <Input aria-label="Actor" placeholder="actor id" value={draft.actorId} onChange={(ev) => setDraft({ ...draft, actorId: ev.target.value })} />
        <Input aria-label="Subject" placeholder="subject user id" value={draft.subjectUserId} onChange={(ev) => setDraft({ ...draft, subjectUserId: ev.target.value })} />
        <Input aria-label="Target" placeholder="target id" value={draft.targetId} onChange={(ev) => setDraft({ ...draft, targetId: ev.target.value })} />
        <Button type="submit">Filter</Button>
      </form>
      {list.isLoading && <LoadingBlock />}
      <DataTable
        rows={list.items}
        rowKey={(r) => r.id}
        columns={[
          { key: 'createdAt', label: 'When', render: (r) => fmt.dateTime(r.createdAt) },
          { key: 'action', label: 'Action', render: (r) => <span className="font-mono text-xs">{r.action}</span> },
          { key: 'actor', label: 'Actor', render: (r) => <span><Badge tone={r.actorType === 'staff' ? 'accent' : r.actorType === 'system' ? 'info' : 'neutral'}>{r.actorType}</Badge> <span className="font-mono text-xs">{shortId(r.actorId)}</span></span> },
          { key: 'target', label: 'Target', render: (r) => <span className="font-mono text-xs">{r.targetType ?? '—'} {shortId(r.targetId)}</span> },
          { key: 'subject', label: 'Subject', render: (r) => <span className="font-mono text-xs">{shortId(r.subjectUserId)}</span> },
          { key: 'metadata', label: 'Details', render: (r) => <code className="font-mono text-xs">{Object.keys(r.metadata).length ? JSON.stringify(r.metadata) : ''}</code> },
        ]}
      />
      <LoadMore hasMore={list.hasMore} loading={list.loadingMore} onClick={list.loadMore} />
    </div>
  );
}
