'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { ChevronLeft, ChevronRight, PiggyBank, Plus, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useAction } from '@/lib/hooks';
import { useHouseholds } from '@/lib/data';
import { useSession } from '@/lib/session';
import type { BudgetLine } from '@/lib/types';
import { useI18n } from '@/i18n';
import { Button, Card, cx, EmptyState, ErrorNotice, IconButton, LoadingBlock, Notice, PageHeader, Stat } from '@/components/ui';
import { Input, Select } from '@/components/form';
import { FormDialog, useConfirm } from '@/components/dialog';

const monthOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;

/** ISO currencies with local names; the line's current currency first. */
function currencyOptions(tag: string, current: string) {
  let codes: string[] = [];
  try {
    codes = (Intl as unknown as { supportedValuesOf(k: string): string[] }).supportedValuesOf('currency');
  } catch {
    codes = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD', 'AUD', 'CAD', 'SAR', 'BDT'];
  }
  const names = (() => {
    try {
      return new Intl.DisplayNames([tag, 'en'], { type: 'currency' });
    } catch {
      return null;
    }
  })();
  const label = (c: string) => `${c} · ${names?.of(c) ?? c}`;
  return [current, ...codes.filter((c) => c !== current)].map((c) => ({ value: c, label: label(c) }));
}

function Inner() {
  const { t, tag } = useI18n();
  const { fmt } = useSession();
  const params = useSearchParams();
  const qc = useQueryClient();
  const confirm = useConfirm();
  const households = useHouseholds();
  const [householdId, setHouseholdId] = useState(params.get('household') ?? '');
  const [cursor, setCursor] = useState(() => new Date());
  const month = monthOf(cursor);
  const q = useQuery({ queryKey: ['budgets', month, householdId], queryFn: () => api.get<BudgetLine[]>('/v1/budgets', { month, householdId: householdId || undefined }) });
  const [form, setForm] = useState<{ id?: string; category: string; plannedAmount: string; spentAmount: string; note: string; currency: string } | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: ['budgets'] });
  const remove = useAction((id: string) => api.del(`/v1/budgets/${id}`), { onSuccess: refresh });
  const lines = q.data ?? [];
  const planned = lines.reduce((s, l) => s + Number(l.plannedAmount), 0);
  const spent = lines.reduce((s, l) => s + Number(l.spentAmount), 0);
  const currency = lines[0]?.currency ?? fmt.currency;

  return (
    <div className="max-w-3xl">
      <PageHeader
        title={t('nav.budgets')}
        description={t('budgets.intro')}
        actions={
          <Button icon={<Plus className="size-4" />} onClick={() => setForm({ category: '', plannedAmount: '', spentAmount: '', note: '', currency })}>
            {t('budgets.addLine')}
          </Button>
        }
      />
      <Notice tone="info" className="mb-5">
        {t('budgets.privacy')}
      </Notice>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" aria-label={t('common.back')} onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}>
            <ChevronLeft className="flip-rtl size-4" />
          </Button>
          <span className="min-w-[9rem] text-center font-semibold">{new Intl.DateTimeFormat(tag, { month: 'long', year: 'numeric' }).format(cursor)}</span>
          <Button variant="secondary" size="sm" aria-label={t('common.next')} onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}>
            <ChevronRight className="flip-rtl size-4" />
          </Button>
        </div>
        {(households.data?.length ?? 0) > 0 && (
          <Select aria-label={t('nav.households')} value={householdId} onChange={(e) => setHouseholdId(e.target.value)} options={[{ value: '', label: t('common.personal') }, ...(households.data ?? []).map((h) => ({ value: h.id, label: h.name }))]} fieldClassName="w-56" />
        )}
      </div>
      {lines.length > 0 && (
        <div className="mb-5 grid grid-cols-3 gap-3">
          <Stat label={t('budgets.planned')} value={fmt.money(planned, currency)} />
          <Stat label={t('budgets.spent')} value={fmt.money(spent, currency)} tone={spent > planned ? 'danger' : 'neutral'} />
          <Stat label={t('budgets.left')} value={fmt.money(planned - spent, currency)} tone={planned - spent < 0 ? 'danger' : 'ok'} />
        </div>
      )}
      {q.isLoading && <LoadingBlock />}
      <ErrorNotice error={q.error} onRetry={q.refetch} />
      {!q.isLoading && lines.length === 0 && <EmptyState icon={<PiggyBank className="size-6" />} title={t('budgets.empty')} action={<Button onClick={() => setForm({ category: '', plannedAmount: '', spentAmount: '', note: '', currency })}>{t('budgets.addLine')}</Button>} />}
      <div className="space-y-3">
        {lines.map((l) => {
          const p = Number(l.plannedAmount);
          const s = Number(l.spentAmount);
          const pct = p > 0 ? Math.min(100, Math.round((s / p) * 100)) : 0;
          return (
            <Card key={l.id} className="px-4 py-3.5">
              <div className="flex items-center gap-3">
                <button type="button" className="min-w-0 flex-1 text-start" onClick={() => setForm({ id: l.id, category: l.category, plannedAmount: String(p), spentAmount: String(s), note: l.note ?? '', currency: l.currency })}>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-semibold">{l.category}</span>
                    <span className="text-sm tabular-nums text-muted">
                      {fmt.money(s, l.currency)} / {fmt.money(p, l.currency)}
                    </span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-bg-2" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                    <div className={cx('h-full rounded-full', s > p ? 'bg-danger' : pct > 80 ? 'bg-warn' : 'bg-brand')} style={{ width: `${pct}%` }} />
                  </div>
                  {l.note && <div className="mt-1.5 text-sm text-muted">{l.note}</div>}
                </button>
                <IconButton label={t('common.delete')} onClick={async () => { if (await confirm({ title: t('common.delete'), body: l.category, danger: true })) remove.mutate(l.id); }}>
                  <Trash2 className="size-4" />
                </IconButton>
              </div>
            </Card>
          );
        })}
      </div>
      {form && (
        <FormDialog
          open
          onClose={() => setForm(null)}
          title={form.id ? t('common.edit') : t('budgets.addLine')}
          disabled={!form.category.trim() || form.plannedAmount === ''}
          onSubmit={async () => {
            const body = { category: form.category.trim(), plannedAmount: Number(form.plannedAmount), spentAmount: form.spentAmount === '' ? undefined : Number(form.spentAmount), note: form.note.trim() || undefined, currency: form.currency };
            if (form.id) await api.patch(`/v1/budgets/${form.id}`, body);
            else await api.post('/v1/budgets', { ...body, month, householdId: householdId || undefined });
            refresh();
          }}
        >
          <Input label={t('common.category')} placeholder={t('budgets.categoryPlaceholder')} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} maxLength={40} autoFocus />
          <div className="grid gap-3 sm:grid-cols-3">
            <Input label={t('budgets.planned')} inputMode="decimal" value={form.plannedAmount} onChange={(e) => setForm({ ...form, plannedAmount: e.target.value.replace(/[^\d.]/g, '') })} />
            <Input label={t('budgets.spent')} inputMode="decimal" optional value={form.spentAmount} onChange={(e) => setForm({ ...form, spentAmount: e.target.value.replace(/[^\d.]/g, '') })} />
            <Select label={t('budgets.currency')} value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} options={currencyOptions(tag, form.currency)} />
          </div>
          <Input label={t('common.notes')} optional value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} maxLength={200} />
        </FormDialog>
      )}
    </div>
  );
}

export default function BudgetsPage() {
  return (
    <Suspense>
      <Inner />
    </Suspense>
  );
}
