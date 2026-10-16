'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { ExternalLink, Pencil, Phone, Plus, Receipt, ShoppingBag, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useAction, usePaged } from '@/lib/hooks';
import { useSession } from '@/lib/session';
import type { CaseStatus, ConsumerCase, OfficialChannel, Purchase } from '@/lib/types';
import { useI18n } from '@/i18n';
import { Badge, Button, Card, CardBody, EmptyState, ErrorNotice, IconButton, List, ListItem, LoadingBlock, LoadMore, Notice, PageHeader, Tabs } from '@/components/ui';
import { Input, Select, Textarea } from '@/components/form';
import { FormDialog, useConfirm } from '@/components/dialog';
import { StatusBadge } from '@/components/status';
import { CASE_CATEGORIES, ChannelCard } from '@/components/consumer';

type Tab = 'cases' | 'purchases' | 'channels';

function Inner() {
  const { t } = useI18n();
  const params = useSearchParams();
  const [tab, setTab] = useState<Tab>((params.get('tab') as Tab) ?? 'cases');
  return (
    <div className="max-w-3xl">
      <PageHeader title={t('nav.consumer')} description={t('consumer.intro')} />
      <Notice tone="info" className="mb-5">
        {t('consumer.notLegal')}
      </Notice>
      <Tabs<Tab>
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'cases', label: t('consumer.cases') },
          { value: 'purchases', label: t('consumer.purchases') },
          { value: 'channels', label: t('consumer.channels') },
        ]}
      />
      {tab === 'cases' && <Cases startNew={params.get('new') === '1'} />}
      {tab === 'purchases' && <Purchases />}
      {tab === 'channels' && <Channels />}
    </div>
  );
}

export default function ConsumerPage() {
  return (
    <Suspense>
      <Inner />
    </Suspense>
  );
}

function Cases({ startNew }: { startNew: boolean }) {
  const { t, e } = useI18n();
  const { fmt } = useSession();
  const router = useRouter();
  const qc = useQueryClient();
  const [status, setStatus] = useState('');
  const list = usePaged<ConsumerCase>(['consumer', 'cases'], '/v1/consumer/cases', { status: status || undefined });
  const purchases = useQuery({ queryKey: ['consumer', 'purchases', ''], queryFn: () => api.get<Purchase[]>('/v1/consumer/purchases') });
  const [open, setOpen] = useState(startNew);
  const [f, setF] = useState({ title: '', description: '', counterpartyName: '', category: 'ecommerce', purchaseId: '' });
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Select
          aria-label={t('common.status')}
          value={status}
          onChange={(ev) => setStatus(ev.target.value)}
          placeholder={t('common.all')}
          options={(['draft', 'ready_to_submit', 'submitted_by_user', 'awaiting_response', 'info_required', 'resolved', 'closed'] as CaseStatus[]).map((s) => ({ value: s, label: e('caseStatus', s) }))}
          fieldClassName="w-56"
        />
        <Button icon={<Plus className="size-4" />} onClick={() => setOpen(true)}>
          {t('consumer.newCase')}
        </Button>
      </div>
      {list.isLoading && <LoadingBlock />}
      <ErrorNotice error={list.error} onRetry={list.refetch} />
      {!list.isLoading && list.items.length === 0 && <EmptyState icon={<Receipt className="size-6" />} title={t('consumer.noCases')} body={t('consumer.noCasesBody')} action={<Button onClick={() => setOpen(true)}>{t('consumer.newCase')}</Button>} />}
      {list.items.length > 0 && (
        <List>
          {list.items.map((c) => (
            <ListItem
              key={c.id}
              href={`/consumer/cases/${c.id}`}
              title={c.title}
              subtitle={[c.counterpartyName, c.externalReference && `${t('consumer.ref')} ${c.externalReference}`].filter(Boolean).join(' · ')}
              meta={c.nextFollowUpOn ? <Badge tone="warn">{t('consumer.followUpOn', { date: fmt.day(c.nextFollowUpOn) })}</Badge> : undefined}
              trailing={<StatusBadge group="caseStatus" value={c.status} />}
            />
          ))}
        </List>
      )}
      <LoadMore hasMore={list.hasMore} loading={list.loadingMore} onClick={list.loadMore} />
      <FormDialog
        open={open}
        onClose={() => setOpen(false)}
        title={t('consumer.newCase')}
        submitLabel={t('common.create')}
        disabled={!f.title.trim()}
        onSubmit={async () => {
          const c = await api.post<ConsumerCase>('/v1/consumer/cases', {
            title: f.title.trim(),
            description: f.description.trim() || undefined,
            counterpartyName: f.counterpartyName.trim() || undefined,
            category: f.category || undefined,
            purchaseId: f.purchaseId || undefined,
          });
          qc.invalidateQueries({ queryKey: ['consumer'] });
          router.push(`/consumer/cases/${c.id}`);
        }}
      >
        <Input label={t('consumer.caseTitle')} placeholder={t('consumer.caseTitlePlaceholder')} value={f.title} onChange={(ev) => setF({ ...f, title: ev.target.value })} maxLength={200} autoFocus />
        <Input label={t('consumer.against')} optional placeholder={t('consumer.againstPlaceholder')} value={f.counterpartyName} onChange={(ev) => setF({ ...f, counterpartyName: ev.target.value })} maxLength={120} />
        <Select label={t('common.category')} value={f.category} onChange={(ev) => setF({ ...f, category: ev.target.value })} options={CASE_CATEGORIES.map((c) => ({ value: c, label: t(`consumer.cat.${c}`) }))} />
        {(purchases.data?.length ?? 0) > 0 && (
          <Select label={t('consumer.linkPurchase')} value={f.purchaseId} onChange={(ev) => setF({ ...f, purchaseId: ev.target.value })} placeholder={t('common.none')} options={purchases.data!.map((p) => ({ value: p.id, label: [p.productCategory, p.brand, p.retailerName].filter(Boolean).join(' · ') }))} />
        )}
        <Textarea label={t('consumer.whatHappened')} optional hint={t('consumer.noSensitive')} value={f.description} onChange={(ev) => setF({ ...f, description: ev.target.value })} rows={4} />
      </FormDialog>
    </>
  );
}

const emptyPurchase = { productCategory: '', brand: '', model: '', purchaseDate: '', retailerName: '', warrantyExpiresOn: '', returnDeadline: '', serviceReference: '', notes: '' };

function Purchases() {
  const { t } = useI18n();
  const { fmt } = useSession();
  const qc = useQueryClient();
  const confirm = useConfirm();
  const [expiring, setExpiring] = useState('');
  const q = useQuery({ queryKey: ['consumer', 'purchases', expiring], queryFn: () => api.get<Purchase[]>('/v1/consumer/purchases', { expiringWithinDays: expiring || undefined }) });
  const [form, setForm] = useState<(typeof emptyPurchase & { id?: string }) | null>(null);
  const remove = useAction((id: string) => api.del(`/v1/consumer/purchases/${id}`), { invalidate: [['consumer']] });
  const today = new Date().toISOString().slice(0, 10);
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Select
          aria-label={t('consumer.filterWarranty')}
          value={expiring}
          onChange={(ev) => setExpiring(ev.target.value)}
          options={[
            { value: '', label: t('consumer.allPurchases') },
            { value: '30', label: t('consumer.expiringIn', { n: 30 }) },
            { value: '90', label: t('consumer.expiringIn', { n: 90 }) },
          ]}
          fieldClassName="w-56"
        />
        <Button icon={<Plus className="size-4" />} onClick={() => setForm({ ...emptyPurchase })}>
          {t('consumer.addPurchase')}
        </Button>
      </div>
      <p className="mb-4 text-sm text-muted">{t('consumer.purchasesHint')}</p>
      {q.isLoading && <LoadingBlock />}
      <ErrorNotice error={q.error} />
      {q.data?.length === 0 && <EmptyState icon={<ShoppingBag className="size-6" />} title={t('consumer.noPurchases')} />}
      <div className="space-y-2">
        {q.data?.map((p) => (
          <Card key={p.id}>
            <CardBody className="flex flex-wrap items-center gap-3 pt-4">
              <div className="min-w-0 flex-1">
                <div className="font-semibold">{[p.productCategory, p.brand, p.model].filter(Boolean).join(' · ')}</div>
                <div className="text-sm text-muted">{[p.retailerName, p.purchaseDate && fmt.day(p.purchaseDate)].filter(Boolean).join(' · ')}</div>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {p.warrantyExpiresOn && <Badge tone={p.warrantyExpiresOn >= today ? 'ok' : 'neutral'}>{t('inventory.warrantyTill', { date: fmt.day(p.warrantyExpiresOn) })}</Badge>}
                  {p.returnDeadline && p.returnDeadline >= today && <Badge tone="warn">{t('consumer.returnBy', { date: fmt.day(p.returnDeadline) })}</Badge>}
                </div>
              </div>
              <IconButton
                label={t('common.edit')}
                onClick={() =>
                  setForm({
                    id: p.id,
                    productCategory: p.productCategory,
                    brand: p.brand ?? '',
                    model: p.model ?? '',
                    purchaseDate: p.purchaseDate ?? '',
                    retailerName: p.retailerName ?? '',
                    warrantyExpiresOn: p.warrantyExpiresOn ?? '',
                    returnDeadline: p.returnDeadline ?? '',
                    serviceReference: p.serviceReference ?? '',
                    notes: p.notes ?? '',
                  })
                }
              >
                <Pencil className="size-4" />
              </IconButton>
              <IconButton label={t('common.delete')} onClick={async () => { if (await confirm({ title: t('common.delete'), body: p.productCategory, danger: true })) remove.mutate(p.id); }}>
                <Trash2 className="size-4" />
              </IconButton>
            </CardBody>
          </Card>
        ))}
      </div>
      {form && (
        <FormDialog
          open
          size="lg"
          onClose={() => setForm(null)}
          title={form.id ? t('common.edit') : t('consumer.addPurchase')}
          disabled={!form.productCategory.trim()}
          onSubmit={async () => {
            const body = Object.fromEntries(Object.entries(form).filter(([k]) => k !== 'id').map(([k, v]) => [k, (v as string).trim() || undefined]));
            if (form.id) await api.patch(`/v1/consumer/purchases/${form.id}`, body);
            else await api.post('/v1/consumer/purchases', body);
            qc.invalidateQueries({ queryKey: ['consumer'] });
          }}
        >
          <Input label={t('consumer.product')} placeholder={t('consumer.productPlaceholder')} value={form.productCategory} onChange={(ev) => setForm({ ...form, productCategory: ev.target.value })} autoFocus />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label={t('inventory.brand')} optional value={form.brand} onChange={(ev) => setForm({ ...form, brand: ev.target.value })} />
            <Input label={t('inventory.model')} optional value={form.model} onChange={(ev) => setForm({ ...form, model: ev.target.value })} />
            <Input label={t('consumer.seller')} optional value={form.retailerName} onChange={(ev) => setForm({ ...form, retailerName: ev.target.value })} />
            <Input type="date" label={t('inventory.purchaseDate')} optional value={form.purchaseDate} onChange={(ev) => setForm({ ...form, purchaseDate: ev.target.value })} />
            <Input type="date" label={t('inventory.warrantyUntil')} optional value={form.warrantyExpiresOn} onChange={(ev) => setForm({ ...form, warrantyExpiresOn: ev.target.value })} />
            <Input type="date" label={t('consumer.returnDeadline')} optional value={form.returnDeadline} onChange={(ev) => setForm({ ...form, returnDeadline: ev.target.value })} />
          </div>
          <Input label={t('consumer.serviceRef')} optional hint={t('consumer.serviceRefHint')} value={form.serviceReference} onChange={(ev) => setForm({ ...form, serviceReference: ev.target.value })} />
          <Textarea label={t('common.notes')} optional value={form.notes} onChange={(ev) => setForm({ ...form, notes: ev.target.value })} />
        </FormDialog>
      )}
    </>
  );
}

function Channels() {
  const { t, e } = useI18n();
  const [kind, setKind] = useState('');
  const q = useQuery({ queryKey: ['channels', kind], queryFn: () => api.get<OfficialChannel[]>('/v1/consumer/official-channels', { kind: kind || undefined }) });
  return (
    <>
      <p className="mb-4 text-sm text-muted">{t('consumer.channelsHint')}</p>
      <Select aria-label={t('common.type')} value={kind} onChange={(ev) => setKind(ev.target.value)} placeholder={t('common.all')} options={(['consumer', 'civic', 'government', 'helpline'] as const).map((k) => ({ value: k, label: e('channelKind', k) }))} fieldClassName="mb-4 w-56" />
      {q.isLoading && <LoadingBlock />}
      <div className="space-y-3">{q.data?.map((c) => <ChannelCard key={c.id} c={c} />)}</div>
    </>
  );
}
