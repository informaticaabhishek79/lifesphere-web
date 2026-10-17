'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { BookOpen, Search } from 'lucide-react';
import { api } from '@/lib/api';
import { usePaged } from '@/lib/hooks';
import { useSession } from '@/lib/session';
import type { ArticleSummary } from '@/lib/types';
import { useI18n } from '@/i18n';
import { countryName, flagOf } from '@/lib/countries';
import { Badge, ButtonLink, cx, EmptyState, ErrorNotice, LoadingBlock, LoadMore, Notice, PageHeader } from '@/components/ui';
import { Input } from '@/components/form';

function Inner() {
  const { t, e, locale } = useI18n();
  const { fmt, featureOn } = useSession();
  const params = useSearchParams();
  const [search, setSearch] = useState(params.get('q') ?? '');
  const [q, setQ] = useState(search);
  const [topic, setTopic] = useState('');
  useEffect(() => {
    const id = setTimeout(() => setQ(search), 300);
    return () => clearTimeout(id);
  }, [search]);
  const topics = useQuery({ queryKey: ['knowledge', 'topics'], queryFn: () => api.get<{ topic: string | null; count: number }[]>('/v1/knowledge/topics') });
  const list = usePaged<ArticleSummary, { disclaimer: string }>(['knowledge', 'articles'], '/v1/knowledge/articles', { q: q || undefined, topic: topic || undefined });
  return (
    <div className="max-w-3xl">
      <PageHeader title={t('nav.knowledge')} description={t('knowledge.intro')} actions={featureOn('assistant') ? <ButtonLink href="/assistant" variant="secondary">{t('knowledge.askAssistant')}</ButtonLink> : undefined} />
      <div className="relative mb-3">
        <Search className="pointer-events-none absolute top-3.5 start-3 size-4 text-muted" />
        <Input aria-label={t('common.search')} placeholder={t('knowledge.searchPlaceholder')} value={search} onChange={(ev) => setSearch(ev.target.value)} className="ps-9" />
      </div>
      <div className="mb-5 flex flex-wrap gap-2">
        <button type="button" onClick={() => setTopic('')} className={cx('rounded-full border px-3 py-1 text-sm font-semibold', !topic ? 'border-brand bg-brand text-brand-ink' : 'border-line')}>
          {t('common.all')}
        </button>
        {topics.data
          ?.filter((x) => x.topic)
          .map((x) => (
            <button key={x.topic} type="button" onClick={() => setTopic(x.topic!)} className={cx('rounded-full border px-3 py-1 text-sm font-semibold', topic === x.topic ? 'border-brand bg-brand text-brand-ink' : 'border-line')}>
              {e('topic', x.topic!)} <span className="opacity-60">{x.count}</span>
            </button>
          ))}
      </div>
      {list.first?.disclaimer && <Notice tone="info" className="mb-4">{list.first.disclaimer}</Notice>}
      {list.isLoading && <LoadingBlock />}
      <ErrorNotice error={list.error} />
      {!list.isLoading && list.items.length === 0 && <EmptyState icon={<BookOpen className="size-6" />} title={t('knowledge.none')} />}
      <ul className="space-y-2">
        {list.items.map((a) => (
          <li key={a.id}>
            <Link href={`/knowledge/${a.slug}`} className="card block px-4 py-3 hover:border-line-strong">
              <div className="font-semibold">{a.title}</div>
              {a.summary && <p className="mt-0.5 line-clamp-2 text-sm text-muted">{a.summary}</p>}
              <div className="mt-1.5 flex flex-wrap gap-2 text-xs">
                {a.topic && <Badge>{e('topic', a.topic)}</Badge>}
                {a.country && (
                  <Badge tone="info">
                    {flagOf(a.country)} {countryName(a.country, locale)}
                  </Badge>
                )}
                {a.lastReviewedOn && <span className="text-muted">{t('assistant.reviewed', { date: fmt.day(a.lastReviewedOn) })}</span>}
              </div>
            </Link>
          </li>
        ))}
      </ul>
      <LoadMore hasMore={list.hasMore} loading={list.loadingMore} onClick={list.loadMore} />
    </div>
  );
}

export default function KnowledgePage() {
  return (
    <Suspense>
      <Inner />
    </Suspense>
  );
}
