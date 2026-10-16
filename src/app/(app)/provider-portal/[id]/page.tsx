'use client';

import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Pencil, Plus, Send, Trash2, UserPlus } from 'lucide-react';
import { api } from '@/lib/api';
import { useAction, usePaged } from '@/lib/hooks';
import { useLocalities, usePeople, useServiceCategories } from '@/lib/data';
import { useSession } from '@/lib/session';
import type { ProviderProfile, Review, ServiceRequest } from '@/lib/types';
import { useI18n } from '@/i18n';
import { Badge, Button, Card, CardBody, CardHeader, EmptyState, ErrorNotice, IconButton, KeyValue, List, ListItem, LoadingBlock, LoadMore, Notice, PageHeader, Tabs } from '@/components/ui';
import { CheckboxGroup, Input, Select, Switch, Textarea } from '@/components/form';
import { FormDialog, useConfirm } from '@/components/dialog';
import { StatusBadge } from '@/components/status';
import { VerificationBadge } from '@/components/services';

interface PortalDetail extends ProviderProfile {
  myRole: 'owner' | 'staff';
  verificationLabel: string;
  verification: { id: string; checkType: string; status: string; checkedAt: string | null; expiresAt: string | null }[];
  members: { userId: string; role: 'owner' | 'staff'; displayName: string }[];
  services: { id: string; categoryId: string; title: string; description: string | null; priceNote: string | null; active: boolean }[];
  areaLocalityIds: string[];
}
type Tab = 'profile' | 'services' | 'areas' | 'requests' | 'open' | 'reviews' | 'team';

export default function PortalProviderPage() {
  const { id } = useParams<{ id: string }>();
  const { t, e } = useI18n();
  const { fmt, me } = useSession();
  const qc = useQueryClient();
  const confirm = useConfirm();
  const key = ['portal', id];
  const q = useQuery({ queryKey: key, queryFn: () => api.get<PortalDetail>(`/v1/provider-portal/providers/${id}`) });
  const categories = useServiceCategories();
  const localities = useLocalities();
  const { others } = usePeople();
  const [tab, setTab] = useState<Tab>('profile');
  const requests = usePaged<ServiceRequest>(['portal', id, 'requests'], `/v1/provider-portal/providers/${id}/requests`, {}, { enabled: tab === 'requests' });
  const open = useQuery({ queryKey: ['portal', id, 'open'], queryFn: () => api.get<ServiceRequest[]>(`/v1/provider-portal/providers/${id}/open-requests`), enabled: tab === 'open' });
  const reviews = usePaged<Review>(['portal', id, 'reviews'], `/v1/services/providers/${id}/reviews`, {}, { enabled: tab === 'reviews' });
  const [edit, setEdit] = useState<Record<string, string> | null>(null);
  const [svc, setSvc] = useState<{ id?: string; categoryId: string; title: string; description: string; priceNote: string } | null>(null);
  const [areas, setAreas] = useState<string[]>([]);
  const [member, setMember] = useState<{ userId: string; role: 'owner' | 'staff' } | null>(null);
  const [respondTo, setRespondTo] = useState<{ id: string; response: string } | null>(null);
  useEffect(() => {
    if (q.data) setAreas(q.data.areaLocalityIds);
  }, [q.data]);
  const refresh = () => qc.invalidateQueries({ queryKey: ['portal'] });
  const submit = useAction(() => api.post(`/v1/provider-portal/providers/${id}/submit`), { onSuccess: refresh, success: t('portal.submitted') });
  const saveAreas = useAction(() => api.put(`/v1/provider-portal/providers/${id}/areas`, { localityIds: areas }), { onSuccess: refresh, success: t('common.saved') });
  const toggleSvc = useAction((s: PortalDetail['services'][number]) => api.patch(`/v1/provider-portal/providers/${id}/services/${s.id}`, { active: !s.active }), { onSuccess: refresh });
  const delSvc = useAction((sid: string) => api.del(`/v1/provider-portal/providers/${id}/services/${sid}`), { onSuccess: refresh });
  const delMember = useAction((uid: string) => api.del(`/v1/provider-portal/providers/${id}/members/${uid}`), { onSuccess: refresh });
  const claim = useAction((rid: string) => api.post(`/v1/provider-portal/providers/${id}/open-requests/${rid}/claim`), { onSuccess: () => { refresh(); setTab('requests'); }, success: t('portal.claimed') });

  if (q.isLoading) return <LoadingBlock rows={4} />;
  if (q.error || !q.data) return <ErrorNotice error={q.error} onRetry={q.refetch} />;
  const p = q.data;
  const owner = p.myRole === 'owner';
  const catName = (cid: string) => categories.data?.find((c) => c.id === cid)?.name ?? '';

  return (
    <div className="max-w-3xl">
      <PageHeader
        back={{ href: '/provider-portal', label: t('nav.providerPortal') }}
        title={p.displayName}
        description={e('providerType', p.providerType)}
        actions={
          <>
            <StatusBadge group="providerStatus" value={p.status} />
            {owner && (p.status === 'draft' || p.status === 'rejected') && (
              <Button icon={<Send className="size-4" />} loading={submit.isPending} onClick={() => submit.mutate()}>
                {t('portal.submit')}
              </Button>
            )}
          </>
        }
      />
      {p.status === 'rejected' && p.rejectionReason && <Notice tone="danger" className="mb-4" title={t('portal.rejected')}>{p.rejectionReason}</Notice>}
      {p.status === 'pending_review' && <Notice tone="info" className="mb-4">{t('portal.underReview')}</Notice>}
      {p.status === 'draft' && <Notice tone="info" className="mb-4">{t('portal.draftHint')}</Notice>}
      <Tabs<Tab>
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'profile', label: t('settings.profile') },
          { value: 'services', label: t('services.services') },
          { value: 'areas', label: t('portal.areas') },
          { value: 'requests', label: t('portal.requests') },
          { value: 'open', label: t('portal.openRequests') },
          { value: 'reviews', label: t('services.reviews') },
          { value: 'team', label: t('portal.team') },
        ]}
      />

      {tab === 'profile' && (
        <div className="space-y-5">
          <Card>
            <CardHeader
              title={t('settings.profile')}
              action={
                owner ? (
                  <Button size="sm" variant="secondary" icon={<Pencil className="size-4" />} onClick={() => setEdit({ displayName: p.displayName, description: p.description ?? '', phonePublic: p.phonePublic ?? '', emailPublic: p.emailPublic ?? '', websiteUrl: p.websiteUrl ?? '' })}>
                    {t('common.edit')}
                  </Button>
                ) : undefined
              }
            />
            <CardBody>
              <KeyValue
                items={[
                  { label: t('common.description'), value: p.description },
                  { label: t('portal.publicPhone'), value: p.phonePublic },
                  { label: t('portal.publicEmail'), value: p.emailPublic },
                  { label: t('consumer.website'), value: p.websiteUrl },
                  { label: t('portal.sponsored'), value: p.isSponsored ? t('common.yes') : undefined },
                ]}
              />
            </CardBody>
          </Card>
          <Card>
            <CardHeader title={t('services.checks')} description={p.verificationLabel} action={<VerificationBadge level={p.verificationLevel} />} />
            <CardBody>
              {p.verification.length === 0 ? (
                <p className="text-sm text-muted">{t('portal.noChecks')}</p>
              ) : (
                <ul className="space-y-2">
                  {p.verification.map((v) => (
                    <li key={v.id} className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="flex-1 font-medium">{e('verificationCheck', v.checkType)}</span>
                      <StatusBadge group="verificationStatus" value={v.status} />
                      {v.expiresAt && <span className="text-muted">{t('sharing.until', { date: fmt.date(v.expiresAt) })}</span>}
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-3 text-[0.82rem] text-muted">{t('portal.checksHint')}</p>
            </CardBody>
          </Card>
        </div>
      )}

      {tab === 'services' && (
        <div className="space-y-3">
          {owner && (
            <div className="flex justify-end">
              <Button size="sm" icon={<Plus className="size-4" />} onClick={() => setSvc({ categoryId: '', title: '', description: '', priceNote: '' })}>
                {t('portal.addService')}
              </Button>
            </div>
          )}
          {p.services.length === 0 && <EmptyState title={t('portal.noServices')} />}
          <ul className="card divide-y divide-line">
            {p.services.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{s.title}</div>
                  <div className="text-sm text-muted">{[catName(s.categoryId), s.priceNote].filter(Boolean).join(' · ')}</div>
                </div>
                {owner && (
                  <>
                    <Switch label={<span className="sr-only">{t('inventory.active')}</span>} checked={s.active} onChange={() => toggleSvc.mutate(s)} />
                    <IconButton label={t('common.edit')} onClick={() => setSvc({ id: s.id, categoryId: s.categoryId, title: s.title, description: s.description ?? '', priceNote: s.priceNote ?? '' })}>
                      <Pencil className="size-4" />
                    </IconButton>
                    <IconButton label={t('common.delete')} onClick={() => delSvc.mutate(s.id)}>
                      <Trash2 className="size-4" />
                    </IconButton>
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {tab === 'areas' && (
        <Card>
          <CardHeader title={t('portal.areas')} description={t('portal.areasHint')} />
          <CardBody className="space-y-4">
            <CheckboxGroup options={(localities.data ?? []).map((l) => ({ value: l.id, label: `${l.name}, ${l.city}` }))} value={areas} onChange={owner ? setAreas : () => {}} />
            {owner && (
              <Button onClick={() => saveAreas.mutate()} loading={saveAreas.isPending}>
                {t('common.save')}
              </Button>
            )}
          </CardBody>
        </Card>
      )}

      {tab === 'requests' && (
        <>
          {requests.isLoading && <LoadingBlock />}
          {!requests.isLoading && requests.items.length === 0 && <EmptyState title={t('services.noRequests')} />}
          {requests.items.length > 0 && (
            <List>
              {requests.items.map((r) => (
                <ListItem key={r.id} href={`/service-requests/${r.id}`} title={r.title} subtitle={r.scheduledAt ? t('services.scheduledFor', { when: fmt.dateTime(r.scheduledAt) }) : fmt.ago(r.createdAt)} trailing={<StatusBadge group="serviceRequestStatus" value={r.status} />} />
              ))}
            </List>
          )}
          <LoadMore hasMore={requests.hasMore} loading={requests.loadingMore} onClick={requests.loadMore} />
        </>
      )}

      {tab === 'open' && (
        <div className="space-y-3">
          <p className="text-sm text-muted">{t('portal.openHint')}</p>
          {p.status !== 'active' && <Notice tone="warn">{t('portal.mustBeActive')}</Notice>}
          {open.isLoading && <LoadingBlock />}
          {open.data?.length === 0 && <EmptyState title={t('portal.noOpen')} />}
          {open.data?.map((r) => (
            <Card key={r.id}>
              <CardBody className="flex flex-wrap items-center gap-3 pt-4">
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">{r.title}</div>
                  <div className="text-sm text-muted">{[catName(r.categoryId), fmt.ago(r.createdAt)].join(' · ')}</div>
                  {r.description && <p className="mt-1 text-sm">{r.description}</p>}
                </div>
                <Button size="sm" onClick={() => claim.mutate(r.id)} disabled={p.status !== 'active'}>
                  {t('portal.claim')}
                </Button>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {tab === 'reviews' && (
        <div className="space-y-3">
          {reviews.items.length === 0 && <EmptyState title={t('services.noReviews')} />}
          {reviews.items.map((r) => (
            <Card key={r.id}>
              <CardBody className="pt-4">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-semibold">{r.reviewerName}</span>
                  <span className="text-warn">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                  <span className="text-muted">{fmt.date(r.createdAt)}</span>
                </div>
                {r.body && <p className="mt-1">{r.body}</p>}
                {r.providerResponse ? (
                  <p className="mt-2 rounded-lg bg-surface-2 px-3 py-2 text-sm">{r.providerResponse}</p>
                ) : (
                  <Button size="sm" variant="secondary" className="mt-2" onClick={() => setRespondTo({ id: r.id, response: '' })}>
                    {t('portal.respond')}
                  </Button>
                )}
              </CardBody>
            </Card>
          ))}
          <LoadMore hasMore={reviews.hasMore} loading={reviews.loadingMore} onClick={reviews.loadMore} />
        </div>
      )}

      {tab === 'team' && (
        <div className="space-y-3">
          {owner && others.length > 0 && (
            <div className="flex justify-end">
              <Button size="sm" icon={<UserPlus className="size-4" />} onClick={() => setMember({ userId: '', role: 'staff' })}>
                {t('portal.addMember')}
              </Button>
            </div>
          )}
          <ul className="card divide-y divide-line">
            {p.members.map((m) => (
              <li key={m.userId} className="flex items-center gap-3 px-4 py-3">
                <span className="flex-1 font-medium">{m.userId === me.id ? `${m.displayName} (${t('common.you')})` : m.displayName}</span>
                <Badge>{m.role === 'owner' ? t('portal.owner') : t('portal.staff')}</Badge>
                {owner && m.userId !== me.id && (
                  <IconButton label={t('common.remove')} onClick={async () => { if (await confirm({ title: t('common.remove'), body: m.displayName })) delMember.mutate(m.userId); }}>
                    <Trash2 className="size-4" />
                  </IconButton>
                )}
              </li>
            ))}
          </ul>
          <p className="text-sm text-muted">
            <Link href="/contacts" className="font-semibold text-brand">
              {t('nav.contacts')}
            </Link>{' '}
            — {t('portal.teamHint')}
          </p>
        </div>
      )}

      {edit && (
        <FormDialog
          open
          onClose={() => setEdit(null)}
          title={t('common.edit')}
          disabled={!edit.displayName?.trim()}
          onSubmit={async () => {
            await api.patch(`/v1/provider-portal/providers/${id}`, Object.fromEntries(Object.entries(edit).map(([k, v]) => [k, v.trim() || undefined])));
            refresh();
          }}
        >
          <Input label={t('portal.displayName')} value={edit.displayName} onChange={(ev) => setEdit({ ...edit, displayName: ev.target.value })} />
          <Textarea label={t('common.description')} value={edit.description} onChange={(ev) => setEdit({ ...edit, description: ev.target.value })} rows={3} />
          <Input label={t('portal.publicPhone')} value={edit.phonePublic} onChange={(ev) => setEdit({ ...edit, phonePublic: ev.target.value })} />
          <Input label={t('portal.publicEmail')} value={edit.emailPublic} onChange={(ev) => setEdit({ ...edit, emailPublic: ev.target.value })} />
          <Input label={t('consumer.website')} value={edit.websiteUrl} onChange={(ev) => setEdit({ ...edit, websiteUrl: ev.target.value })} />
        </FormDialog>
      )}
      {svc && (
        <FormDialog
          open
          onClose={() => setSvc(null)}
          title={svc.id ? t('common.edit') : t('portal.addService')}
          disabled={!svc.categoryId || !svc.title.trim()}
          onSubmit={async () => {
            const body = { title: svc.title.trim(), description: svc.description.trim() || undefined, priceNote: svc.priceNote.trim() || undefined };
            if (svc.id) await api.patch(`/v1/provider-portal/providers/${id}/services/${svc.id}`, body);
            else await api.post(`/v1/provider-portal/providers/${id}/services`, { ...body, categoryId: svc.categoryId });
            refresh();
          }}
        >
          <Select label={t('common.category')} value={svc.categoryId} disabled={!!svc.id} onChange={(ev) => setSvc({ ...svc, categoryId: ev.target.value })} placeholder={t('common.selectPlaceholder')} options={(categories.data ?? []).map((c) => ({ value: c.id, label: c.seniorSupport ? `${c.name} — ${t('portal.screeningRequired')}` : c.name }))} />
          <Input label={t('common.title')} value={svc.title} onChange={(ev) => setSvc({ ...svc, title: ev.target.value })} />
          <Textarea label={t('common.description')} optional value={svc.description} onChange={(ev) => setSvc({ ...svc, description: ev.target.value })} rows={2} />
          <Input label={t('portal.priceNote')} optional placeholder={t('portal.priceNotePlaceholder')} value={svc.priceNote} onChange={(ev) => setSvc({ ...svc, priceNote: ev.target.value })} />
        </FormDialog>
      )}
      {member && (
        <FormDialog
          open
          onClose={() => setMember(null)}
          title={t('portal.addMember')}
          disabled={!member.userId}
          onSubmit={async () => {
            await api.post(`/v1/provider-portal/providers/${id}/members`, member);
            refresh();
          }}
        >
          <Select label={t('tasks.person')} value={member.userId} onChange={(ev) => setMember({ ...member, userId: ev.target.value })} placeholder={t('common.selectPlaceholder')} options={others.map((o) => ({ value: o.userId, label: o.displayName }))} />
          <Select label={t('common.role')} value={member.role} onChange={(ev) => setMember({ ...member, role: ev.target.value as 'owner' | 'staff' })} options={[{ value: 'staff', label: t('portal.staff') }, { value: 'owner', label: t('portal.owner') }]} />
        </FormDialog>
      )}
      {respondTo && (
        <FormDialog
          open
          onClose={() => setRespondTo(null)}
          title={t('portal.respond')}
          disabled={!respondTo.response.trim()}
          onSubmit={async () => {
            await api.post(`/v1/provider-portal/providers/${id}/reviews/${respondTo.id}/response`, { response: respondTo.response.trim() });
            qc.invalidateQueries({ queryKey: ['portal', id, 'reviews'] });
          }}
        >
          <Textarea label={t('portal.yourResponse')} value={respondTo.response} onChange={(ev) => setRespondTo({ ...respondTo, response: ev.target.value })} rows={3} autoFocus />
        </FormDialog>
      )}
    </div>
  );
}
