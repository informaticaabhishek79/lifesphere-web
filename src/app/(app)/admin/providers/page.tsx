'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '@/lib/api';
import { usePaged } from '@/lib/hooks';
import { useSession } from '@/lib/session';
import type { ProviderProfile } from '@/lib/types';
import { useI18n } from '@/i18n';
import { Badge, Button, KeyValue, LoadingBlock, LoadMore, Notice, PageHeader } from '@/components/ui';
import { Checkbox, Input, Select, Textarea } from '@/components/form';
import { Dialog, FormDialog } from '@/components/dialog';
import { StatusBadge } from '@/components/status';
import { DataTable } from '@/components/admin';

interface AdminProvider extends ProviderProfile {
  verification: { id: string; checkType: string; status: string; note: string | null; checkedAt: string | null; expiresAt: string | null; performedByPartner: string | null }[];
  members: { userId: string; role: string }[];
}
const CHECKS = ['identity', 'address', 'background', 'business_registration', 'reference', 'training'] as const;

export default function AdminProviders() {
  const { e } = useI18n();
  const { fmt } = useSession();
  const qc = useQueryClient();
  const [status, setStatus] = useState('pending_review');
  const list = usePaged<ProviderProfile>(['admin', 'providers'], '/v1/admin/providers', { status: status || undefined });
  const [openId, setOpenId] = useState<string | null>(null);
  const detail = useQuery({ queryKey: ['admin', 'provider', openId], queryFn: () => api.get<AdminProvider>(`/v1/admin/providers/${openId}`), enabled: !!openId });
  const [decision, setDecision] = useState<{ decision: 'approve' | 'reject' | 'suspend' | 'reinstate'; reason: string } | null>(null);
  const [check, setCheck] = useState<{ checkType: string; status: string; performedByPartner: string; note: string; expiresAt: string } | null>(null);
  const [sponsor, setSponsor] = useState<{ isSponsored: boolean; sponsoredUntil: string } | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: ['admin'] });
  const p = detail.data;
  return (
    <div>
      <PageHeader title="Providers" description="Approve listings and record verification checks. Levels are derived from checks — never self-declared." />
      <Select aria-label="Status" value={status} onChange={(ev) => setStatus(ev.target.value)} placeholder="All" options={['pending_review', 'active', 'suspended', 'rejected', 'draft'].map((s) => ({ value: s, label: e('providerStatus', s) }))} fieldClassName="mb-4 w-56" />
      {list.isLoading && <LoadingBlock />}
      <DataTable
        rows={list.items}
        rowKey={(r) => r.id}
        onRowClick={(r) => setOpenId(r.id)}
        columns={[
          { key: 'displayName', label: 'Name' },
          { key: 'providerType', label: 'Type', render: (r) => e('providerType', r.providerType) },
          { key: 'verificationLevel', label: 'Verification', render: (r) => e('verificationLevel', r.verificationLevel) },
          { key: 'status', label: 'Status', render: (r) => <StatusBadge group="providerStatus" value={r.status} /> },
          { key: 'submittedAt', label: 'Submitted', render: (r) => (r.submittedAt ? fmt.date(r.submittedAt) : '—') },
          { key: 'isSponsored', label: '', render: (r) => (r.isSponsored ? <Badge tone="warn">Sponsored</Badge> : null) },
        ]}
      />
      <LoadMore hasMore={list.hasMore} loading={list.loadingMore} onClick={list.loadMore} />

      <Dialog
        open={!!openId}
        onClose={() => setOpenId(null)}
        title={p?.displayName ?? 'Provider'}
        size="lg"
        footer={
          p && (
            <>
              <Button variant="secondary" onClick={() => setSponsor({ isSponsored: !p.isSponsored, sponsoredUntil: '' })}>
                {p.isSponsored ? 'End sponsorship' : 'Mark sponsored'}
              </Button>
              <Button variant="secondary" onClick={() => setCheck({ checkType: 'identity', status: 'passed', performedByPartner: '', note: '', expiresAt: '' })}>
                Record check
              </Button>
              {p.status === 'pending_review' && (
                <>
                  <Button variant="danger" onClick={() => setDecision({ decision: 'reject', reason: '' })}>
                    Reject
                  </Button>
                  <Button onClick={() => setDecision({ decision: 'approve', reason: '' })}>Approve</Button>
                </>
              )}
              {p.status === 'active' && (
                <Button variant="danger" onClick={() => setDecision({ decision: 'suspend', reason: '' })}>
                  Suspend
                </Button>
              )}
              {p.status === 'suspended' && <Button onClick={() => setDecision({ decision: 'reinstate', reason: '' })}>Reinstate</Button>}
            </>
          )
        }
      >
        {detail.isLoading && <LoadingBlock rows={3} />}
        {p && (
          <div className="space-y-4">
            <KeyValue
              items={[
                { label: 'Type', value: e('providerType', p.providerType) },
                { label: 'Status', value: <StatusBadge group="providerStatus" value={p.status} /> },
                { label: 'Verification level', value: e('verificationLevel', p.verificationLevel) },
                { label: 'Phone', value: p.phonePublic },
                { label: 'Email', value: p.emailPublic },
                { label: 'Website', value: p.websiteUrl },
                { label: 'Description', value: p.description },
                { label: 'Rejection reason', value: p.rejectionReason },
                { label: 'Team size', value: String(p.members.length) },
              ]}
            />
            <div>
              <div className="mb-2 text-sm font-semibold">Checks</div>
              {p.verification.length === 0 && <p className="text-sm text-muted">None recorded.</p>}
              <ul className="space-y-1.5 text-sm">
                {p.verification.map((v) => (
                  <li key={v.id} className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{e('verificationCheck', v.checkType)}</span>
                    <StatusBadge group="verificationStatus" value={v.status} />
                    {v.performedByPartner && <span className="text-muted">via {v.performedByPartner}</span>}
                    {v.expiresAt && <span className="text-muted">until {fmt.date(v.expiresAt)}</span>}
                    {v.note && <span className="text-muted">— {v.note}</span>}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </Dialog>

      {decision && openId && (
        <FormDialog
          open
          danger={decision.decision === 'reject' || decision.decision === 'suspend'}
          onClose={() => setDecision(null)}
          title={`${decision.decision[0]!.toUpperCase()}${decision.decision.slice(1)} provider`}
          disabled={decision.decision !== 'approve' && decision.reason.trim().length < 3}
          onSubmit={async () => {
            await api.post(`/v1/admin/providers/${openId}/decision`, { decision: decision.decision, reason: decision.reason.trim() || undefined });
            refresh();
          }}
        >
          <Textarea label="Reason (shown to the provider)" optional={decision.decision === 'approve'} value={decision.reason} onChange={(ev) => setDecision({ ...decision, reason: ev.target.value })} rows={3} />
        </FormDialog>
      )}
      {check && openId && (
        <FormDialog
          open
          onClose={() => setCheck(null)}
          title="Record verification check"
          onSubmit={async () => {
            await api.post(`/v1/admin/providers/${openId}/verification`, {
              checkType: check.checkType,
              status: check.status,
              performedByPartner: check.performedByPartner.trim() || undefined,
              note: check.note.trim() || undefined,
              expiresAt: check.expiresAt ? new Date(`${check.expiresAt}T23:59:00`).toISOString() : undefined,
            });
            refresh();
          }}
        >
          <Notice tone="warn">Never enter Aadhaar, PAN or any ID numbers — the note is rejected if it contains one.</Notice>
          <Select label="Check" value={check.checkType} onChange={(ev) => setCheck({ ...check, checkType: ev.target.value })} options={CHECKS.map((c) => ({ value: c, label: e('verificationCheck', c) }))} />
          <Select label="Result" value={check.status} onChange={(ev) => setCheck({ ...check, status: ev.target.value })} options={['passed', 'failed', 'pending'].map((s) => ({ value: s, label: e('verificationStatus', s) }))} />
          <Input label="Done by partner" optional value={check.performedByPartner} onChange={(ev) => setCheck({ ...check, performedByPartner: ev.target.value })} />
          <Input type="date" label="Valid until" optional value={check.expiresAt} onChange={(ev) => setCheck({ ...check, expiresAt: ev.target.value })} />
          <Textarea label="Note" optional value={check.note} onChange={(ev) => setCheck({ ...check, note: ev.target.value })} rows={2} />
        </FormDialog>
      )}
      {sponsor && openId && (
        <FormDialog
          open
          onClose={() => setSponsor(null)}
          title={sponsor.isSponsored ? 'Mark as sponsored' : 'End sponsorship'}
          description="Sponsored listings are always labelled. Payment never affects verification or ranking of reviews."
          onSubmit={async () => {
            await api.put(`/v1/admin/providers/${openId}/sponsorship`, { isSponsored: sponsor.isSponsored, sponsoredUntil: sponsor.sponsoredUntil ? new Date(`${sponsor.sponsoredUntil}T23:59:00`).toISOString() : undefined });
            refresh();
          }}
        >
          <Checkbox label="Sponsored" checked={sponsor.isSponsored} onChange={(v) => setSponsor({ ...sponsor, isSponsored: v })} />
          {sponsor.isSponsored && <Input type="date" label="Until" optional value={sponsor.sponsoredUntil} onChange={(ev) => setSponsor({ ...sponsor, sponsoredUntil: ev.target.value })} />}
        </FormDialog>
      )}
    </div>
  );
}
