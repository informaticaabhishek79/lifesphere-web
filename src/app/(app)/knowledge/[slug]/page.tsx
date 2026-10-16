'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { ExternalLink } from 'lucide-react';
import { api } from '@/lib/api';
import { useSession } from '@/lib/session';
import { humanize, useI18n } from '@/i18n';
import { Badge, Card, CardBody, ErrorNotice, LoadingBlock, Notice, PageHeader } from '@/components/ui';

interface Article {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  body: string;
  canonicalUrl: string | null;
  topic: string | null;
  lastReviewedOn: string | null;
  publishedOn: string | null;
  disclaimer: string;
  source: { name: string; publisher: string | null; kind: string; url: string | null; reliabilityTier: number };
}

export default function ArticlePage() {
  const { slug } = useParams<{ slug: string }>();
  const { t, e } = useI18n();
  const { fmt } = useSession();
  const q = useQuery({ queryKey: ['knowledge', 'article', slug], queryFn: () => api.get<Article>(`/v1/knowledge/articles/${slug}`) });
  if (q.isLoading) return <LoadingBlock rows={4} />;
  if (q.error || !q.data) return <ErrorNotice error={q.error} />;
  const a = q.data;
  return (
    <div className="max-w-3xl">
      <PageHeader back={{ href: '/knowledge', label: t('nav.knowledge') }} eyebrow={a.topic ? humanize(a.topic) : undefined} title={a.title} description={a.summary ?? undefined} />
      <Card>
        <CardBody className="space-y-5 pt-5">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Badge tone="info">{e('sourceKind', a.source.kind)}</Badge>
            <span className="font-medium">{a.source.publisher ?? a.source.name}</span>
            {a.lastReviewedOn && <span className="text-muted">· {t('assistant.reviewed', { date: fmt.day(a.lastReviewedOn) })}</span>}
          </div>
          <article className="prose-body text-[1.02rem] leading-relaxed whitespace-pre-wrap">{a.body}</article>
          {a.canonicalUrl && (
            <a href={a.canonicalUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-brand">
              {t('knowledge.readOriginal')} <ExternalLink className="size-4" />
            </a>
          )}
        </CardBody>
      </Card>
      <Notice tone="info" className="mt-4">
        {a.disclaimer}
      </Notice>
    </div>
  );
}
