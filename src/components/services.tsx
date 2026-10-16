'use client';

import { useState } from 'react';
import { BadgeCheck, ShieldCheck, Star } from 'lucide-react';
import { api } from '@/lib/api';
import { localInputToIso } from '@/lib/format';
import { useLocalities, usePeople, useServiceCategories } from '@/lib/data';
import { useSession } from '@/lib/session';
import type { ProviderPublic, ServiceRequest } from '@/lib/types';
import { useI18n } from '@/i18n';
import { Badge } from './ui';
import { FormDialog } from './dialog';
import { Input, Select, Textarea } from './form';

export function VerificationBadge({ level, label }: { level: ProviderPublic['verificationLevel']; label?: string }) {
  const { e } = useI18n();
  if (level === 'none') return <Badge title={label}>{e('verificationLevel', 'none')}</Badge>;
  return (
    <Badge tone={level === 'screened' ? 'ok' : 'info'} title={label}>
      {level === 'screened' ? <ShieldCheck className="size-3.5" /> : <BadgeCheck className="size-3.5" />}
      {e('verificationLevel', level)}
    </Badge>
  );
}

export function Stars({ value, count }: { value: number | null | undefined; count?: number }) {
  const { t } = useI18n();
  if (!count) return <span className="text-sm text-muted">{t('services.noReviews')}</span>;
  return (
    <span className="inline-flex items-center gap-1 text-sm font-semibold">
      <Star className="size-4 fill-warn text-warn" /> {Number(value ?? 0).toFixed(1)} <span className="font-normal text-muted">({count})</span>
    </span>
  );
}

/** Request a service, from a specific provider or as an open request local providers can pick up. */
export function RequestServiceDialog({
  open,
  onClose,
  provider,
  defaultCategoryId,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  provider?: ProviderPublic | null;
  defaultCategoryId?: string;
  onCreated: (r: ServiceRequest) => void;
}) {
  const { t } = useI18n();
  const { me } = useSession();
  const categories = useServiceCategories();
  const localities = useLocalities();
  const { others } = usePeople();
  const services = provider?.services ?? [];
  const [f, setF] = useState({
    categoryId: defaultCategoryId ?? services[0]?.categoryId ?? '',
    providerServiceId: '',
    title: '',
    description: '',
    localityId: me.profile.locality?.id ?? '',
    locationNote: '',
    preferredStart: '',
    preferredEnd: '',
    onBehalfOfUserId: '',
  });
  const catOptions = provider
    ? [...new Map(services.map((s) => [s.categoryId, { value: s.categoryId, label: s.categoryName }])).values()]
    : (categories.data ?? []).filter((c) => c.active).map((c) => ({ value: c.id, label: c.name }));
  const selectedCat = categories.data?.find((c) => c.id === f.categoryId);
  return (
    <FormDialog
      open={open}
      onClose={onClose}
      size="lg"
      title={provider ? t('services.requestFrom', { name: provider.displayName }) : t('services.openRequest')}
      description={provider ? undefined : t('services.openRequestHint')}
      submitLabel={t('common.send')}
      disabled={!f.categoryId || !f.title.trim()}
      onSubmit={async () => {
        const r = await api.post<ServiceRequest>('/v1/service-requests', {
          categoryId: f.categoryId,
          providerId: provider?.id,
          providerServiceId: f.providerServiceId || undefined,
          title: f.title.trim(),
          description: f.description.trim() || undefined,
          localityId: f.localityId || undefined,
          locationNote: f.locationNote.trim() || undefined,
          preferredStart: localInputToIso(f.preferredStart),
          preferredEnd: localInputToIso(f.preferredEnd),
          onBehalfOfUserId: f.onBehalfOfUserId || undefined,
        });
        onCreated(r);
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Select label={t('common.category')} value={f.categoryId} onChange={(ev) => setF({ ...f, categoryId: ev.target.value, providerServiceId: '' })} placeholder={t('common.selectPlaceholder')} options={catOptions} />
        {services.filter((s) => s.categoryId === f.categoryId).length > 0 && (
          <Select label={t('services.service')} value={f.providerServiceId} onChange={(ev) => setF({ ...f, providerServiceId: ev.target.value })} placeholder={t('common.none')} options={services.filter((s) => s.categoryId === f.categoryId).map((s) => ({ value: s.id, label: s.title }))} />
        )}
      </div>
      {selectedCat?.seniorSupport && <p className="text-[0.82rem] text-ok">{t('services.seniorScreened')}</p>}
      <Input label={t('services.whatNeeded')} placeholder={t('services.whatNeededPlaceholder')} value={f.title} onChange={(ev) => setF({ ...f, title: ev.target.value })} maxLength={200} autoFocus />
      <Textarea label={t('common.details')} optional value={f.description} onChange={(ev) => setF({ ...f, description: ev.target.value })} rows={3} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Select label={t('settings.locality')} value={f.localityId} onChange={(ev) => setF({ ...f, localityId: ev.target.value })} placeholder={t('common.none')} options={(localities.data ?? []).map((l) => ({ value: l.id, label: `${l.name}, ${l.city}` }))} />
        <Input label={t('services.locationNote')} hint={t('services.locationNoteHint')} optional value={f.locationNote} onChange={(ev) => setF({ ...f, locationNote: ev.target.value })} maxLength={200} />
        <Input type="datetime-local" label={t('services.preferredFrom')} optional value={f.preferredStart} onChange={(ev) => setF({ ...f, preferredStart: ev.target.value })} />
        <Input type="datetime-local" label={t('services.preferredTo')} optional value={f.preferredEnd} onChange={(ev) => setF({ ...f, preferredEnd: ev.target.value })} />
      </div>
      {others.length > 0 && (
        <Select label={t('services.forSomeone')} hint={t('services.forSomeoneHint')} value={f.onBehalfOfUserId} onChange={(ev) => setF({ ...f, onBehalfOfUserId: ev.target.value })} placeholder={t('services.forMe')} options={others.map((p) => ({ value: p.userId, label: p.displayName }))} />
      )}
    </FormDialog>
  );
}
