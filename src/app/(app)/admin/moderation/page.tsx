'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '@/lib/api';
import { useAction, usePaged } from '@/lib/hooks';
import { useSession } from '@/lib/session';
import { useI18n } from '@/i18n';
import { Badge, Button, ErrorNotice, KeyValue, LoadingBlock, LoadMore, Notice, PageHeader, Tabs } from '@/components/ui';
import { Checkbox, Input, Select, Textarea } from '@/components/form';
import { Dialog, FormDialog } from '@/components/dialog';
import { StatusBadge } from '@/components/status';
import { DataTable, Json, shortId } from '@/components/admin';

interface Report {
  id: string;
  source: string;
  targetType: string;
  targetId: string;
  targetUserId: string | null;
  groupId: string | null;
  reason: string;
  details: string | null;
  status: string;
  priority: number;
  assignedTo: string | null;
  createdAt: string;
}
interface ReportDetail {
  report: Report;
  evidence: { id: string; snapshot: Record<string, unknown>; retainUntil: string }[];
  relatedReports: { id: string; reason: string; status: string; createdAt: string }[];
  targetUserHistory: { priorActions: number; actions: { action: string; createdAt: string }[]; activeSanctions: { id: string; kind: string; expiresAt: string | null }[] };
  suggestion: string;
}
interface Action {
  id: string;
  reportId: string | null;
  moderatorId: string;
  targetType: string;
  targetId: string;
  action: string;
  reason: string;
  expiresAt: string | null;
  createdAt: string;
}
type Tab = 'reports' | 'appeals' | 'actions';
const ACTIONS = ['hide', 'remove', 'restore', 'warn', 'suspend_posting', 'suspend', 'ban', 'dismiss'] as const;

export default function AdminModeration() {
  const { e } = useI18n();
  const { fmt, me } = useSession();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('reports');
  const [status, setStatus] = useState('open');
  const [mine, setMine] = useState(false);
  const reports = usePaged<Report>(['admin', 'reports'], '/v1/admin/moderation/reports', { status: status || undefined, assignedToMe: mine ? 'true' : undefined }, { enabled: tab === 'reports' });
  const appeals = useQuery({ queryKey: ['admin', 'appeals'], queryFn: () => api.get<{ appeal: { id: string; statement: string; status: string; createdAt: string; appellantId: string }; action: Action }[]>('/v1/admin/moderation/appeals', { status: 'open' }), enabled: tab === 'appeals' });
  const actions = usePaged<Action>(['admin', 'actions'], '/v1/admin/moderation/actions', {}, { enabled: tab === 'actions' });
  const [openId, setOpenId] = useState<string | null>(null);
  const detail = useQuery({ queryKey: ['admin', 'report', openId], queryFn: () => api.get<ReportDetail>(`/v1/admin/moderation/reports/${openId}`), enabled: !!openId });
  const [act, setAct] = useState<{ action: (typeof ACTIONS)[number]; reason: string; durationDays: string } | null>(null);
  const [decide, setDecide] = useState<{ id: string; decision: 'upheld' | 'overturned'; note: string } | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: ['admin'] });
  const assign = useAction((id: string) => api.post(`/v1/admin/moderation/reports/${id}/assign`), { onSuccess: refresh, success: 'Assigned to you.' });

  return (
    <div>
      <PageHeader title="Moderation" description="Humans decide high-impact actions. Moderators cannot decide appeals on their own decisions." />
      <Tabs<Tab> value={tab} onChange={setTab} tabs={[{ value: 'reports', label: 'Reports' }, { value: 'appeals', label: 'Appeals' }, { value: 'actions', label: 'Action log' }]} />
      {tab === 'reports' && (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-4">
            <Select aria-label="Status" value={status} onChange={(ev) => setStatus(ev.target.value)} placeholder="All" options={['open', 'in_review', 'actioned', 'dismissed'].map((s) => ({ value: s, label: e('reportStatus', s) }))} fieldClassName="w-48" />
            <Checkbox label="Assigned to me" checked={mine} onChange={setMine} />
          </div>
          {reports.isLoading && <LoadingBlock />}
          <ErrorNotice error={reports.error} />
          <DataTable
            rows={reports.items}
            rowKey={(r) => r.id}
            onRowClick={(r) => setOpenId(r.id)}
            columns={[
              { key: 'createdAt', label: 'When', render: (r) => fmt.dateTime(r.createdAt) },
              { key: 'target', label: 'Target', render: (r) => `${e('reportTarget', r.targetType)} ${shortId(r.targetId)}` },
              { key: 'reason', label: 'Reason', render: (r) => e('reportReason', r.reason) },
              { key: 'source', label: 'Source', render: (r) => <Badge tone={r.source === 'filter' ? 'accent' : 'neutral'}>{r.source}</Badge> },
              { key: 'priority', label: 'Priority' },
              { key: 'status', label: 'Status', render: (r) => <StatusBadge group="reportStatus" value={r.status} /> },
              { key: 'assignedTo', label: 'Assigned', render: (r) => (r.assignedTo === me.id ? 'You' : shortId(r.assignedTo)) },
            ]}
          />
          <LoadMore hasMore={reports.hasMore} loading={reports.loadingMore} onClick={reports.loadMore} />
        </>
      )}
      {tab === 'appeals' && (
        <>
          {appeals.isLoading && <LoadingBlock />}
          <DataTable
            rows={appeals.data ?? []}
            rowKey={(r) => r.appeal.id}
            columns={[
              { key: 'when', label: 'When', render: (r) => fmt.dateTime(r.appeal.createdAt) },
              { key: 'action', label: 'Decision appealed', render: (r) => `${e('moderationAction', r.action.action)} · ${r.action.reason}` },
              { key: 'statement', label: 'Statement', render: (r) => <span className="line-clamp-3">{r.appeal.statement}</span> },
              {
                key: 'x',
                label: '',
                render: (r) =>
                  r.action.moderatorId === me.id ? (
                    <span className="text-xs text-muted">Your decision — another moderator must decide</span>
                  ) : (
                    <Button size="sm" onClick={() => setDecide({ id: r.appeal.id, decision: 'overturned', note: '' })}>
                      Decide
                    </Button>
                  ),
              },
            ]}
          />
        </>
      )}
      {tab === 'actions' && (
        <>
          <DataTable
            rows={actions.items}
            rowKey={(r) => r.id}
            columns={[
              { key: 'createdAt', label: 'When', render: (r) => fmt.dateTime(r.createdAt) },
              { key: 'action', label: 'Action', render: (r) => e('moderationAction', r.action) },
              { key: 'target', label: 'Target', render: (r) => `${e('reportTarget', r.targetType)} ${shortId(r.targetId)}` },
              { key: 'reason', label: 'Reason' },
              { key: 'moderatorId', label: 'By', render: (r) => (r.moderatorId === me.id ? 'You' : shortId(r.moderatorId)) },
            ]}
          />
          <LoadMore hasMore={actions.hasMore} loading={actions.loadingMore} onClick={actions.loadMore} />
        </>
      )}

      <Dialog
        open={!!openId}
        onClose={() => setOpenId(null)}
        title="Report"
        size="lg"
        footer={
          detail.data && (
            <>
              {detail.data.report.assignedTo !== me.id && (
                <Button variant="secondary" onClick={() => assign.mutate(detail.data!.report.id)}>
                  Assign to me
                </Button>
              )}
              <Button onClick={() => setAct({ action: 'hide', reason: '', durationDays: '' })}>Take action</Button>
            </>
          )
        }
      >
        {detail.isLoading && <LoadingBlock rows={3} />}
        {detail.data && (
          <div className="space-y-4">
            <KeyValue
              items={[
                { label: 'Target', value: `${e('reportTarget', detail.data.report.targetType)} ${detail.data.report.targetId}` },
                { label: 'Reason', value: e('reportReason', detail.data.report.reason) },
                { label: 'Details', value: detail.data.report.details },
                { label: 'Status', value: <StatusBadge group="reportStatus" value={detail.data.report.status} /> },
                { label: 'Prior actions on this person', value: String(detail.data.targetUserHistory.priorActions) },
              ]}
            />
            <Notice tone="info" title="Suggestion">
              {detail.data.suggestion}
            </Notice>
            {detail.data.evidence.map((ev) => (
              <div key={ev.id}>
                <div className="mb-1 text-sm font-semibold">Snapshot (kept until {fmt.date(ev.retainUntil)})</div>
                <Json value={ev.snapshot} />
              </div>
            ))}
            {detail.data.targetUserHistory.activeSanctions.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {detail.data.targetUserHistory.activeSanctions.map((s) => (
                  <Badge key={s.id} tone="danger">
                    {e('sanctionKind', s.kind)}
                  </Badge>
                ))}
              </div>
            )}
            {detail.data.relatedReports.length > 1 && <p className="text-sm text-muted">{detail.data.relatedReports.length} reports about this content.</p>}
          </div>
        )}
      </Dialog>

      {act && detail.data && (
        <FormDialog
          open
          danger={act.action !== 'restore' && act.action !== 'dismiss'}
          onClose={() => setAct(null)}
          title="Moderation action"
          description="The person is told the reason and can appeal."
          disabled={act.reason.trim().length < 3}
          onSubmit={async () => {
            const r = detail.data!.report;
            const toUser = ['warn', 'suspend_posting', 'suspend', 'ban'].includes(act.action);
            await api.post('/v1/admin/moderation/actions', {
              reportId: r.id,
              targetType: toUser && r.targetUserId ? 'user' : r.targetType,
              targetId: toUser && r.targetUserId ? r.targetUserId : r.targetId,
              action: act.action,
              reason: act.reason.trim(),
              durationDays: act.durationDays ? Number(act.durationDays) : undefined,
            });
            refresh();
            setOpenId(null);
          }}
        >
          <Select label="Action" value={act.action} onChange={(ev) => setAct({ ...act, action: ev.target.value as (typeof ACTIONS)[number] })} options={ACTIONS.map((a) => ({ value: a, label: e('moderationAction', a) }))} />
          {['suspend_posting', 'suspend'].includes(act.action) && <Input type="number" min={1} label="Duration (days)" value={act.durationDays} onChange={(ev) => setAct({ ...act, durationDays: ev.target.value })} />}
          <Textarea label="Reason shown to the person" value={act.reason} onChange={(ev) => setAct({ ...act, reason: ev.target.value })} rows={3} />
        </FormDialog>
      )}
      {decide && (
        <FormDialog
          open
          onClose={() => setDecide(null)}
          title="Decide appeal"
          disabled={decide.note.trim().length < 3}
          onSubmit={async () => {
            await api.post(`/v1/admin/moderation/appeals/${decide.id}/decide`, { decision: decide.decision, note: decide.note.trim() });
            refresh();
          }}
        >
          <Select label="Decision" value={decide.decision} onChange={(ev) => setDecide({ ...decide, decision: ev.target.value as 'upheld' | 'overturned' })} options={[{ value: 'overturned', label: e('appealStatus', 'overturned') }, { value: 'upheld', label: e('appealStatus', 'upheld') }]} />
          <Textarea label="Note to the person" value={decide.note} onChange={(ev) => setDecide({ ...decide, note: ev.target.value })} rows={3} />
        </FormDialog>
      )}
    </div>
  );
}
