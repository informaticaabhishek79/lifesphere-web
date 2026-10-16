'use client';

import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { Boxes, LogOut, Megaphone, Pencil, Pin, PiggyBank, Plus, ShoppingCart, Trash2, UserPlus, X } from 'lucide-react';
import { api } from '@/lib/api';
import { useAction, usePaged } from '@/lib/hooks';
import { useHousehold, useTaskCategories } from '@/lib/data';
import { useSession } from '@/lib/session';
import type { Announcement, HouseholdInvitation, Task } from '@/lib/types';
import { useI18n } from '@/i18n';
import { Avatar, Badge, Button, Card, CardBody, CardHeader, EmptyState, ErrorNotice, IconButton, LoadingBlock, PageHeader, Tabs } from '@/components/ui';
import { Checkbox, Input, Segmented, Select, Textarea } from '@/components/form';
import { FormDialog, useConfirm } from '@/components/dialog';
import { StatusBadge } from '@/components/status';
import { InviteLinkNotice } from '@/components/invite-link';
import { TaskList } from '@/components/task-list';
import { emptyTask, formToCreate, TaskFields } from '@/components/task-form';

type Tab = 'overview' | 'chores' | 'members';

export default function HouseholdPage() {
  const { id } = useParams<{ id: string }>();
  const { t, e } = useI18n();
  const { me, fmt } = useSession();
  const router = useRouter();
  const qc = useQueryClient();
  const confirm = useConfirm();
  const h = useHousehold(id);
  const [tab, setTab] = useState<Tab>('overview');
  const isAdmin = h.data?.myRole === 'admin';

  const announcements = useQuery({ queryKey: ['household', id, 'announcements'], queryFn: () => api.get<Announcement[]>(`/v1/households/${id}/announcements`), enabled: !!h.data });
  const invitations = useQuery({ queryKey: ['household', id, 'invitations'], queryFn: () => api.get<HouseholdInvitation[]>(`/v1/households/${id}/invitations`), enabled: isAdmin });
  const chores = usePaged<Task>(['tasks', 'household', id], '/v1/tasks', { scope: 'household', householdId: id, status: 'open' }, { enabled: tab === 'chores' });
  const categories = useTaskCategories();

  const [renameOpen, setRenameOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [invite, setInvite] = useState({ by: 'phone' as 'phone' | 'email', value: '', role: 'member' as 'admin' | 'member' });
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [annOpen, setAnnOpen] = useState<Announcement | 'new' | null>(null);
  const [annBody, setAnnBody] = useState('');
  const [annPinned, setAnnPinned] = useState(false);
  const [choreOpen, setChoreOpen] = useState(false);
  const [chore, setChore] = useState(emptyTask());

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['household', id] });
    qc.invalidateQueries({ queryKey: ['households'] });
  };
  const setRole = useAction(({ userId, role }: { userId: string; role: string }) => api.patch(`/v1/households/${id}/members/${userId}`, { role }), { onSuccess: refresh });
  const removeMember = useAction((userId: string) => api.del<{ householdDeleted: boolean }>(`/v1/households/${id}/members/${userId}`), {
    onSuccess: (r, userId) => {
      refresh();
      if (userId === me.id || r?.householdDeleted) router.replace('/households');
    },
  });
  const cancelInvite = useAction((invId: string) => api.del(`/v1/households/${id}/invitations/${invId}`), { onSuccess: refresh });
  const removeAnn = useAction((annId: string) => api.del(`/v1/households/${id}/announcements/${annId}`), { onSuccess: refresh });
  const togglePin = useAction((a: Announcement) => api.patch(`/v1/households/${id}/announcements/${a.id}`, { pinned: !a.pinned }), { onSuccess: refresh });

  if (h.isLoading) return <LoadingBlock rows={4} />;
  if (h.error || !h.data) return <ErrorNotice error={h.error} onRetry={h.refetch} />;
  const hh = h.data;

  return (
    <div>
      <PageHeader
        back={{ href: '/households', label: t('nav.households') }}
        title={hh.name}
        description={t('households.memberCount', { count: hh.members.length })}
        actions={
          isAdmin ? (
            <>
              <Button variant="secondary" icon={<Pencil className="size-4" />} onClick={() => { setNewName(hh.name); setRenameOpen(true); }}>
                {t('households.rename')}
              </Button>
              <Button icon={<UserPlus className="size-4" />} onClick={() => { setInviteLink(null); setInvite({ by: 'phone', value: '', role: 'member' }); setInviteOpen(true); }}>
                {t('households.invite')}
              </Button>
            </>
          ) : undefined
        }
      />
      <div className="mb-6 grid grid-cols-3 gap-3">
        {[
          { href: `/lists?household=${id}`, icon: ShoppingCart, label: t('nav.lists') },
          { href: `/inventory?household=${id}`, icon: Boxes, label: t('nav.inventory') },
          { href: `/budgets?household=${id}`, icon: PiggyBank, label: t('nav.budgets') },
        ].map((l) => (
          <Link key={l.href} href={l.href} className="card flex items-center gap-3 px-4 py-3 font-semibold hover:border-line-strong">
            <l.icon className="size-5 text-brand" /> <span className="text-sm">{l.label}</span>
          </Link>
        ))}
      </div>

      <Tabs<Tab>
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'overview', label: t('households.announcements') },
          { value: 'chores', label: t('households.chores') },
          { value: 'members', label: t('common.members') },
        ]}
      />

      {tab === 'overview' && (
        <div className="max-w-3xl space-y-3">
          <div className="flex justify-end">
            <Button size="sm" icon={<Megaphone className="size-4" />} onClick={() => { setAnnBody(''); setAnnPinned(false); setAnnOpen('new'); }}>
              {t('households.announce')}
            </Button>
          </div>
          {announcements.isLoading && <LoadingBlock rows={2} />}
          {announcements.data?.length === 0 && <EmptyState icon={<Megaphone className="size-6" />} title={t('households.noAnnouncements')} />}
          {announcements.data?.map((a) => (
            <Card key={a.id} className={a.pinned ? 'border-accent/40' : undefined}>
              <CardBody className="pt-4">
                <div className="flex items-start gap-3">
                  <Avatar name={a.authorName} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="font-semibold">{a.authorName}</span>
                      <span className="text-muted">{fmt.ago(a.createdAt)}</span>
                      {a.pinned && <Badge tone="accent"><Pin className="size-3" /> {t('households.pinned')}</Badge>}
                    </div>
                    <p className="mt-1 whitespace-pre-wrap">{a.body}</p>
                  </div>
                  {(isAdmin || a.authorId === me.id) && (
                    <div className="flex">
                      {isAdmin && (
                        <IconButton label={a.pinned ? t('households.unpin') : t('households.pin')} onClick={() => togglePin.mutate(a)}>
                          <Pin className="size-4" />
                        </IconButton>
                      )}
                      {a.authorId === me.id && (
                        <IconButton label={t('common.edit')} onClick={() => { setAnnBody(a.body); setAnnPinned(a.pinned); setAnnOpen(a); }}>
                          <Pencil className="size-4" />
                        </IconButton>
                      )}
                      <IconButton label={t('common.delete')} onClick={async () => { if (await confirm({ title: t('common.delete'), danger: true })) removeAnn.mutate(a.id); }}>
                        <Trash2 className="size-4" />
                      </IconButton>
                    </div>
                  )}
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {tab === 'chores' && (
        <div className="max-w-3xl space-y-3">
          <div className="flex justify-end">
            <Button size="sm" icon={<Plus className="size-4" />} onClick={() => { setChore(emptyTask({ householdId: id, visibility: 'household', isChore: true })); setChoreOpen(true); }}>
              {t('households.addChore')}
            </Button>
          </div>
          {chores.isLoading && <LoadingBlock />}
          {!chores.isLoading && chores.items.length === 0 && <EmptyState title={t('tasks.empty')} />}
          <TaskList tasks={chores.items} categories={categories.data ?? []} onChanged={() => qc.invalidateQueries({ queryKey: ['tasks'] })} />
        </div>
      )}

      {tab === 'members' && (
        <div className="max-w-3xl space-y-5">
          <Card>
            <CardBody className="pt-2">
              <ul className="divide-y divide-line">
                {hh.members.map((m) => (
                  <li key={m.userId} className="flex flex-wrap items-center gap-3 py-3">
                    <Avatar name={m.displayName} />
                    <div className="min-w-0 flex-1">
                      <div className="font-medium">
                        {m.displayName} {m.userId === me.id && <span className="text-muted">({t('common.you')})</span>}
                      </div>
                      <div className="text-sm text-muted">{t('households.joined', { date: fmt.date(m.joinedAt) })}</div>
                    </div>
                    {isAdmin && m.userId !== me.id ? (
                      <Select aria-label={t('common.role')} value={m.role} onChange={(ev) => setRole.mutate({ userId: m.userId, role: ev.target.value })} options={(['admin', 'member'] as const).map((r) => ({ value: r, label: e('householdRole', r) }))} fieldClassName="w-36" />
                    ) : (
                      <Badge tone={m.role === 'admin' ? 'brand' : 'neutral'}>{e('householdRole', m.role)}</Badge>
                    )}
                    {(isAdmin || m.userId === me.id) && (
                      <IconButton
                        label={m.userId === me.id ? t('households.leave') : t('common.remove')}
                        onClick={async () => {
                          const self = m.userId === me.id;
                          if (await confirm({ title: self ? t('households.leave') : t('households.removeMember'), body: self ? t('households.leaveBody') : m.displayName, danger: true })) removeMember.mutate(m.userId);
                        }}
                      >
                        {m.userId === me.id ? <LogOut className="size-4" /> : <X className="size-4" />}
                      </IconButton>
                    )}
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
          {isAdmin && (invitations.data?.length ?? 0) > 0 && (
            <Card>
              <CardHeader title={t('households.sentInvitations')} />
              <CardBody>
                <ul className="divide-y divide-line">
                  {invitations.data!.map((inv) => (
                    <li key={inv.id} className="flex items-center gap-3 py-2.5">
                      <div className="flex-1 text-sm">
                        <div>{e('householdRole', inv.role ?? 'member')} · {t('invite.expires', { date: fmt.date(inv.expiresAt) })}</div>
                        <div className="text-muted">{fmt.ago(inv.createdAt)}</div>
                      </div>
                      <StatusBadge group="invitationStatus" value={inv.status} />
                      {inv.status === 'pending' && (
                        <Button size="sm" variant="ghost" onClick={() => cancelInvite.mutate(inv.id)}>
                          {t('common.cancel')}
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          )}
          {isAdmin && (
            <div className="flex justify-end">
              <Button
                variant="ghost"
                className="text-danger"
                icon={<Trash2 className="size-4" />}
                onClick={async () => {
                  if (!(await confirm({ title: t('households.delete'), body: t('households.deleteBody'), danger: true, confirmLabel: t('common.delete') }))) return;
                  await api.del(`/v1/households/${id}`);
                  qc.invalidateQueries({ queryKey: ['households'] });
                  router.replace('/households');
                }}
              >
                {t('households.delete')}
              </Button>
            </div>
          )}
        </div>
      )}

      <FormDialog open={renameOpen} onClose={() => setRenameOpen(false)} title={t('households.rename')} disabled={!newName.trim()} onSubmit={async () => { await api.patch(`/v1/households/${id}`, { name: newName.trim() }); refresh(); }}>
        <Input label={t('common.name')} value={newName} onChange={(ev) => setNewName(ev.target.value)} maxLength={80} autoFocus />
      </FormDialog>

      <FormDialog
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        title={t('households.invite')}
        description={t('households.inviteHint')}
        submitLabel={inviteLink ? t('common.done') : t('common.send')}
        disabled={!inviteLink && !invite.value.trim()}
        onSubmit={async () => {
          if (inviteLink) return;
          const r = await api.post<HouseholdInvitation>(`/v1/households/${id}/invitations`, { [invite.by]: invite.value.trim(), role: invite.role });
          refresh();
          if (r.inviteLink) {
            setInviteLink(r.inviteLink);
            return false;
          }
        }}
      >
        {inviteLink ? (
          <InviteLinkNotice link={inviteLink} />
        ) : (
          <>
            <Segmented value={invite.by} onChange={(by) => setInvite({ ...invite, by, value: '' })} options={[{ value: 'phone', label: t('auth.phoneTab') }, { value: 'email', label: t('auth.emailTab') }]} />
            <Input label={invite.by === 'phone' ? t('auth.phoneLabel') : t('auth.emailLabel')} type={invite.by === 'phone' ? 'tel' : 'email'} value={invite.value} onChange={(ev) => setInvite({ ...invite, value: ev.target.value })} autoFocus />
            <Select label={t('common.role')} value={invite.role} onChange={(ev) => setInvite({ ...invite, role: ev.target.value as 'admin' | 'member' })} options={(['member', 'admin'] as const).map((r) => ({ value: r, label: e('householdRole', r) }))} />
          </>
        )}
      </FormDialog>

      <FormDialog
        open={!!annOpen}
        onClose={() => setAnnOpen(null)}
        title={annOpen === 'new' ? t('households.announce') : t('common.edit')}
        disabled={!annBody.trim()}
        onSubmit={async () => {
          if (annOpen === 'new') await api.post(`/v1/households/${id}/announcements`, { body: annBody.trim(), pinned: isAdmin ? annPinned : undefined });
          else if (annOpen) await api.patch(`/v1/households/${id}/announcements/${annOpen.id}`, { body: annBody.trim() });
          refresh();
        }}
      >
        <Textarea label={t('households.message')} value={annBody} onChange={(ev) => setAnnBody(ev.target.value)} maxLength={1000} rows={4} autoFocus />
        {isAdmin && annOpen === 'new' && <Checkbox label={t('households.pinIt')} checked={annPinned} onChange={setAnnPinned} />}
      </FormDialog>

      <FormDialog
        open={choreOpen}
        onClose={() => setChoreOpen(false)}
        title={t('households.addChore')}
        submitLabel={t('common.create')}
        disabled={!chore.title.trim()}
        onSubmit={async () => {
          await api.post('/v1/tasks', formToCreate({ ...chore, householdId: id }));
          qc.invalidateQueries({ queryKey: ['tasks'] });
        }}
      >
        <TaskFields value={chore} onChange={setChore} mode="create" />
      </FormDialog>
    </div>
  );
}
