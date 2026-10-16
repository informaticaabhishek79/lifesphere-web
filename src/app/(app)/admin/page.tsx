'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useI18n } from '@/i18n';
import { Card, CardBody, CardHeader, ErrorNotice, LoadingBlock, PageHeader, Stat } from '@/components/ui';

interface Overview {
  users: { total: number; active7d: number; disabled: number; pendingDeletion: number };
  community: { activeGroups: number; posts24h: number; openReports: number };
  providers: { pendingReview: number; active: number };
  privacy: { open: number; overdue: number };
  notifications24h: { channel: string; status: string; n: number }[];
  queues: Record<string, number | null>;
}

export default function AdminOverview() {
  const { e } = useI18n();
  const q = useQuery({ queryKey: ['admin', 'overview'], queryFn: () => api.get<Overview>('/v1/admin/overview'), refetchInterval: 30_000 });
  return (
    <div>
      <PageHeader title="Overview" />
      {q.isLoading && <LoadingBlock rows={3} />}
      <ErrorNotice error={q.error} onRetry={q.refetch} />
      {q.data && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Users" value={q.data.users.total} href="/admin/users" />
            <Stat label="Active (7 days)" value={q.data.users.active7d} />
            <Stat label="Disabled" value={q.data.users.disabled} />
            <Stat label="Deletion scheduled" value={q.data.users.pendingDeletion} />
            <Stat label="Open reports" value={q.data.community.openReports} tone={q.data.community.openReports ? 'warn' : 'neutral'} href="/admin/moderation" />
            <Stat label="Providers to review" value={q.data.providers.pendingReview} tone={q.data.providers.pendingReview ? 'warn' : 'neutral'} href="/admin/providers" />
            <Stat label="Privacy requests open" value={q.data.privacy.open} href="/admin/privacy" />
            <Stat label="Privacy requests overdue" value={q.data.privacy.overdue} tone={q.data.privacy.overdue ? 'danger' : 'ok'} href="/admin/privacy" />
            <Stat label="Active groups" value={q.data.community.activeGroups} />
            <Stat label="Posts (24 h)" value={q.data.community.posts24h} />
            <Stat label="Listed providers" value={q.data.providers.active} />
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            <Card>
              <CardHeader title="Notifications (24 h)" description="Delivery is only marked delivered when a provider confirms." />
              <CardBody>
                <ul className="divide-y divide-line text-sm">
                  {q.data.notifications24h.length === 0 && <li className="py-2 text-muted">None</li>}
                  {q.data.notifications24h.map((n, i) => (
                    <li key={i} className="flex justify-between py-2">
                      <span>
                        {e('channel', n.channel)} · {e('deliveryStatus', n.status)}
                      </span>
                      <span className="font-semibold tabular-nums">{n.n}</span>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
            <Card>
              <CardHeader title="Job queues" description="Jobs waiting in each background queue." />
              <CardBody>
                <ul className="divide-y divide-line text-sm">
                  {Object.entries(q.data.queues).map(([k, v]) => (
                    <li key={k} className="flex justify-between py-2">
                      <span className="font-mono text-xs">{k}</span>
                      <span className="font-semibold tabular-nums">{v ?? '—'}</span>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
