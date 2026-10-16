'use client';

import { useState } from 'react';
import { ClipboardList } from 'lucide-react';
import { usePaged } from '@/lib/hooks';
import { useSession } from '@/lib/session';
import type { ServiceRequest, ServiceRequestStatus } from '@/lib/types';
import { useI18n } from '@/i18n';
import { ButtonLink, EmptyState, ErrorNotice, List, ListItem, LoadingBlock, LoadMore, PageHeader } from '@/components/ui';
import { Select } from '@/components/form';
import { StatusBadge } from '@/components/status';

const STATUSES: ServiceRequestStatus[] = ['requested', 'accepted', 'scheduled', 'in_progress', 'completed', 'declined', 'cancelled', 'disputed'];

export default function ServiceRequestsPage() {
  const { t, e } = useI18n();
  const { fmt } = useSession();
  const [status, setStatus] = useState('');
  const list = usePaged<ServiceRequest>(['service-requests'], '/v1/service-requests', { status: status || undefined });
  return (
    <div className="max-w-3xl">
      <PageHeader title={t('nav.serviceRequests')} actions={<ButtonLink href="/services">{t('services.findHelp')}</ButtonLink>} />
      <Select aria-label={t('common.status')} value={status} onChange={(ev) => setStatus(ev.target.value)} placeholder={t('common.all')} options={STATUSES.map((s) => ({ value: s, label: e('serviceRequestStatus', s) }))} fieldClassName="mb-4 w-56" />
      {list.isLoading && <LoadingBlock />}
      <ErrorNotice error={list.error} onRetry={list.refetch} />
      {!list.isLoading && list.items.length === 0 && <EmptyState icon={<ClipboardList className="size-6" />} title={t('services.noRequests')} action={<ButtonLink href="/services">{t('services.findHelp')}</ButtonLink>} />}
      {list.items.length > 0 && (
        <List>
          {list.items.map((r) => (
            <ListItem
              key={r.id}
              href={`/service-requests/${r.id}`}
              title={r.title}
              subtitle={[r.scheduledAt ? t('services.scheduledFor', { when: fmt.dateTime(r.scheduledAt) }) : null, t('common.updated', { when: fmt.ago(r.updatedAt) })].filter(Boolean).join(' · ')}
              trailing={<StatusBadge group="serviceRequestStatus" value={r.status} />}
            />
          ))}
        </List>
      )}
      <LoadMore hasMore={list.hasMore} loading={list.loadingMore} onClick={list.loadMore} />
    </div>
  );
}
