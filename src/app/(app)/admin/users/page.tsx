'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { useAction } from '@/lib/hooks';
import { useSession } from '@/lib/session';
import { useI18n } from '@/i18n';
import { Badge, Button, Card, CardBody, ErrorNotice, Notice, PageHeader } from '@/components/ui';
import { Input, Segmented, Textarea } from '@/components/form';
import { FormDialog } from '@/components/dialog';
import { StatusBadge } from '@/components/status';
import { shortId } from '@/components/admin';

interface AdminUser {
  id: string;
  status: string;
  disabledReason: string | null;
  phone: string | null;
  email: string | null;
  createdAt: string;
  lastActiveAt: string | null;
  deletionRequestedAt: string | null;
  staffRoles: string[];
  sanctions: { id: string; kind: string; expiresAt: string | null }[];
}

export default function AdminUsers() {
  const { e } = useI18n();
  const { fmt, hasRole } = useSession();
  const [by, setBy] = useState<'phone' | 'email' | 'userId'>('phone');
  const [value, setValue] = useState('');
  const [rows, setRows] = useState<AdminUser[] | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const [act, setAct] = useState<{ user: AdminUser; disable: boolean; reason: string } | null>(null);
  const search = async () => {
    setBusy(true);
    setError(null);
    try {
      setRows(await api.get<AdminUser[]>('/v1/admin/users', { [by]: value.trim() }));
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };
  const revoke = useAction((id: string) => api.post(`/v1/admin/users/${id}/revoke-sessions`), { success: 'All sessions signed out.' });
  const lift = useAction((id: string) => api.post(`/v1/admin/moderation/sanctions/${id}/lift`), { success: 'Sanction lifted.', onSuccess: () => search() });
  return (
    <div className="max-w-4xl">
      <PageHeader title="Users" description="Look up one account at a time by exact phone, email or ID. There is no browsing of user lists." />
      <form
        className="card mb-5 flex flex-wrap items-end gap-3 p-4"
        onSubmit={(ev) => {
          ev.preventDefault();
          if (value.trim()) search();
        }}
      >
        <Segmented value={by} onChange={setBy} options={[{ value: 'phone', label: 'Phone' }, { value: 'email', label: 'Email' }, { value: 'userId', label: 'User ID' }]} />
        <Input aria-label="Search value" value={value} onChange={(ev) => setValue(ev.target.value)} placeholder={by === 'phone' ? '+919876543210' : by === 'email' ? 'name@example.com' : 'uuid'} fieldClassName="min-w-[16rem] flex-1" />
        <Button type="submit" loading={busy}>
          Find
        </Button>
      </form>
      <ErrorNotice error={error} />
      {rows?.length === 0 && <Notice tone="info">No account found.</Notice>}
      <div className="space-y-3">
        {rows?.map((u) => (
          <Card key={u.id}>
            <CardBody className="space-y-3 pt-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-sm">{shortId(u.id)}</span>
                <StatusBadge group="userStatus" value={u.status} />
                {u.staffRoles.map((r) => (
                  <Badge key={r} tone="brand">
                    {e('staffRole', r)}
                  </Badge>
                ))}
              </div>
              <div className="grid gap-2 text-sm sm:grid-cols-2">
                <div>Phone: {u.phone ?? '—'}</div>
                <div>Email: {u.email ?? '—'}</div>
                <div>Joined: {fmt.date(u.createdAt)}</div>
                <div>Last active: {u.lastActiveAt ? fmt.ago(u.lastActiveAt) : '—'}</div>
                {u.disabledReason && <div className="sm:col-span-2">Disabled because: {u.disabledReason}</div>}
                {u.deletionRequestedAt && <div className="sm:col-span-2 text-danger">Deletion requested {fmt.date(u.deletionRequestedAt)}</div>}
              </div>
              {u.sanctions.length > 0 && (
                <div className="space-y-1">
                  {u.sanctions.map((s) => (
                    <div key={s.id} className="flex items-center gap-2 text-sm">
                      <Badge tone="danger">{e('sanctionKind', s.kind)}</Badge>
                      {s.expiresAt && <span className="text-muted">until {fmt.date(s.expiresAt)}</span>}
                      {hasRole('moderator') && (
                        <Button size="sm" variant="ghost" onClick={() => lift.mutate(s.id)}>
                          Lift
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap gap-2 border-t border-line pt-3">
                {u.status === 'disabled' ? (
                  <Button size="sm" onClick={() => setAct({ user: u, disable: false, reason: '' })}>
                    Enable account
                  </Button>
                ) : (
                  <Button size="sm" variant="danger" onClick={() => setAct({ user: u, disable: true, reason: '' })}>
                    Disable account
                  </Button>
                )}
                <Button size="sm" variant="secondary" onClick={() => revoke.mutate(u.id)}>
                  Sign out everywhere
                </Button>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
      {act && (
        <FormDialog
          open
          danger={act.disable}
          onClose={() => setAct(null)}
          title={act.disable ? 'Disable account' : 'Enable account'}
          description="The reason is recorded in the audit log."
          disabled={act.reason.trim().length < 5}
          onSubmit={async () => {
            await api.post(`/v1/admin/users/${act.user.id}/${act.disable ? 'disable' : 'enable'}`, { reason: act.reason.trim() });
            await search();
          }}
        >
          <Textarea label="Reason" value={act.reason} onChange={(ev) => setAct({ ...act, reason: ev.target.value })} rows={3} autoFocus />
        </FormDialog>
      )}
    </div>
  );
}
