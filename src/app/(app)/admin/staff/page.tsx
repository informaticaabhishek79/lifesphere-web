'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '@/lib/api';
import { useAction } from '@/lib/hooks';
import { useSession } from '@/lib/session';
import { useI18n } from '@/i18n';
import { Badge, Button, ErrorNotice, LoadingBlock, PageHeader } from '@/components/ui';
import { Input, Select } from '@/components/form';
import { FormDialog, useConfirm } from '@/components/dialog';
import { useReauth } from '@/components/reauth';
import { DataTable, shortId } from '@/components/admin';

interface StaffRow {
  id: string;
  userId: string;
  role: string;
  grantedBy: string | null;
  grantedAt: string;
}
const ROLES = ['support', 'moderator', 'privacy_officer', 'provider_reviewer', 'content_admin', 'super_admin'];

export default function AdminStaff() {
  const { e } = useI18n();
  const { fmt, me } = useSession();
  const qc = useQueryClient();
  const confirm = useConfirm();
  const withReauth = useReauth();
  const q = useQuery({ queryKey: ['admin', 'staff'], queryFn: () => api.get<StaffRow[]>('/v1/admin/staff') });
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ userId: '', role: 'support' });
  const revoke = useAction((id: string) => api.del(`/v1/admin/staff/${id}`), { invalidate: [['admin', 'staff']] });
  return (
    <div className="max-w-4xl">
      <PageHeader title="Staff" description="Roles grant access to staff tools only. Every staff session needs two-step verification." actions={<Button onClick={() => setOpen(true)}>Grant role</Button>} />
      {q.isLoading && <LoadingBlock />}
      <ErrorNotice error={q.error} />
      {q.data && (
        <DataTable
          rows={q.data}
          rowKey={(r) => r.id}
          columns={[
            { key: 'userId', label: 'User', render: (r) => <span className="font-mono">{r.userId === me.id ? 'You' : shortId(r.userId)}</span> },
            { key: 'role', label: 'Role', render: (r) => <Badge tone="brand">{e('staffRole', r.role)}</Badge> },
            { key: 'grantedAt', label: 'Granted', render: (r) => fmt.date(r.grantedAt) },
            { key: 'grantedBy', label: 'By', render: (r) => <span className="font-mono">{shortId(r.grantedBy)}</span> },
            {
              key: 'x',
              label: '',
              render: (r) => (
                <Button size="sm" variant="ghost" className="text-danger" onClick={async () => { if (await confirm({ title: 'Revoke role?', body: e('staffRole', r.role), danger: true })) revoke.mutate(r.id); }}>
                  Revoke
                </Button>
              ),
            },
          ]}
        />
      )}
      <FormDialog
        open={open}
        onClose={() => setOpen(false)}
        title="Grant staff role"
        description="Find the user ID on the Users page first."
        disabled={!f.userId.trim()}
        onSubmit={async () => {
          await withReauth(() => api.post('/v1/admin/staff', { userId: f.userId.trim(), role: f.role }));
          qc.invalidateQueries({ queryKey: ['admin', 'staff'] });
        }}
      >
        <Input label="User ID" value={f.userId} onChange={(ev) => setF({ ...f, userId: ev.target.value })} autoFocus />
        <Select label="Role" value={f.role} onChange={(ev) => setF({ ...f, role: ev.target.value })} options={ROLES.map((r) => ({ value: r, label: e('staffRole', r) }))} />
      </FormDialog>
    </div>
  );
}
