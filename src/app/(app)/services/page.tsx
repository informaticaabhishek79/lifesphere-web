'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { Hammer, Megaphone, Search } from 'lucide-react';
import { usePaged } from '@/lib/hooks';
import { useLocalities, useServiceCategories } from '@/lib/data';
import { useSession } from '@/lib/session';
import type { ProviderPublic } from '@/lib/types';
import { useI18n } from '@/i18n';
import { Badge, Button, Card, CardBody, EmptyState, ErrorNotice, LoadingBlock, LoadMore, Notice, PageHeader } from '@/components/ui';
import { Checkbox, Input, Select } from '@/components/form';
import { RequestServiceDialog, Stars, VerificationBadge } from '@/components/services';
import Link from 'next/link';

function Inner() {
  const { t, e } = useI18n();
  const { me } = useSession();
  const params = useSearchParams();
  const router = useRouter();
  const categories = useServiceCategories();
  const localities = useLocalities();
  const [categoryId, setCategoryId] = useState(params.get('category') ?? '');
  const [localityId, setLocalityId] = useState(me.profile.locality?.id ?? '');
  const [search, setSearch] = useState(params.get('q') ?? '');
  const [q, setQ] = useState(search);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [openReq, setOpenReq] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setQ(search), 300);
    return () => clearTimeout(id);
  }, [search]);
  const list = usePaged<ProviderPublic, { disclosure: string }>(['services', 'providers'], '/v1/services/providers', {
    categoryId: categoryId || undefined,
    localityId: localityId || undefined,
    search: q || undefined,
    verifiedOnly: verifiedOnly ? 'true' : undefined,
  });
  return (
    <div className="max-w-4xl">
      <PageHeader
        title={t('nav.services')}
        description={t('services.intro')}
        actions={
          <Button variant="secondary" icon={<Megaphone className="size-4" />} onClick={() => setOpenReq(true)}>
            {t('services.openRequest')}
          </Button>
        }
      />
      <div className="mb-3 grid gap-3 sm:grid-cols-3">
        <div className="relative">
          <Search className="pointer-events-none absolute top-3.5 start-3 size-4 text-muted" />
          <Input aria-label={t('common.search')} placeholder={t('services.searchPlaceholder')} value={search} onChange={(ev) => setSearch(ev.target.value)} className="ps-9" />
        </div>
        <Select aria-label={t('common.category')} value={categoryId} onChange={(ev) => setCategoryId(ev.target.value)} placeholder={t('tasks.allCategories')} options={(categories.data ?? []).filter((c) => c.active).map((c) => ({ value: c.id, label: c.name }))} />
        <Select aria-label={t('settings.locality')} value={localityId} onChange={(ev) => setLocalityId(ev.target.value)} placeholder={t('services.anywhere')} options={(localities.data ?? []).map((l) => ({ value: l.id, label: `${l.name}, ${l.city}` }))} />
      </div>
      <Checkbox className="mb-4" label={t('services.verifiedOnly')} checked={verifiedOnly} onChange={setVerifiedOnly} />
      {list.first?.disclosure && <Notice tone="info" className="mb-4">{list.first.disclosure}</Notice>}
      {list.isLoading && <LoadingBlock />}
      <ErrorNotice error={list.error} onRetry={list.refetch} />
      {!list.isLoading && list.items.length === 0 && (
        <EmptyState icon={<Hammer className="size-6" />} title={t('services.none')} body={t('services.noneBody')} action={<Button onClick={() => setOpenReq(true)}>{t('services.openRequest')}</Button>} />
      )}
      <div className="grid gap-3 md:grid-cols-2">
        {list.items.map((p) => (
          <Link key={p.id} href={`/services/providers/${p.id}`} className="block">
            <Card className="h-full hover:border-line-strong">
              <CardBody className="space-y-2 pt-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="font-semibold">{p.displayName}</div>
                  {p.sponsored && <Badge tone="warn" title={p.sponsoredDisclosure ?? undefined}>{t('services.sponsored')}</Badge>}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <VerificationBadge level={p.verificationLevel} label={p.verificationLabel} />
                  <Badge>{e('providerType', p.providerType)}</Badge>
                  <Stars value={p.rating?.average} count={p.rating?.count} />
                </div>
                {p.description && <p className="line-clamp-2 text-sm text-muted">{p.description}</p>}
              </CardBody>
            </Card>
          </Link>
        ))}
      </div>
      <LoadMore hasMore={list.hasMore} loading={list.loadingMore} onClick={list.loadMore} />
      <RequestServiceDialog open={openReq} onClose={() => setOpenReq(false)} defaultCategoryId={categoryId} onCreated={(r) => router.push(`/service-requests/${r.id}`)} />
    </div>
  );
}

export default function ServicesPage() {
  return (
    <Suspense>
      <Inner />
    </Suspense>
  );
}
