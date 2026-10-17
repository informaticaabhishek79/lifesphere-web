'use client';

import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { CalendarClock, Hammer, Pencil, Plus, Trash2, Wrench } from 'lucide-react';
import { api } from '@/lib/api';
import { useAction } from '@/lib/hooks';
import { todayIso } from '@/lib/format';
import { useSession } from '@/lib/session';
import type { InventoryDetail, MaintenanceSchedule } from '@/lib/types';
import { useI18n } from '@/i18n';
import { Badge, Button, ButtonLink, Card, CardBody, CardHeader, ErrorNotice, IconButton, KeyValue, LoadingBlock, PageHeader } from '@/components/ui';
import { Input, Select, Switch } from '@/components/form';
import { FormDialog, useConfirm } from '@/components/dialog';
import { InventoryFields, inventoryBody, inventoryToForm, type InventoryFormValue } from '@/components/inventory-form';

export default function InventoryItemPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useI18n();
  const { fmt } = useSession();
  const router = useRouter();
  const qc = useQueryClient();
  const confirm = useConfirm();
  const key = ['inventory-item', id];
  const q = useQuery({ queryKey: key, queryFn: () => api.get<InventoryDetail>(`/v1/inventory/${id}`) });
  const [edit, setEdit] = useState<InventoryFormValue | null>(null);
  const [sched, setSched] = useState<{ id?: string; title: string; intervalDays: string; nextDueOn: string; reminderLeadDays: string } | null>(null);
  const [rec, setRec] = useState<{ performedOn: string; description: string; providerName: string; scheduleId: string } | null>(null);
  const refresh = () => {
    qc.invalidateQueries({ queryKey: key });
    qc.invalidateQueries({ queryKey: ['inventory'] });
  };
  const toggleSched = useAction((s: MaintenanceSchedule) => api.patch(`/v1/inventory/${id}/schedules/${s.id}`, { active: !s.active }), { onSuccess: refresh });
  const delSched = useAction((sid: string) => api.del(`/v1/inventory/${id}/schedules/${sid}`), { onSuccess: refresh });
  const delRec = useAction((rid: string) => api.del(`/v1/inventory/${id}/records/${rid}`), { onSuccess: refresh });

  if (q.isLoading) return <LoadingBlock rows={4} />;
  if (q.error || !q.data) return <ErrorNotice error={q.error} onRetry={q.refetch} />;
  const item = q.data;

  return (
    <div className="max-w-3xl">
      <PageHeader
        back={{ href: '/inventory', label: t('nav.inventory') }}
        title={item.name}
        description={[t(`inventory.cat.${item.category}`), item.brand, item.model].filter(Boolean).join(' · ')}
        actions={
          <>
            <ButtonLink href={`/services?category=&q=${encodeURIComponent(item.name)}`} variant="secondary" icon={<Hammer className="size-4" />}>
              {t('inventory.findService')}
            </ButtonLink>
            <Button variant="secondary" icon={<Pencil className="size-4" />} onClick={() => setEdit(inventoryToForm(item))}>
              {t('common.edit')}
            </Button>
          </>
        }
      />
      <div className="space-y-5">
        {(item.roomOrLocation || item.purchaseDate || item.installedOn || item.warrantyExpiresOn || item.notes) && (
        <Card>
          <CardBody className="pt-5">
            <KeyValue
              items={[
                { label: t('inventory.room'), value: item.roomOrLocation },
                { label: t('inventory.purchaseDate'), value: fmt.day(item.purchaseDate) },
                { label: t('inventory.installedOn'), value: fmt.day(item.installedOn) },
                { label: t('inventory.warrantyUntil'), value: fmt.day(item.warrantyExpiresOn) },
                { label: t('common.notes'), value: item.notes },
              ]}
            />
          </CardBody>
        </Card>
        )}

        <Card>
          <CardHeader
            icon={<CalendarClock className="size-5" />}
            title={t('inventory.schedules')}
            description={t('inventory.schedulesHint')}
            action={
              <Button size="sm" variant="secondary" icon={<Plus className="size-4" />} onClick={() => setSched({ title: '', intervalDays: '90', nextDueOn: todayIso(), reminderLeadDays: '3' })}>
                {t('common.add')}
              </Button>
            }
          />
          <CardBody>
            {item.schedules.length === 0 ? (
              <p className="text-sm text-muted">{t('inventory.noSchedules')}</p>
            ) : (
              <ul className="divide-y divide-line">
                {item.schedules.map((s) => (
                  <li key={s.id} className="flex flex-wrap items-center gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium">{s.title}</div>
                      <div className="text-sm text-muted">
                        {t('inventory.every', { n: s.intervalDays })} · {t('inventory.nextDue', { date: fmt.day(s.nextDueOn) })}
                      </div>
                    </div>
                    {s.nextDueOn <= todayIso() && s.active && <Badge tone="warn">{t('inventory.dueNow')}</Badge>}
                    <Switch label={<span className="sr-only">{t('inventory.active')}</span>} checked={s.active} onChange={() => toggleSched.mutate(s)} />
                    <IconButton label={t('common.edit')} onClick={() => setSched({ id: s.id, title: s.title, intervalDays: String(s.intervalDays), nextDueOn: s.nextDueOn, reminderLeadDays: String(s.reminderLeadDays) })}>
                      <Pencil className="size-4" />
                    </IconButton>
                    <IconButton label={t('common.delete')} onClick={() => delSched.mutate(s.id)}>
                      <Trash2 className="size-4" />
                    </IconButton>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            icon={<Wrench className="size-5" />}
            title={t('inventory.history')}
            action={
              <Button size="sm" variant="secondary" icon={<Plus className="size-4" />} onClick={() => setRec({ performedOn: todayIso(), description: '', providerName: '', scheduleId: '' })}>
                {t('inventory.logWork')}
              </Button>
            }
          />
          <CardBody>
            {item.records.length === 0 ? (
              <p className="text-sm text-muted">{t('inventory.noRecords')}</p>
            ) : (
              <ol className="relative space-y-4 border-s-2 border-line ps-5">
                {item.records.map((r) => (
                  <li key={r.id} className="relative">
                    <span className="absolute top-1.5 -start-[1.62rem] size-3 rounded-full border-2 border-surface bg-brand" />
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-muted">{fmt.day(r.performedOn)}</div>
                        <div className="font-medium">{r.description}</div>
                        {r.providerName && <div className="text-sm text-muted">{r.providerName}</div>}
                      </div>
                      <IconButton label={t('common.delete')} onClick={() => delRec.mutate(r.id)}>
                        <Trash2 className="size-4" />
                      </IconButton>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </CardBody>
        </Card>

        {item.purchases.length > 0 && (
          <Card>
            <CardHeader title={t('inventory.purchases')} />
            <CardBody>
              <ul className="divide-y divide-line">
                {item.purchases.map((p) => (
                  <li key={p.id} className="py-2.5">
                    <Link href="/consumer?tab=purchases" className="font-medium hover:text-brand">
                      {p.productCategory} {p.retailerName && `· ${p.retailerName}`}
                    </Link>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        )}

        <div className="flex justify-end">
          <Button
            variant="ghost"
            className="text-danger"
            icon={<Trash2 className="size-4" />}
            onClick={async () => {
              if (!(await confirm({ title: t('inventory.delete'), body: item.name, danger: true }))) return;
              await api.del(`/v1/inventory/${id}`);
              qc.invalidateQueries({ queryKey: ['inventory'] });
              router.replace('/inventory');
            }}
          >
            {t('inventory.delete')}
          </Button>
        </div>
      </div>

      {edit && (
        <FormDialog open onClose={() => setEdit(null)} title={t('common.edit')} size="lg" disabled={!edit.name.trim()} onSubmit={async () => { await api.patch(`/v1/inventory/${id}`, inventoryBody(edit)); refresh(); }}>
          <InventoryFields value={edit} onChange={setEdit} mode="edit" />
        </FormDialog>
      )}
      {sched && (
        <FormDialog
          open
          onClose={() => setSched(null)}
          title={sched.id ? t('common.edit') : t('inventory.newSchedule')}
          disabled={!sched.title.trim() || !Number(sched.intervalDays) || !sched.nextDueOn}
          onSubmit={async () => {
            const body = { title: sched.title.trim(), intervalDays: Number(sched.intervalDays), nextDueOn: sched.nextDueOn, reminderLeadDays: Number(sched.reminderLeadDays || 3) };
            if (sched.id) await api.patch(`/v1/inventory/${id}/schedules/${sched.id}`, body);
            else await api.post(`/v1/inventory/${id}/schedules`, body);
            refresh();
          }}
        >
          <Input label={t('common.title')} placeholder={t('inventory.schedulePlaceholder')} value={sched.title} onChange={(e) => setSched({ ...sched, title: e.target.value })} autoFocus />
          <div className="grid grid-cols-2 gap-3">
            <Input type="number" min={1} label={t('inventory.intervalDays')} value={sched.intervalDays} onChange={(e) => setSched({ ...sched, intervalDays: e.target.value })} />
            <Input type="number" min={0} label={t('inventory.leadDays')} value={sched.reminderLeadDays} onChange={(e) => setSched({ ...sched, reminderLeadDays: e.target.value })} />
          </div>
          <Input type="date" label={t('inventory.nextDueLabel')} value={sched.nextDueOn} onChange={(e) => setSched({ ...sched, nextDueOn: e.target.value })} />
        </FormDialog>
      )}
      {rec && (
        <FormDialog
          open
          onClose={() => setRec(null)}
          title={t('inventory.logWork')}
          disabled={!rec.description.trim() || !rec.performedOn}
          onSubmit={async () => {
            await api.post(`/v1/inventory/${id}/records`, { performedOn: rec.performedOn, description: rec.description.trim(), providerName: rec.providerName.trim() || undefined, scheduleId: rec.scheduleId || undefined });
            refresh();
          }}
        >
          <Input type="date" label={t('common.date')} value={rec.performedOn} onChange={(e) => setRec({ ...rec, performedOn: e.target.value })} />
          <Input label={t('inventory.whatWasDone')} value={rec.description} onChange={(e) => setRec({ ...rec, description: e.target.value })} maxLength={500} autoFocus />
          <Input label={t('inventory.byWhom')} optional value={rec.providerName} onChange={(e) => setRec({ ...rec, providerName: e.target.value })} maxLength={120} />
          {item.schedules.length > 0 && (
            <Select label={t('inventory.forSchedule')} hint={t('inventory.forScheduleHint')} value={rec.scheduleId} onChange={(e) => setRec({ ...rec, scheduleId: e.target.value })} placeholder={t('common.none')} options={item.schedules.map((s) => ({ value: s.id, label: s.title }))} />
          )}
        </FormDialog>
      )}
    </div>
  );
}
