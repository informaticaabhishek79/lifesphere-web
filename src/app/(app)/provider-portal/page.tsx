'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Plus, Store } from 'lucide-react';
import { api } from '@/lib/api';
import type { ProviderProfile } from '@/lib/types';
import { useI18n } from '@/i18n';
import { Badge, Button, EmptyState, ErrorNotice, List, ListItem, LoadingBlock, Notice, PageHeader } from '@/components/ui';
import { Input, Select, Textarea } from '@/components/form';
import { FormDialog } from '@/components/dialog';
import { StatusBadge } from '@/components/status';

export default function ProviderPortalPage() {
  const { t, e } = useI18n();
  const router = useRouter();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['portal'], queryFn: () => api.get<{ provider: ProviderProfile; role: 'owner' | 'staff' }[]>('/v1/provider-portal/providers') });
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ displayName: '', providerType: 'individual', description: '', phonePublic: '', emailPublic: '', websiteUrl: '' });
  return (
    <div className="max-w-3xl">
      <PageHeader title={t('nav.providerPortal')} description={t('portal.intro')} actions={<Button icon={<Plus className="size-4" />} onClick={() => setOpen(true)}>{t('portal.new')}</Button>} />
      <Notice tone="info" className="mb-5">
        {t('portal.howItWorks')}
      </Notice>
      {q.isLoading && <LoadingBlock />}
      <ErrorNotice error={q.error} />
      {q.data?.length === 0 && <EmptyState icon={<Store className="size-6" />} title={t('portal.empty')} body={t('portal.emptyBody')} action={<Button onClick={() => setOpen(true)}>{t('portal.new')}</Button>} />}
      {(q.data?.length ?? 0) > 0 && (
        <List>
          {q.data!.map(({ provider: p, role }) => (
            <ListItem
              key={p.id}
              href={`/provider-portal/${p.id}`}
              leading={<span className="flex size-10 items-center justify-center rounded-xl bg-accent-soft text-accent"><Store className="size-5" /></span>}
              title={p.displayName}
              subtitle={`${e('providerType', p.providerType)} · ${e('verificationLevel', p.verificationLevel)}`}
              trailing={
                <>
                  <Badge>{role === 'owner' ? t('portal.owner') : t('portal.staff')}</Badge>
                  <StatusBadge group="providerStatus" value={p.status} />
                </>
              }
            />
          ))}
        </List>
      )}
      <FormDialog
        open={open}
        onClose={() => setOpen(false)}
        title={t('portal.new')}
        submitLabel={t('common.create')}
        disabled={!f.displayName.trim()}
        onSubmit={async () => {
          const p = await api.post<ProviderProfile>('/v1/provider-portal/providers', Object.fromEntries(Object.entries(f).map(([k, v]) => [k, v.trim() || undefined])));
          qc.invalidateQueries({ queryKey: ['portal'] });
          router.push(`/provider-portal/${p.id}`);
        }}
      >
        <Input label={t('portal.displayName')} value={f.displayName} onChange={(ev) => setF({ ...f, displayName: ev.target.value })} autoFocus />
        <Select label={t('common.type')} value={f.providerType} onChange={(ev) => setF({ ...f, providerType: ev.target.value })} options={(['individual', 'business', 'volunteer', 'organisation'] as const).map((v) => ({ value: v, label: e('providerType', v) }))} />
        <Textarea label={t('common.description')} optional value={f.description} onChange={(ev) => setF({ ...f, description: ev.target.value })} rows={3} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label={t('portal.publicPhone')} optional type="tel" value={f.phonePublic} onChange={(ev) => setF({ ...f, phonePublic: ev.target.value })} />
          <Input label={t('portal.publicEmail')} optional type="email" value={f.emailPublic} onChange={(ev) => setF({ ...f, emailPublic: ev.target.value })} />
        </div>
        <Input label={t('consumer.website')} optional type="url" placeholder="https://" value={f.websiteUrl} onChange={(ev) => setF({ ...f, websiteUrl: ev.target.value })} />
        <p className="text-[0.82rem] text-muted">{t('portal.noIds')}</p>
      </FormDialog>
    </div>
  );
}
