'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { Ban, Lock, LogIn, LogOut, PenSquare, Settings2, Trash2, UserPlus, Users } from 'lucide-react';
import { api } from '@/lib/api';
import { useAction, usePaged } from '@/lib/hooks';
import { usePeople } from '@/lib/data';
import { useSession } from '@/lib/session';
import type { GroupDetail, GroupRole, Post } from '@/lib/types';
import { useI18n } from '@/i18n';
import { Avatar, Badge, Button, Card, CardBody, EmptyState, ErrorNotice, LoadingBlock, LoadMore, Notice, PageHeader, Tabs } from '@/components/ui';
import { Input, Select, Textarea } from '@/components/form';
import { FormDialog, useConfirm } from '@/components/dialog';
import { StatusBadge } from '@/components/status';
import { emptyPost, PostCard, PostFields, postBody, ReportButton } from '@/components/community';

type Tab = 'posts' | 'members' | 'about';
interface Member {
  userId: string;
  displayName: string;
  role: GroupRole;
  status: string;
  joinedAt: string;
}

export default function GroupPage() {
  const { id } = useParams<{ id: string }>();
  const { t, e } = useI18n();
  const { me, fmt } = useSession();
  const router = useRouter();
  const qc = useQueryClient();
  const confirm = useConfirm();
  const g = useQuery({ queryKey: ['community', 'group', id], queryFn: () => api.get<GroupDetail>(`/v1/community/groups/${id}`) });
  const [tab, setTab] = useState<Tab>('posts');
  const canRead = !!g.data?.canRead;
  const posts = usePaged<Post, { pinned: Post[] }>(['community', 'group-posts', id], `/v1/community/groups/${id}/posts`, {}, { enabled: canRead });
  const role = g.data?.membership?.status === 'active' ? g.data.membership.role : null;
  const isStaff = role === 'owner' || role === 'admin' || role === 'moderator';
  const isAdmin = role === 'owner' || role === 'admin';
  const [memberFilter, setMemberFilter] = useState<'active' | 'pending'>('active');
  const members = useQuery({ queryKey: ['community', 'members', id, memberFilter], queryFn: () => api.get<Member[]>(`/v1/community/groups/${id}/members`, { status: memberFilter }), enabled: canRead && tab === 'members' });
  const { others } = usePeople();
  const [composer, setComposer] = useState(false);
  const [post, setPost] = useState(emptyPost());
  const [editOpen, setEditOpen] = useState(false);
  const [edit, setEdit] = useState({ name: '', description: '', visibility: 'public', postingPolicy: 'all_members', rules: '', category: '' });
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteUser, setInviteUser] = useState('');
  const [heldNotice, setHeldNotice] = useState<string | null>(null);

  const refresh = () => qc.invalidateQueries({ queryKey: ['community'] });
  const join = useAction(() => api.post(`/v1/community/groups/${id}/join`), { onSuccess: refresh });
  const leave = useAction(() => api.post(`/v1/community/groups/${id}/leave`), { onSuccess: refresh });
  const updateMember = useAction(({ userId, ...body }: { userId: string; role?: string; status?: string }) => api.patch(`/v1/community/groups/${id}/members/${userId}`, body), { onSuccess: refresh });
  const removeMember = useAction((userId: string) => api.del(`/v1/community/groups/${id}/members/${userId}`), { onSuccess: refresh });

  if (g.isLoading) return <LoadingBlock rows={4} />;
  if (g.error || !g.data) return <ErrorNotice error={g.error} onRetry={g.refetch} />;
  const group = g.data;
  const canPost = role && (group.postingPolicy === 'all_members' || isAdmin);
  const pinned = posts.first?.pinned ?? [];

  return (
    <div className="max-w-3xl">
      <PageHeader
        back={{ href: '/community?tab=groups', label: t('community.groups') }}
        title={group.name}
        description={[group.localityName, t('households.memberCount', { count: group.memberCount }), e('groupVisibility', group.visibility)].filter(Boolean).join(' · ')}
        actions={
          <>
            {!group.membership || group.membership.status === 'left' ? (
              group.visibility !== 'invite_only' && (
                <Button icon={<LogIn className="size-4" />} loading={join.isPending} onClick={() => join.mutate()}>
                  {group.visibility === 'private' ? t('community.askToJoin') : t('community.join')}
                </Button>
              )
            ) : group.membership.status === 'pending' ? (
              <Badge tone="warn">{t('community.requestPending')}</Badge>
            ) : group.membership.status === 'active' && role !== 'owner' ? (
              <Button variant="secondary" icon={<LogOut className="size-4" />} onClick={async () => { if (await confirm({ title: t('community.leave'), body: group.name })) leave.mutate(); }}>
                {t('community.leave')}
              </Button>
            ) : null}
            {isAdmin && (
              <Button
                variant="secondary"
                icon={<Settings2 className="size-4" />}
                onClick={() => {
                  setEdit({ name: group.name, description: group.description ?? '', visibility: group.visibility, postingPolicy: group.postingPolicy, rules: group.rules ?? '', category: group.category ?? '' });
                  setEditOpen(true);
                }}
              >
                {t('common.edit')}
              </Button>
            )}
          </>
        }
      />
      {group.status !== 'active' && <Notice tone="warn" className="mb-4">{t('community.groupInactive')}</Notice>}
      {!canRead ? (
        <EmptyState icon={<Lock className="size-6" />} title={t('community.privateGroup')} body={group.description ?? t('community.privateGroupBody')} />
      ) : (
        <>
          <Tabs<Tab>
            value={tab}
            onChange={setTab}
            tabs={[
              { value: 'posts', label: t('community.posts') },
              { value: 'members', label: t('common.members') },
              { value: 'about', label: t('community.about') },
            ]}
          />
          {tab === 'posts' && (
            <div className="space-y-3">
              {heldNotice && <Notice tone="warn">{heldNotice}</Notice>}
              {canPost && (
                <button type="button" onClick={() => { setPost(emptyPost()); setComposer(true); }} className="card flex w-full items-center gap-3 px-4 py-3 text-left text-muted hover:border-line-strong">
                  <Avatar name={me.profile.displayName} size="sm" />
                  <span className="flex-1">{t('community.writePost')}</span>
                  <PenSquare className="size-5" />
                </button>
              )}
              {pinned.map((p) => (
                <PostCard key={`pin-${p.id}`} post={p} onChanged={refresh} />
              ))}
              {posts.isLoading && <LoadingBlock />}
              {!posts.isLoading && posts.items.length === 0 && pinned.length === 0 && <EmptyState title={t('community.noPosts')} />}
              {posts.items.filter((p) => !pinned.some((x) => x.id === p.id)).map((p) => (
                <PostCard key={p.id} post={p} onChanged={refresh} />
              ))}
              <LoadMore hasMore={posts.hasMore} loading={posts.loadingMore} onClick={posts.loadMore} />
            </div>
          )}
          {tab === 'members' && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                {isStaff && (
                  <Select aria-label={t('common.status')} value={memberFilter} onChange={(ev) => setMemberFilter(ev.target.value as 'active' | 'pending')} options={[{ value: 'active', label: t('common.members') }, { value: 'pending', label: t('community.requests') }]} fieldClassName="w-48" />
                )}
                {isAdmin && (
                  <Button size="sm" icon={<UserPlus className="size-4" />} onClick={() => setInviteOpen(true)}>
                    {t('households.invite')}
                  </Button>
                )}
              </div>
              <p className="text-sm text-muted">{t('community.membersPrivacy')}</p>
              {members.isLoading && <LoadingBlock rows={2} />}
              <ul className="card divide-y divide-line">
                {members.data?.length === 0 && <li className="px-4 py-6 text-center text-sm text-muted">{t('common.emptyList')}</li>}
                {members.data?.map((m) => (
                  <li key={m.userId} className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <Avatar name={m.displayName} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="font-medium">{m.userId === me.id ? `${m.displayName} (${t('common.you')})` : m.displayName}</div>
                      <div className="text-xs text-muted">{t('households.joined', { date: fmt.date(m.joinedAt) })}</div>
                    </div>
                    {m.status === 'pending' && isStaff ? (
                      <>
                        <Button size="sm" variant="ghost" onClick={() => removeMember.mutate(m.userId)}>
                          {t('common.decline')}
                        </Button>
                        <Button size="sm" onClick={() => updateMember.mutate({ userId: m.userId, status: 'active' })}>
                          {t('common.accept')}
                        </Button>
                      </>
                    ) : isAdmin && m.role !== 'owner' && m.userId !== me.id ? (
                      <>
                        <Select aria-label={t('common.role')} value={m.role} onChange={(ev) => updateMember.mutate({ userId: m.userId, role: ev.target.value })} options={(['admin', 'moderator', 'member'] as const).map((r) => ({ value: r, label: e('groupRole', r) }))} fieldClassName="w-36" />
                        <Button size="sm" variant="ghost" icon={<Ban className="size-4" />} onClick={async () => { if (await confirm({ title: t('community.ban'), body: m.displayName, danger: true })) updateMember.mutate({ userId: m.userId, status: 'banned' }); }}>
                          {t('community.ban')}
                        </Button>
                      </>
                    ) : (
                      <Badge tone={m.role === 'member' ? 'neutral' : 'brand'}>{e('groupRole', m.role)}</Badge>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {tab === 'about' && (
            <Card>
              <CardBody className="space-y-4 pt-5">
                {group.description && <p className="whitespace-pre-wrap">{group.description}</p>}
                <div className="flex flex-wrap gap-2">
                  <Badge>{e('groupVisibility', group.visibility)}</Badge>
                  <Badge>{e('postingPolicy', group.postingPolicy)}</Badge>
                  {group.category && <Badge>{group.category}</Badge>}
                </div>
                {group.rules && (
                  <div>
                    <div className="mb-1 text-sm font-semibold">{t('community.rules')}</div>
                    <p className="whitespace-pre-wrap text-ink-2">{group.rules}</p>
                  </div>
                )}
                <div className="flex justify-between border-t border-line pt-3">
                  <ReportButton targetType="group" targetId={group.id} label={t('community.reportGroup')} />
                  {role === 'owner' && (
                    <Button
                      variant="ghost"
                      className="text-danger"
                      icon={<Trash2 className="size-4" />}
                      onClick={async () => {
                        if (!(await confirm({ title: t('community.deleteGroup'), body: t('community.deleteGroupBody'), danger: true }))) return;
                        await api.del(`/v1/community/groups/${id}`);
                        refresh();
                        router.replace('/community?tab=groups');
                      }}
                    >
                      {t('community.deleteGroup')}
                    </Button>
                  )}
                </div>
              </CardBody>
            </Card>
          )}
        </>
      )}

      <FormDialog
        open={composer}
        onClose={() => setComposer(false)}
        title={t('community.newPost')}
        size="lg"
        submitLabel={t('community.publish')}
        disabled={!post.body.trim() || (post.kind === 'event' && !post.eventStartsAt)}
        onSubmit={async () => {
          const r = await api.post<Post>(`/v1/community/groups/${id}/posts`, postBody(post));
          setHeldNotice(r.heldForReview ? t('community.heldForReview') : r.privacyWarning ?? null);
          refresh();
        }}
      >
        <PostFields value={post} onChange={setPost} allowAnnouncement={isAdmin} />
      </FormDialog>

      <FormDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title={t('common.edit')}
        size="lg"
        disabled={!edit.name.trim()}
        onSubmit={async () => {
          await api.patch(`/v1/community/groups/${id}`, { name: edit.name.trim(), description: edit.description.trim() || undefined, visibility: edit.visibility, postingPolicy: edit.postingPolicy, rules: edit.rules.trim() || undefined, category: edit.category.trim() || undefined });
          refresh();
        }}
      >
        <Input label={t('common.name')} value={edit.name} onChange={(ev) => setEdit({ ...edit, name: ev.target.value })} />
        <Textarea label={t('common.description')} value={edit.description} onChange={(ev) => setEdit({ ...edit, description: ev.target.value })} rows={2} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label={t('community.visibility')} value={edit.visibility} onChange={(ev) => setEdit({ ...edit, visibility: ev.target.value })} options={(['public', 'private', 'invite_only'] as const).map((v) => ({ value: v, label: e('groupVisibility', v) }))} />
          <Select label={t('community.whoCanPost')} value={edit.postingPolicy} onChange={(ev) => setEdit({ ...edit, postingPolicy: ev.target.value })} options={(['all_members', 'admins_only'] as const).map((v) => ({ value: v, label: e('postingPolicy', v) }))} />
        </div>
        <Input label={t('common.category')} optional value={edit.category} onChange={(ev) => setEdit({ ...edit, category: ev.target.value })} />
        <Textarea label={t('community.rules')} value={edit.rules} onChange={(ev) => setEdit({ ...edit, rules: ev.target.value })} rows={3} />
      </FormDialog>

      <FormDialog
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        title={t('households.invite')}
        description={t('community.inviteHint')}
        disabled={!inviteUser}
        submitLabel={t('common.send')}
        onSubmit={async () => {
          await api.post(`/v1/community/groups/${id}/invitations`, { userId: inviteUser });
          setInviteUser('');
        }}
      >
        {others.length === 0 ? (
          <p className="text-sm text-muted">
            <Users className="mr-1 inline size-4" />
            {t('contacts.empty')}
          </p>
        ) : (
          <Select label={t('tasks.person')} value={inviteUser} onChange={(ev) => setInviteUser(ev.target.value)} placeholder={t('common.selectPlaceholder')} options={others.map((p) => ({ value: p.userId, label: p.displayName }))} />
        )}
      </FormDialog>
    </div>
  );
}
