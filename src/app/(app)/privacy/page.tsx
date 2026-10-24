'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import { Download, FileDown, MessageSquareWarning, PenLine, Scale, Trash2 } from 'lucide-react';
import { api, fileUrl } from '@/lib/api';
import { useAction } from '@/lib/hooks';
import { useSession } from '@/lib/session';
import type { Consent, PrivacyRequest } from '@/lib/types';
import { useI18n } from '@/i18n';
import { Badge, Button, Card, CardBody, CardHeader, ErrorNotice, LoadingBlock, Notice, PageHeader, Tabs } from '@/components/ui';
import { Input, Textarea } from '@/components/form';
import { FormDialog, useConfirm } from '@/components/dialog';
import { useReauth } from '@/components/reauth';
import { StatusBadge } from '@/components/status';
import { DataInventoryView, NoticeSummary } from '@/components/privacy-info';

type Tab = 'overview' | 'collected';
const OPTIONAL = ['location_help', 'checkins_sharing', 'ai_assistance', 'email_updates', 'community_participation'];

export default function PrivacyPage() {
  const { t, e } = useI18n();
  const { fmt, me } = useSession();
  const router = useRouter();
  const qc = useQueryClient();
  const confirm = useConfirm();
  const withReauth = useReauth();
  const [tab, setTab] = useState<Tab>('overview');
  const consents = useQuery({ queryKey: ['privacy', 'consents'], queryFn: () => api.get<Consent[]>('/v1/privacy/consents') });
  const requests = useQuery({ queryKey: ['privacy', 'requests'], queryFn: () => api.get<PrivacyRequest[]>('/v1/privacy/requests'), refetchInterval: 20_000 });
  const [req, setReq] = useState<{ type: 'correction' | 'grievance'; details: string } | null>(null);
  const [del, setDel] = useState<{ reason: string; confirm: string } | null>(null);
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['privacy'] });
    qc.invalidateQueries({ queryKey: ['me'] });
  };
  const withdraw = useAction(({ purpose }: { purpose: string }) => api.del<{ effects: string[] }>(`/v1/privacy/consents/${purpose}`), { onSuccess: refresh, success: (r) => r?.effects?.join(' ') || t('common.saved') });
  const grant = useAction((purpose: string) => api.post('/v1/privacy/consents', { purpose, policyVersion: '2026-10' }), { onSuccess: refresh, success: t('common.saved') });
  const exportData = useAction(() => api.post<PrivacyRequest>('/v1/privacy/requests', { type: 'export' }), { onSuccess: refresh, success: (r) => t('privacy.requestSent', { date: fmt.date(r.dueAt) }) });
  const cancel = useAction((id: string) => api.post(`/v1/privacy/requests/${id}/cancel`), { onSuccess: refresh });

  const active = (p: string) => consents.data?.find((c) => c.purpose === p && !c.withdrawnAt);
  const latest = (p: string) => consents.data?.filter((c) => c.purpose === p).sort((a, b) => b.grantedAt.localeCompare(a.grantedAt))[0];

  return (
    <div className="max-w-3xl">
      <PageHeader title={t('privacy.title')} description={t('privacy.intro')} />
      <Tabs<Tab>
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'overview', label: t('privacy.yourChoices') },
          { value: 'collected', label: t('privacy.inventory') },
        ]}
      />
      {tab === 'collected' && <DataInventoryView />}
      {tab === 'overview' && (
        <div className="space-y-5">
          {me.status === 'pending_deletion' && <Notice tone="danger" title={t('privacy.deletionScheduled')}>{t('privacy.deletionScheduledBody')}</Notice>}
          <Card>
            <CardHeader title={t('privacy.consents')} description={t('privacy.consentsHint')} />
            <CardBody>
              {consents.isLoading && <LoadingBlock rows={2} />}
              <ul className="divide-y divide-line">
                {OPTIONAL.map((p) => {
                  const a = active(p);
                  const l = latest(p);
                  return (
                    <li key={p} className="flex flex-wrap items-center gap-3 py-3">
                      <div className="min-w-0 flex-1">
                        <div className="font-medium">{e('consentPurpose', p)}</div>
                        <div className="text-sm text-muted">{a ? t('privacy.given', { date: fmt.date(a.grantedAt) }) : l?.withdrawnAt ? t('privacy.withdrawn', { date: fmt.date(l.withdrawnAt) }) : t('privacy.notGiven')}</div>
                      </div>
                      {a ? (
                        <Button size="sm" variant="secondary" onClick={async () => { if (await confirm({ title: t('privacy.withdrawTitle'), body: e('consentPurpose', p) })) withdraw.mutate({ purpose: p }); }}>
                          {t('privacy.withdraw')}
                        </Button>
                      ) : (
                        <Button size="sm" variant="soft" onClick={() => grant.mutate(p)}>
                          {t('privacy.grant')}
                        </Button>
                      )}
                    </li>
                  );
                })}
                {consents.data
                  ?.filter((c) => !OPTIONAL.includes(c.purpose) && !c.withdrawnAt)
                  .map((c) => (
                    <li key={c.id} className="flex items-center gap-3 py-3">
                      <div className="flex-1">
                        <div className="font-medium">{e('consentPurpose', c.purpose)}</div>
                        <div className="text-sm text-muted">
                          {t('privacy.given', { date: fmt.date(c.grantedAt) })}
                          {c.policyVersion && ` · ${t('privacy.version', { v: c.policyVersion })}`}
                        </div>
                      </div>
                      <Badge>{t('privacy.required')}</Badge>
                    </li>
                  ))}
              </ul>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title={t('privacy.yourRights')} />
            <CardBody className="grid gap-3 sm:grid-cols-2">
              <Button variant="secondary" icon={<FileDown className="size-4" />} loading={exportData.isPending} onClick={() => exportData.mutate()} className="justify-start">
                {t('privacy.exportData')}
              </Button>
              <Button variant="secondary" icon={<PenLine className="size-4" />} onClick={() => setReq({ type: 'correction', details: '' })} className="justify-start">
                {t('privacy.correction')}
              </Button>
              <Button variant="secondary" icon={<MessageSquareWarning className="size-4" />} onClick={() => setReq({ type: 'grievance', details: '' })} className="justify-start">
                {t('privacy.grievance')}
              </Button>
              <Button variant="secondary" icon={<Trash2 className="size-4" />} onClick={() => setDel({ reason: '', confirm: '' })} className="justify-start text-danger">
                {t('privacy.deleteAccount')}
              </Button>
              <p className="text-[0.82rem] text-muted sm:col-span-2">{t('privacy.exportHint')}</p>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title={t('privacy.policiesTitle')} description={t('privacy.policiesHint')} icon={<Scale className="size-5" />} />
            <CardBody className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
              <Link href="/legal/terms" className="font-semibold text-brand hover:underline">{t('auth.termsLink')}</Link>
              <Link href="/legal/privacy" className="font-semibold text-brand hover:underline">{t('auth.privacyLink')}</Link>
              <Link href="/legal/grievance" className="font-semibold text-brand hover:underline">{t('auth.grievanceLink')}</Link>
              <Link href="/legal" className="font-semibold text-brand hover:underline">{t('auth.policiesLink')}</Link>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title={t('privacy.requests')} />
            <CardBody>
              <ErrorNotice error={requests.error} />
              {requests.data?.length === 0 && <p className="text-sm text-muted">{t('common.emptyList')}</p>}
              <ul className="divide-y divide-line">
                {requests.data?.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium">{e('privacyRequestType', r.type)}</div>
                      <div className="text-sm text-muted">
                        {r.createdAt && `${fmt.date(r.createdAt)} · `}
                        {r.completedAt ? fmt.date(r.completedAt) : t('privacy.dueBy', { date: fmt.date(r.dueAt) })}
                      </div>
                      {r.resolutionNote && <div className="mt-1 text-sm">{r.resolutionNote}</div>}
                    </div>
                    <StatusBadge group="privacyRequestStatus" value={r.status} />
                    {r.hasDownload && (
                      <a href={fileUrl(`/v1/privacy/requests/${r.id}/download`)} className="inline-flex items-center gap-1 text-sm font-semibold text-brand">
                        <Download className="size-4" /> {t('common.download')}
                      </a>
                    )}
                    {(r.status === 'received' || r.status === 'in_progress') && (
                      <Button size="sm" variant="ghost" onClick={() => cancel.mutate(r.id)}>
                        {r.type === 'delete' ? t('privacy.keepAccount') : t('privacy.cancelRequest')}
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>

          <NoticeSummary />
        </div>
      )}

      {req && (
        <FormDialog
          open
          onClose={() => setReq(null)}
          title={req.type === 'correction' ? t('privacy.correction') : t('privacy.grievance')}
          description={req.type === 'correction' ? t('privacy.correctionHint') : t('privacy.grievanceHint')}
          submitLabel={t('common.send')}
          disabled={req.details.trim().length < 5}
          onSubmit={async () => {
            await api.post('/v1/privacy/requests', { type: req.type, details: req.details.trim() });
            refresh();
          }}
        >
          <Textarea label={t('common.details')} value={req.details} onChange={(ev) => setReq({ ...req, details: ev.target.value })} rows={5} autoFocus />
        </FormDialog>
      )}
      {del && (
        <FormDialog
          open
          danger
          onClose={() => setDel(null)}
          title={t('privacy.deleteAccount')}
          description={t('privacy.deleteHint', { days: 7 })}
          submitLabel={t('privacy.deleteAccount')}
          disabled={del.confirm !== 'DELETE'}
          onSubmit={async () => {
            await withReauth(() => api.post('/v1/privacy/delete-account', { reason: del.reason.trim() || undefined }));
            refresh();
            router.refresh();
          }}
        >
          <Notice tone="danger">{t('privacy.deleteWhat')}</Notice>
          <Textarea label={t('privacy.whyLeaving')} optional value={del.reason} onChange={(ev) => setDel({ ...del, reason: ev.target.value })} rows={2} />
          <Input label={t('privacy.deleteConfirm')} value={del.confirm} onChange={(ev) => setDel({ ...del, confirm: ev.target.value })} autoComplete="off" />
        </FormDialog>
      )}
    </div>
  );
}
