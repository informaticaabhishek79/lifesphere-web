'use client';

import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { Lock, MessagesSquare, Plus, Search, ShieldAlert, Users } from 'lucide-react';
import { api } from '@/lib/api';
import { useAction, usePaged } from '@/lib/hooks';
import { useLocalities } from '@/lib/data';
import { useSession } from '@/lib/session';
import type { GroupDetail, GroupSummary, ModerationDecision, Post, PostKind } from '@/lib/types';
import { useI18n } from '@/i18n';
import { Badge, Button, Card, CardBody, CardHeader, EmptyState, ErrorNotice, List, ListItem, LoadingBlock, LoadMore, PageHeader, Tabs } from '@/components/ui';
import { Checkbox, Input, Select, Textarea } from '@/components/form';
import { FormDialog, useConfirm } from '@/components/dialog';
import { StatusBadge } from '@/components/status';
import { PostCard, POST_KINDS } from '@/components/community';

type Tab = 'feed' | 'groups' | 'invitations' | 'saved' | 'safety';

function Inner() {
  const { t } = useI18n();
  const params = useSearchParams();
  const [tab, setTab] = useState<Tab>((params.get('tab') as Tab) ?? 'feed');
  const invites = useQuery({ queryKey: ['community', 'invitations'], queryFn: () => api.get<{ id: string; groupId: string; groupName: string; expiresAt: string }[]>('/v1/community/groups/invitations') });
  return (
    <div className="max-w-3xl">
      <PageHeader title={t('nav.community')} description={t('community.intro')} />
      <Tabs<Tab>
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'feed', label: t('community.feed') },
          { value: 'groups', label: t('community.groups') },
          { value: 'invitations', label: t('contacts.incoming'), count: invites.data?.length },
          { value: 'saved', label: t('community.saved') },
          { value: 'safety', label: t('community.safety') },
        ]}
      />
      {tab === 'feed' && <Feed />}
      {tab === 'groups' && <Groups />}
      {tab === 'invitations' && <Invitations items={invites.data} />}
      {tab === 'saved' && <Saved />}
      {tab === 'safety' && <Safety />}
    </div>
  );
}

export default function CommunityPage() {
  return (
    <Suspense>
      <Inner />
    </Suspense>
  );
}

function Feed() {
  const { t, e } = useI18n();
  const qc = useQueryClient();
  const [kind, setKind] = useState('');
  const list = usePaged<Post>(['community', 'feed'], '/v1/community/feed', { kind: kind || undefined });
  return (
    <>
      <Select aria-label={t('common.type')} value={kind} onChange={(ev) => setKind(ev.target.value)} placeholder={t('common.all')} options={POST_KINDS.map((k) => ({ value: k, label: e('postKind', k) }))} fieldClassName="mb-4 w-56" />
      {list.isLoading && <LoadingBlock />}
      <ErrorNotice error={list.error} onRetry={list.refetch} />
      {!list.isLoading && list.items.length === 0 && <EmptyState icon={<MessagesSquare className="size-6" />} title={t('community.feedEmpty')} body={t('community.feedEmptyBody')} />}
      <div className="space-y-3">
        {list.items.map((p) => (
          <PostCard key={p.id} post={p} showGroup onChanged={() => qc.invalidateQueries({ queryKey: ['community'] })} />
        ))}
      </div>
      <LoadMore hasMore={list.hasMore} loading={list.loadingMore} onClick={list.loadMore} />
    </>
  );
}

function Groups() {
  const { t, e } = useI18n();
  const { me } = useSession();
  const router = useRouter();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [mine, setMine] = useState(false);
  const [nearby, setNearby] = useState(!!me.profile.locality);
  useEffect(() => {
    const id = setTimeout(() => setQ(search), 300);
    return () => clearTimeout(id);
  }, [search]);
  const list = usePaged<GroupSummary>(['community', 'groups'], '/v1/community/groups', { search: q || undefined, mine: mine ? 'true' : undefined, localityId: nearby && me.profile.locality ? me.profile.locality.id : undefined });
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: '', description: '', visibility: 'public', category: '', localityId: me.profile.locality?.id ?? '', postingPolicy: 'all_members', rules: '' });
  const localities = useLocalities();
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[14rem] flex-1">
          <Search className="pointer-events-none absolute top-3.5 start-3 size-4 text-muted" />
          <Input aria-label={t('common.search')} placeholder={t('community.searchGroups')} value={search} onChange={(ev) => setSearch(ev.target.value)} className="ps-9" />
        </div>
        <Button icon={<Plus className="size-4" />} onClick={() => setOpen(true)}>
          {t('community.newGroup')}
        </Button>
      </div>
      <div className="mb-4 flex flex-wrap gap-5">
        <Checkbox label={t('community.myGroups')} checked={mine} onChange={setMine} />
        {me.profile.locality && <Checkbox label={t('community.nearMe', { place: me.profile.locality.name })} checked={nearby} onChange={setNearby} />}
      </div>
      {list.isLoading && <LoadingBlock />}
      <ErrorNotice error={list.error} />
      {!list.isLoading && list.items.length === 0 && <EmptyState icon={<Users className="size-6" />} title={t('community.noGroups')} body={!me.profile.locality ? t('community.setLocality') : undefined} />}
      {list.items.length > 0 && (
        <List>
          {list.items.map((g) => (
            <ListItem
              key={g.id}
              href={`/community/groups/${g.id}`}
              leading={<span className="flex size-10 items-center justify-center rounded-xl bg-brand-soft text-brand">{g.visibility === 'public' ? <Users className="size-5" /> : <Lock className="size-5" />}</span>}
              title={g.name}
              subtitle={[g.localityName, t('households.memberCount', { count: g.memberCount }), g.description].filter(Boolean).join(' · ')}
              trailing={g.membership ? <StatusBadge group="membershipStatus" value={g.membership.status} /> : <Badge>{e('groupVisibility', g.visibility)}</Badge>}
            />
          ))}
        </List>
      )}
      <LoadMore hasMore={list.hasMore} loading={list.loadingMore} onClick={list.loadMore} />
      <FormDialog
        open={open}
        onClose={() => setOpen(false)}
        title={t('community.newGroup')}
        submitLabel={t('common.create')}
        size="lg"
        disabled={!f.name.trim()}
        onSubmit={async () => {
          const g = await api.post<GroupDetail>('/v1/community/groups', {
            name: f.name.trim(),
            description: f.description.trim() || undefined,
            visibility: f.visibility,
            category: f.category.trim() || undefined,
            localityId: f.localityId || undefined,
            postingPolicy: f.postingPolicy,
            rules: f.rules.trim() || undefined,
          });
          qc.invalidateQueries({ queryKey: ['community'] });
          router.push(`/community/groups/${g.id}`);
        }}
      >
        <Input label={t('common.name')} placeholder={t('community.groupNamePlaceholder')} value={f.name} onChange={(ev) => setF({ ...f, name: ev.target.value })} maxLength={80} autoFocus />
        <Textarea label={t('common.description')} optional value={f.description} onChange={(ev) => setF({ ...f, description: ev.target.value })} rows={2} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label={t('community.visibility')} value={f.visibility} onChange={(ev) => setF({ ...f, visibility: ev.target.value })} options={(['public', 'private', 'invite_only'] as const).map((v) => ({ value: v, label: e('groupVisibility', v) }))} />
          <Select label={t('community.whoCanPost')} value={f.postingPolicy} onChange={(ev) => setF({ ...f, postingPolicy: ev.target.value })} options={(['all_members', 'admins_only'] as const).map((v) => ({ value: v, label: e('postingPolicy', v) }))} />
          <Input label={t('common.category')} optional placeholder={t('community.categoryPlaceholder')} value={f.category} onChange={(ev) => setF({ ...f, category: ev.target.value })} />
          <Select label={t('settings.locality')} value={f.localityId} onChange={(ev) => setF({ ...f, localityId: ev.target.value })} placeholder={t('common.none')} options={(localities.data ?? []).map((l) => ({ value: l.id, label: `${l.name}, ${l.city}` }))} />
        </div>
        <Textarea label={t('community.rules')} optional value={f.rules} onChange={(ev) => setF({ ...f, rules: ev.target.value })} rows={3} />
      </FormDialog>
    </>
  );
}

function Invitations({ items }: { items?: { id: string; groupId: string; groupName: string; expiresAt: string }[] }) {
  const { t } = useI18n();
  const { fmt } = useSession();
  const respond = useAction(({ id, accept }: { id: string; accept: boolean }) => api.post(`/v1/community/groups/invitations/${id}/respond`, { accept }), { invalidate: [['community']] });
  if (!items?.length) return <EmptyState title={t('contacts.noIncoming')} />;
  return (
    <div className="space-y-3">
      {items.map((i) => (
        <Card key={i.id}>
          <CardBody className="flex flex-wrap items-center gap-3 pt-4">
            <div className="flex-1">
              <Link href={`/community/groups/${i.groupId}`} className="font-semibold hover:text-brand">
                {i.groupName}
              </Link>
              <div className="text-sm text-muted">{t('invite.expires', { date: fmt.date(i.expiresAt) })}</div>
            </div>
            <Button size="sm" variant="ghost" onClick={() => respond.mutate({ id: i.id, accept: false })}>
              {t('common.decline')}
            </Button>
            <Button size="sm" onClick={() => respond.mutate({ id: i.id, accept: true })}>
              {t('common.accept')}
            </Button>
          </CardBody>
        </Card>
      ))}
    </div>
  );
}

function Saved() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const list = usePaged<Post>(['community', 'bookmarks'], '/v1/community/bookmarks');
  return (
    <>
      {list.isLoading && <LoadingBlock />}
      {!list.isLoading && list.items.length === 0 && <EmptyState title={t('community.noSaved')} />}
      <div className="space-y-3">
        {list.items.map((p) => (
          <PostCard key={p.id} post={p} onChanged={() => qc.invalidateQueries({ queryKey: ['community'] })} />
        ))}
      </div>
      <LoadMore hasMore={list.hasMore} loading={list.loadingMore} onClick={list.loadMore} />
    </>
  );
}

function Safety() {
  const { t, e } = useI18n();
  const { fmt } = useSession();
  const qc = useQueryClient();
  const confirm = useConfirm();
  const blocks = useQuery({ queryKey: ['community', 'blocks'], queryFn: () => api.get<{ userId: string; displayName: string; createdAt: string }[]>('/v1/community/blocks') });
  const reports = useQuery({ queryKey: ['community', 'reports'], queryFn: () => api.get<{ id: string; targetType: string; reason: string; status: string; createdAt: string }[]>('/v1/community/reports') });
  const decisions = useQuery({ queryKey: ['community', 'decisions'], queryFn: () => api.get<ModerationDecision[]>('/v1/community/moderation-decisions') });
  const unblock = useAction((id: string) => api.del(`/v1/community/blocks/${id}`), { invalidate: [['community']] });
  const [appealFor, setAppealFor] = useState<ModerationDecision | null>(null);
  const [statement, setStatement] = useState('');
  return (
    <div className="space-y-5">
      <Card>
        <CardHeader icon={<ShieldAlert className="size-5" />} title={t('community.decisions')} description={t('community.decisionsHint')} />
        <CardBody>
          {decisions.data?.length === 0 && <p className="text-sm text-muted">{t('community.noDecisions')}</p>}
          <ul className="divide-y divide-line">
            {decisions.data?.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <div className="font-medium">
                    {e('moderationAction', d.action)} · {e('reportTarget', d.targetType)}
                  </div>
                  <div className="text-sm text-muted">
                    {d.reason} · {fmt.date(d.createdAt)}
                    {d.expiresAt && ` · ${t('sharing.until', { date: fmt.date(d.expiresAt) })}`}
                  </div>
                </div>
                {d.appeal ? (
                  <StatusBadge group="appealStatus" value={d.appeal.status} />
                ) : (
                  <Button size="sm" variant="secondary" onClick={() => { setStatement(''); setAppealFor(d); }}>
                    {t('community.appeal')}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>
      <Card>
        <CardHeader title={t('community.myReports')} />
        <CardBody>
          {reports.data?.length === 0 && <p className="text-sm text-muted">{t('common.emptyList')}</p>}
          <ul className="divide-y divide-line">
            {reports.data?.map((r) => (
              <li key={r.id} className="flex items-center gap-3 py-2.5 text-sm">
                <span className="flex-1">
                  {e('reportTarget', r.targetType)} · {e('reportReason', r.reason)} · {fmt.date(r.createdAt)}
                </span>
                <StatusBadge group="reportStatus" value={r.status} />
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>
      <Card>
        <CardHeader title={t('community.blocked')} description={t('community.blockedHint')} />
        <CardBody>
          {blocks.data?.length === 0 && <p className="text-sm text-muted">{t('community.noBlocked')}</p>}
          <ul className="divide-y divide-line">
            {blocks.data?.map((b) => (
              <li key={b.userId} className="flex items-center gap-3 py-2.5">
                <span className="flex-1 font-medium">{b.displayName}</span>
                <Button size="sm" variant="ghost" onClick={async () => { if (await confirm({ title: t('community.unblock'), body: b.displayName })) unblock.mutate(b.userId); }}>
                  {t('community.unblock')}
                </Button>
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>
      <FormDialog
        open={!!appealFor}
        onClose={() => setAppealFor(null)}
        title={t('community.appeal')}
        description={t('community.appealHint')}
        submitLabel={t('common.submit')}
        disabled={statement.trim().length < 10}
        onSubmit={async () => {
          await api.post(`/v1/community/moderation-decisions/${appealFor!.id}/appeal`, { statement: statement.trim() });
          qc.invalidateQueries({ queryKey: ['community', 'decisions'] });
        }}
      >
        <Textarea label={t('community.appealStatement')} value={statement} onChange={(ev) => setStatement(ev.target.value)} rows={4} maxLength={2000} autoFocus />
      </FormDialog>
    </div>
  );
}
