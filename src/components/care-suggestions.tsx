'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Lightbulb, X } from 'lucide-react';
import { api } from '@/lib/api';
import type { CareSuggestions } from '@/lib/types';
import { useI18n } from '@/i18n';
import { FormDialog } from './dialog';
import { Input } from './form';
import { Button, Card } from './ui';

export const useCareSuggestions = () => useQuery({ queryKey: ['care', 'suggestions'], queryFn: () => api.get<CareSuggestions>('/v1/care/suggestions'), refetchInterval: 60_000 });

/**
 * Pending suggestions about me, for the person being looked after: a caregiver proposed a medicine reminder, and
 * nothing happens to my schedule until I say so here.
 */
export function PendingSuggestions() {
  const { t } = useI18n();
  const q = useCareSuggestions();
  const qc = useQueryClient();
  const decide = useMutation({
    mutationFn: ({ id, approve }: { id: string; approve: boolean }) => api.post(`/v1/care/suggestions/${id}/${approve ? 'approve' : 'decline'}`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['care'] });
    },
  });
  const pending = q.data?.forMe.filter((s) => s.status === 'pending') ?? [];
  if (!pending.length) return null;
  return (
    <section className="mb-6 space-y-3" aria-label={t('care.suggestions.title')}>
      {pending.map((s) => (
        <Card key={s.id} className="flex flex-wrap items-center gap-3 border-brand/30 bg-brand-soft/40 p-4">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
            <Lightbulb className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{t('care.suggestions.addMedicine', { name: s.proposedByName ?? t('care.someone'), medicine: s.payload.name })}</p>
            <p className="text-sm text-muted">{s.payload.times.join(' · ')}</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" icon={<X className="size-4" />} loading={decide.isPending && decide.variables?.id === s.id && !decide.variables.approve} onClick={() => decide.mutate({ id: s.id, approve: false })}>
              {t('care.suggestions.decline')}
            </Button>
            <Button size="sm" icon={<Check className="size-4" />} loading={decide.isPending && decide.variables?.id === s.id && decide.variables.approve} onClick={() => decide.mutate({ id: s.id, approve: true })}>
              {t('care.suggestions.approve')}
            </Button>
          </div>
        </Card>
      ))}
    </section>
  );
}

/** For a caregiver: propose a medicine reminder for someone who granted "propose check-in or medicine times". */
export function SuggestMedicineButton({ targetUserId, targetName }: { targetUserId: string; targetName: string }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [time, setTime] = useState('08:00');
  const qc = useQueryClient();
  return (
    <>
      <Button size="sm" variant="secondary" icon={<Lightbulb className="size-4" />} onClick={() => setOpen(true)}>
        {t('care.suggestions.suggest')}
      </Button>
      <FormDialog
        open={open}
        onClose={() => setOpen(false)}
        title={t('care.suggestions.dialogTitle', { name: targetName })}
        description={t('care.suggestions.dialogHint', { name: targetName })}
        submitLabel={t('care.suggestions.suggest')}
        disabled={!name.trim() || !time}
        onSubmit={async () => {
          await api.post('/v1/care/suggestions', { targetUserId, kind: 'add_medicine', name: name.trim(), times: [time] });
          qc.invalidateQueries({ queryKey: ['care'] });
          setName('');
          setTime('08:00');
        }}
      >
        <Input label={t('care.suggestions.medicineName')} value={name} onChange={(e) => setName(e.target.value)} maxLength={60} autoFocus />
        <Input type="time" label={t('care.suggestions.medicineTime')} value={time} onChange={(e) => setTime(e.target.value)} />
      </FormDialog>
    </>
  );
}
