'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Home, Plus } from 'lucide-react';
import { api } from '@/lib/api';
import { useAction } from '@/lib/hooks';
import { useHouseholds } from '@/lib/data';
import { useSession } from '@/lib/session';
import type { IncomingHouseholdInvitation } from '@/lib/types';
import { useI18n } from '@/i18n';
import { Badge, Button, Card, CardBody, EmptyState, ErrorNotice, List, ListItem, LoadingBlock, PageHeader, Section } from '@/components/ui';
import { Input } from '@/components/form';
import { FormDialog } from '@/components/dialog';

export default function HouseholdsPage() {
  const { t, e } = useI18n();
  const { fmt } = useSession();
  const qc = useQueryClient();
  const households = useHouseholds();
  const incoming = useQuery({ queryKey: ['households', 'incoming'], queryFn: () => api.get<IncomingHouseholdInvitation[]>('/v1/households/invitations/incoming') });
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const respond = useAction(({ id, accept }: { id: string; accept: boolean }) => api.post(`/v1/households/invitations/${id}/respond`, { accept }), {
    invalidate: [['households']],
  });
  return (
    <div className="max-w-3xl">
      <PageHeader
        title={t('nav.households')}
        description={t('households.intro')}
        actions={
          <Button icon={<Plus className="size-4" />} onClick={() => setOpen(true)}>
            {t('households.new')}
          </Button>
        }
      />
      {(incoming.data?.length ?? 0) > 0 && (
        <Section title={t('households.invitations')}>
          <div className="space-y-3">
            {incoming.data!.map((inv) => (
              <Card key={inv.id}>
                <CardBody className="flex flex-wrap items-center gap-3 pt-4">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold">{inv.householdName}</div>
                    <div className="text-sm text-muted">
                      {t('households.invitedBy', { name: inv.inviterName, role: e('householdRole', inv.role) })} · {t('invite.expires', { date: fmt.date(inv.expiresAt) })}
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => respond.mutate({ id: inv.id, accept: false })}>
                    {t('common.decline')}
                  </Button>
                  <Button size="sm" onClick={() => respond.mutate({ id: inv.id, accept: true })}>
                    {t('common.accept')}
                  </Button>
                </CardBody>
              </Card>
            ))}
          </div>
        </Section>
      )}
      {households.isLoading && <LoadingBlock />}
      <ErrorNotice error={households.error} />
      {households.data?.length === 0 && (
        <EmptyState icon={<Home className="size-6" />} title={t('households.empty')} body={t('households.emptyBody')} action={<Button onClick={() => setOpen(true)}>{t('households.new')}</Button>} />
      )}
      {(households.data?.length ?? 0) > 0 && (
        <List>
          {households.data!.map((h) => (
            <ListItem
              key={h.id}
              href={`/households/${h.id}`}
              leading={
                <span className="flex size-10 items-center justify-center rounded-xl bg-brand-soft text-brand">
                  <Home className="size-5" />
                </span>
              }
              title={h.name}
              subtitle={t('households.memberCount', { count: h.memberCount ?? 1 })}
              trailing={<Badge tone={h.role === 'admin' ? 'brand' : 'neutral'}>{e('householdRole', h.role)}</Badge>}
            />
          ))}
        </List>
      )}
      <FormDialog
        open={open}
        onClose={() => setOpen(false)}
        title={t('households.new')}
        submitLabel={t('common.create')}
        disabled={!name.trim()}
        onSubmit={async () => {
          await api.post('/v1/households', { name: name.trim() });
          setName('');
          qc.invalidateQueries({ queryKey: ['households'] });
        }}
      >
        <Input label={t('common.name')} placeholder={t('households.namePlaceholder')} value={name} onChange={(ev) => setName(ev.target.value)} maxLength={80} autoFocus />
      </FormDialog>
    </div>
  );
}
