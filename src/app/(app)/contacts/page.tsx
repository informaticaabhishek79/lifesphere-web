'use client';

import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Pencil, Share2, UserMinus, UserPlus, Users } from 'lucide-react';
import { api } from '@/lib/api';
import { useAction } from '@/lib/hooks';
import { useContacts } from '@/lib/data';
import { useSession } from '@/lib/session';
import { GRANT_SCOPES, type ContactGrant, type ContactInvitation, type GrantScope, type IncomingContactInvitation } from '@/lib/types';
import { useI18n } from '@/i18n';
import { Avatar, Badge, Button, Card, CardBody, EmptyState, ErrorNotice, IconButton, LoadingBlock, Notice, PageHeader, Tabs } from '@/components/ui';
import { CheckboxGroup, Input, Segmented, Textarea } from '@/components/form';
import { FormDialog, useConfirm } from '@/components/dialog';
import { StatusBadge } from '@/components/status';
import { InviteLinkNotice } from '@/components/invite-link';

type Tab = 'contacts' | 'incoming' | 'sent';

export default function ContactsPage() {
  const { t, e } = useI18n();
  const { fmt } = useSession();
  const qc = useQueryClient();
  const confirm = useConfirm();
  const contacts = useContacts();
  const incoming = useQuery({ queryKey: ['contacts', 'incoming'], queryFn: () => api.get<IncomingContactInvitation[]>('/v1/contacts/invitations/incoming') });
  const sent = useQuery({ queryKey: ['contacts', 'sent'], queryFn: () => api.get<ContactInvitation[]>('/v1/contacts/invitations') });
  const [tab, setTab] = useState<Tab>('contacts');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inv, setInv] = useState({ by: 'phone' as 'phone' | 'email', value: '', label: '', message: '', scopes: ['help.alerts'] as string[] });
  const [link, setLink] = useState<string | null>(null);
  const [labelFor, setLabelFor] = useState<{ id: string; label: string } | null>(null);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['contacts'] });
    qc.invalidateQueries({ queryKey: ['grants'] });
  };
  const respond = useAction(({ id, accept }: { id: string; accept: boolean }) => api.post(`/v1/contacts/invitations/${id}/respond`, { accept }), { onSuccess: refresh });
  const cancel = useAction((id: string) => api.del(`/v1/contacts/invitations/${id}`), { onSuccess: refresh });
  const remove = useAction((id: string) => api.del(`/v1/contacts/${id}`), { onSuccess: refresh, success: t('contacts.removed') });

  const scopeChips = (items: (GrantScope | ContactGrant)[], tone: 'brand' | 'accent') =>
    items.length ? (
      <div className="flex flex-wrap gap-1">
        {items.map((x) => {
          const g = typeof x === 'string' ? { scope: x, status: 'active' as const } : x;
          return (
            <Badge key={g.scope} tone={g.status === 'pending_cooloff' ? 'warn' : tone} title={g.status === 'pending_cooloff' ? e('grantStatus', g.status) : undefined}>
              {e('grantScope', g.scope)}
              {g.status === 'pending_cooloff' && ' ⏳'}
            </Badge>
          );
        })}
      </div>
    ) : (
      <span className="text-sm text-muted">{t('contacts.nothing')}</span>
    );

  return (
    <div className="max-w-3xl">
      <PageHeader
        title={t('nav.contacts')}
        description={t('contacts.intro')}
        actions={
          <Button icon={<UserPlus className="size-4" />} onClick={() => { setLink(null); setInv({ by: 'phone', value: '', label: '', message: '', scopes: ['help.alerts'] }); setInviteOpen(true); }}>
            {t('contacts.invite')}
          </Button>
        }
      />
      <Tabs<Tab>
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'contacts', label: t('nav.contacts'), count: undefined },
          { value: 'incoming', label: t('contacts.incoming'), count: incoming.data?.length },
          { value: 'sent', label: t('contacts.sent') },
        ]}
      />

      {tab === 'contacts' && (
        <>
          {contacts.isLoading && <LoadingBlock />}
          <ErrorNotice error={contacts.error} />
          {contacts.data?.length === 0 && <EmptyState icon={<Users className="size-6" />} title={t('contacts.empty')} body={t('contacts.emptyBody')} action={<Button onClick={() => setInviteOpen(true)}>{t('contacts.invite')}</Button>} />}
          <div className="space-y-3">
            {contacts.data?.map((c) => (
              <Card key={c.contactUserId}>
                <CardBody className="pt-4">
                  <div className="flex items-start gap-3">
                    <Avatar name={c.displayName} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold">{c.displayName}</span>
                        {c.label && <Badge>{c.label}</Badge>}
                      </div>
                      <div className="text-sm text-muted">{t('contacts.since', { date: fmt.date(c.since) })}</div>
                    </div>
                    <IconButton label={t('contacts.editLabel')} onClick={() => setLabelFor({ id: c.contactUserId, label: c.label ?? '' })}>
                      <Pencil className="size-4" />
                    </IconButton>
                    <IconButton
                      label={t('contacts.remove')}
                      onClick={async () => {
                        if (await confirm({ title: t('contacts.removeTitle', { name: c.displayName }), body: t('contacts.removeBody'), danger: true, confirmLabel: t('common.remove') })) remove.mutate(c.contactUserId);
                      }}
                    >
                      <UserMinus className="size-4" />
                    </IconButton>
                  </div>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div>
                      <div className="mb-1.5 text-xs font-bold uppercase tracking-wide text-muted">{t('contacts.iShare')}</div>
                      {scopeChips(c.iShare, 'brand')}
                    </div>
                    <div>
                      <div className="mb-1.5 text-xs font-bold uppercase tracking-wide text-muted">{t('contacts.theyShare')}</div>
                      {scopeChips(c.sharedWithMe, 'accent')}
                    </div>
                  </div>
                  <div className="mt-4 border-t border-line pt-3">
                    <Link href={`/sharing?with=${c.contactUserId}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand">
                      <Share2 className="size-4" /> {t('contacts.manageSharing')}
                    </Link>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        </>
      )}

      {tab === 'incoming' && (
        <div className="space-y-3">
          {incoming.data?.length === 0 && <EmptyState title={t('contacts.noIncoming')} />}
          {incoming.data?.map((i) => (
            <Card key={i.id}>
              <CardBody className="space-y-3 pt-4">
                <div className="flex items-center gap-3">
                  <Avatar name={i.inviterName} />
                  <div className="flex-1">
                    <div className="font-semibold">{t('invite.contactBody', { name: i.inviterName })}</div>
                    <div className="text-sm text-muted">{t('invite.expires', { date: fmt.date(i.expiresAt) })}</div>
                  </div>
                </div>
                {i.message && <blockquote className="rounded-xl bg-surface-2 px-4 py-2.5 italic">“{i.message}”</blockquote>}
                {i.proposedScopes.length > 0 && (
                  <div>
                    <div className="mb-1.5 text-sm font-semibold">{t('invite.theyOffer', { name: i.inviterName })}</div>
                    {scopeChips(i.proposedScopes, 'accent')}
                  </div>
                )}
                <p className="text-[0.82rem] text-muted">{t('invite.contactNoAccess')}</p>
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" onClick={() => respond.mutate({ id: i.id, accept: false })}>
                    {t('common.decline')}
                  </Button>
                  <Button onClick={() => respond.mutate({ id: i.id, accept: true })}>{t('common.accept')}</Button>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {tab === 'sent' && (
        <ul className="card divide-y divide-line">
          {sent.data?.length === 0 && <li className="px-4 py-8 text-center text-muted">{t('common.emptyList')}</li>}
          {sent.data?.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <div className="font-medium">{s.label || t('contacts.invitation')}</div>
                <div className="text-sm text-muted">
                  {fmt.ago(s.createdAt)} · {t('invite.expires', { date: fmt.date(s.expiresAt) })}
                </div>
              </div>
              <StatusBadge group="invitationStatus" value={s.status} />
              {s.status === 'pending' && (
                <Button size="sm" variant="ghost" onClick={() => cancel.mutate(s.id)}>
                  {t('common.cancel')}
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      <FormDialog
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        title={t('contacts.invite')}
        description={t('contacts.inviteHint')}
        submitLabel={link ? t('common.done') : t('common.send')}
        disabled={!link && !inv.value.trim()}
        onSubmit={async () => {
          if (link) return;
          const r = await api.post<ContactInvitation>('/v1/contacts/invitations', {
            [inv.by]: inv.value.trim(),
            label: inv.label.trim() || undefined,
            message: inv.message.trim() || undefined,
            proposedScopes: inv.scopes,
          });
          refresh();
          if (r.inviteLink) {
            setLink(r.inviteLink);
            return false;
          }
        }}
      >
        {link ? (
          <InviteLinkNotice link={link} />
        ) : (
          <>
            <Segmented value={inv.by} onChange={(by) => setInv({ ...inv, by, value: '' })} options={[{ value: 'phone', label: t('auth.phoneTab') }, { value: 'email', label: t('auth.emailTab') }]} />
            <Input label={inv.by === 'phone' ? t('auth.phoneLabel') : t('auth.emailLabel')} type={inv.by === 'phone' ? 'tel' : 'email'} value={inv.value} onChange={(ev) => setInv({ ...inv, value: ev.target.value })} autoFocus />
            <Input label={t('contacts.label')} hint={t('contacts.labelHint')} optional value={inv.label} onChange={(ev) => setInv({ ...inv, label: ev.target.value })} maxLength={40} />
            <Textarea label={t('contacts.message')} optional value={inv.message} onChange={(ev) => setInv({ ...inv, message: ev.target.value })} maxLength={300} rows={2} />
            <CheckboxGroup
              label={t('contacts.offerToShare')}
              hint={t('contacts.offerToShareHint')}
              options={GRANT_SCOPES.map((s) => ({ value: s, label: e('grantScope', s) }))}
              value={inv.scopes}
              onChange={(v) => setInv({ ...inv, scopes: v })}
            />
            <Notice tone="info">{t('sharing.cooloff')}</Notice>
          </>
        )}
      </FormDialog>

      <FormDialog
        open={!!labelFor}
        onClose={() => setLabelFor(null)}
        title={t('contacts.editLabel')}
        onSubmit={async () => {
          await api.patch(`/v1/contacts/${labelFor!.id}`, { label: labelFor!.label.trim() || null });
          refresh();
        }}
      >
        <Input label={t('contacts.label')} hint={t('contacts.labelHint')} value={labelFor?.label ?? ''} onChange={(ev) => setLabelFor(labelFor && { ...labelFor, label: ev.target.value })} maxLength={40} autoFocus />
      </FormDialog>
    </div>
  );
}
