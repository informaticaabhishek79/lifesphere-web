'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { Suspense, useMemo, useState } from 'react';
import { Clock, Eye, ShieldCheck } from 'lucide-react';
import { api } from '@/lib/api';
import { useAction } from '@/lib/hooks';
import { useContacts } from '@/lib/data';
import { useSession } from '@/lib/session';
import { GRANT_SCOPES, type Grant, type GrantScope } from '@/lib/types';
import { useI18n } from '@/i18n';
import { Avatar, Badge, Button, Card, CardBody, CardHeader, EmptyState, ErrorNotice, LoadingBlock, Notice, PageHeader, Tabs } from '@/components/ui';
import { Input, Switch } from '@/components/form';
import { useConfirm } from '@/components/dialog';
import { StatusBadge } from '@/components/status';

type Tab = 'give' | 'received' | 'who' | 'history';

function Inner() {
  const { t, e } = useI18n();
  const { fmt } = useSession();
  const params = useSearchParams();
  const qc = useQueryClient();
  const confirm = useConfirm();
  const [tab, setTab] = useState<Tab>('give');
  const contacts = useContacts();
  const grants = useQuery({ queryKey: ['grants', 'live'], queryFn: () => api.get<Grant[]>('/v1/grants', { direction: 'all' }) });
  const history = useQuery({ queryKey: ['grants', 'history'], queryFn: () => api.get<Grant[]>('/v1/grants', { direction: 'all', includeInactive: 'true' }), enabled: tab === 'history' });
  const who = useQuery({ queryKey: ['grants', 'who'], queryFn: () => api.get<{ people: { granteeId: string; name: string; access: string[] }[]; total: number }>('/v1/grants/who-can-see-me'), enabled: tab === 'who' });
  const focus = params.get('with');
  const [expiresAt, setExpiresAt] = useState<Record<string, string>>({});

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['grants'] });
    qc.invalidateQueries({ queryKey: ['contacts'] });
    qc.invalidateQueries({ queryKey: ['dashboard'] });
  };
  const give = useAction(({ granteeId, scope }: { granteeId: string; scope: GrantScope }) => api.post('/v1/grants', { granteeId, scopes: [scope], expiresAt: expiresAt[granteeId] ? new Date(`${expiresAt[granteeId]}T23:59:00`).toISOString() : undefined }), {
    onSuccess: refresh,
    success: t('sharing.startsSoon'),
  });
  const revoke = useAction((id: string) => api.del(`/v1/grants/${id}`), { onSuccess: refresh, success: t('sharing.stopped') });

  const given = useMemo(() => (grants.data ?? []).filter((g) => g.direction === 'given'), [grants.data]);
  const received = useMemo(() => (grants.data ?? []).filter((g) => g.direction === 'received'), [grants.data]);
  const people = [...(contacts.data ?? [])].sort((a, b) => (a.contactUserId === focus ? -1 : b.contactUserId === focus ? 1 : 0));

  return (
    <div className="max-w-3xl">
      <PageHeader title={t('nav.sharing')} description={t('sharing.intro')} />
      <Notice tone="info" className="mb-5" title={t('sharing.rulesTitle')}>
        {t('sharing.rules')}
      </Notice>
      <Tabs<Tab>
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'give', label: t('sharing.whatIShare') },
          { value: 'received', label: t('sharing.sharedWithMe'), count: received.length || undefined },
          { value: 'who', label: t('sharing.whoCanSeeMe') },
          { value: 'history', label: t('sharing.history') },
        ]}
      />
      {(grants.isLoading || contacts.isLoading) && <LoadingBlock />}
      <ErrorNotice error={grants.error} />

      {tab === 'give' && (
        <div className="space-y-4">
          {contacts.data?.length === 0 && <EmptyState title={t('contacts.empty')} body={t('sharing.needContact')} />}
          {people.map((c) => {
            const mine = given.filter((g) => g.granteeId === c.contactUserId);
            return (
              <Card key={c.contactUserId} className={c.contactUserId === focus ? 'border-brand' : undefined}>
                <CardHeader icon={<Avatar name={c.displayName} size="sm" />} title={c.displayName} description={c.label ?? undefined} />
                <CardBody className="space-y-1">
                  {GRANT_SCOPES.map((scope) => {
                    const g = mine.find((x) => x.scope === scope);
                    return (
                      <div key={scope} className="flex items-center gap-3 border-b border-line py-1.5 last:border-0">
                        <div className="flex-1">
                          <Switch
                            label={e('grantScope', scope)}
                            hint={g?.status === 'pending_cooloff' ? t('sharing.startsAt', { when: fmt.dateTime(g.effectiveAt) }) : g?.expiresAt ? t('sharing.until', { date: fmt.date(g.expiresAt) }) : undefined}
                            checked={!!g}
                            disabled={give.isPending || revoke.isPending}
                            onChange={async (on) => {
                              if (on) give.mutate({ granteeId: c.contactUserId, scope });
                              else if (g && (await confirm({ title: t('sharing.stopTitle'), body: `${c.displayName}: ${e('grantScope', scope)}` }))) revoke.mutate(g.id);
                            }}
                          />
                        </div>
                        {g && <StatusBadge group="grantStatus" value={g.status} />}
                      </div>
                    );
                  })}
                  <div className="pt-3">
                    <Input type="date" label={t('sharing.autoEnd')} hint={t('sharing.autoEndHint')} optional value={expiresAt[c.contactUserId] ?? ''} onChange={(ev) => setExpiresAt({ ...expiresAt, [c.contactUserId]: ev.target.value })} fieldClassName="max-w-xs" />
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}

      {tab === 'received' && (
        <div className="space-y-3">
          {received.length === 0 && <EmptyState icon={<Eye className="size-6" />} title={t('sharing.nothingReceived')} />}
          {Object.entries(
            received.reduce<Record<string, Grant[]>>((m, g) => {
              (m[g.grantorId] ??= []).push(g);
              return m;
            }, {}),
          ).map(([grantorId, gs]) => (
            <Card key={grantorId}>
              <CardHeader icon={<Avatar name={gs[0]!.grantorName} size="sm" />} title={gs[0]!.grantorName} description={t('sharing.letsYou')} />
              <CardBody>
                <ul className="space-y-2">
                  {gs.map((g) => (
                    <li key={g.id} className="flex flex-wrap items-center gap-2">
                      <span className="flex-1">{e('grantScope', g.scope)}</span>
                      <StatusBadge group="grantStatus" value={g.status} />
                      <Button size="sm" variant="ghost" onClick={async () => { if (await confirm({ title: t('sharing.declineTitle'), body: e('grantScope', g.scope) })) revoke.mutate(g.id); }}>
                        {t('sharing.noThanks')}
                      </Button>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {tab === 'who' && (
        <Card>
          <CardHeader icon={<ShieldCheck className="size-5" />} title={t('sharing.whoCanSeeMe')} description={who.data ? t('sharing.peopleCount', { count: who.data.total }) : undefined} />
          <CardBody>
            {who.data?.people.length === 0 && <p className="text-muted">{t('sharing.nobody')}</p>}
            <ul className="divide-y divide-line">
              {who.data?.people.map((p) => (
                <li key={p.granteeId} className="py-3">
                  <div className="font-semibold">{p.name}</div>
                  <ul className="mt-1 list-disc pl-5 text-sm text-ink-2">
                    {p.access.map((a) => (
                      <li key={a}>{a}</li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}

      {tab === 'history' && (
        <ul className="card divide-y divide-line">
          {history.isLoading && <li className="p-4"><LoadingBlock rows={2} /></li>}
          {history.data?.map((g) => (
            <li key={g.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
              <Clock className="size-4 text-muted" />
              <span className="flex-1">
                {g.direction === 'given' ? t('sharing.youTo', { name: g.granteeName }) : t('sharing.fromThem', { name: g.grantorName })}: {e('grantScope', g.scope)}
              </span>
              <span className="text-muted">{fmt.date(g.createdAt)}</span>
              <StatusBadge group="grantStatus" value={g.status} />
              {g.revokedAt && <Badge>{t('sharing.endedOn', { date: fmt.date(g.revokedAt) })}</Badge>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function SharingPage() {
  return (
    <Suspense>
      <Inner />
    </Suspense>
  );
}
