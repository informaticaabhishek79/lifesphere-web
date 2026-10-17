'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '@/lib/api';
import { useAction, usePaged } from '@/lib/hooks';
import { useSession } from '@/lib/session';
import { useCountryOptions } from '@/lib/countries';
import { useI18n } from '@/i18n';
import { Badge, Button, LoadingBlock, LoadMore, Notice, PageHeader, Tabs } from '@/components/ui';
import { Select } from '@/components/form';
import { useConfirm } from '@/components/dialog';
import { StatusBadge } from '@/components/status';
import { DataTable, RecordDialog, type FieldSpec } from '@/components/admin';

interface Source {
  id: string;
  name: string;
  publisher: string | null;
  url: string | null;
  kind: string;
  reliabilityTier: number;
  reliabilityNote: string | null;
  active: boolean;
  reviewIntervalDays: number;
  lastIngestedAt: string | null;
}
interface ArticleRow {
  id: string;
  slug: string;
  title: string;
  topic: string | null;
  status: string;
  sourceId: string;
  lastReviewedOn: string | null;
  updatedAt: string;
}
type Tab = 'articles' | 'due' | 'sources';

export default function AdminKnowledge() {
  const countryOptions = useCountryOptions('en');
  const { e } = useI18n();
  const { fmt } = useSession();
  const qc = useQueryClient();
  const confirm = useConfirm();
  const [tab, setTab] = useState<Tab>('articles');
  const [status, setStatus] = useState('');
  const sources = useQuery({ queryKey: ['admin', 'sources'], queryFn: () => api.get<Source[]>('/v1/admin/knowledge/sources') });
  const articles = usePaged<ArticleRow>(['admin', 'articles'], '/v1/admin/knowledge/articles', { status: status || undefined }, { enabled: tab === 'articles' });
  const due = useQuery({ queryKey: ['admin', 'articles-due'], queryFn: () => api.get<ArticleRow[]>('/v1/admin/knowledge/articles/review-due'), enabled: tab === 'due' });
  const [edit, setEdit] = useState<{ kind: 'source' | 'article'; row: Record<string, unknown> | null } | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: ['admin'] });
  const setArticleStatus = useAction(({ id, status: s }: { id: string; status: string }) => api.patch(`/v1/admin/knowledge/articles/${id}`, { status: s, lastReviewedOn: s === 'published' ? new Date().toISOString().slice(0, 10) : undefined }), { onSuccess: refresh });
  const delArticle = useAction((id: string) => api.del(`/v1/admin/knowledge/articles/${id}`), { onSuccess: refresh });
  const markReviewed = useAction((id: string) => api.patch(`/v1/admin/knowledge/articles/${id}`, { lastReviewedOn: new Date().toISOString().slice(0, 10) }), { onSuccess: refresh, success: 'Marked as reviewed today.' });
  const sourceName = (id: string) => sources.data?.find((s) => s.id === id)?.name ?? '—';

  const SOURCE_FIELDS: FieldSpec[] = [
    { name: 'name', label: 'Name', required: true },
    { name: 'kind', label: 'Kind', type: 'select', required: true, options: ['official', 'ngo', 'internal', 'other'].map((k) => ({ value: k, label: e('sourceKind', k) })) },
    { name: 'publisher', label: 'Publisher' },
    { name: 'url', label: 'URL' },
    { name: 'reliabilityTier', label: 'Reliability tier (1 = highest)', type: 'number' },
    { name: 'reviewIntervalDays', label: 'Review every (days)', type: 'number' },
    { name: 'reliabilityNote', label: 'Reliability note', type: 'textarea' },
    { name: 'active', label: 'Active', type: 'checkbox' },
  ];
  const countryList = countryOptions.map((c) => ({ value: c.code, label: `${c.flag} ${c.name}` }));
  const ARTICLE_FIELDS: FieldSpec[] = [
    { name: 'sourceId', label: 'Source', type: 'select', required: true, createOnly: true, options: (sources.data ?? []).map((s) => ({ value: s.id, label: s.name })) },
    { name: 'title', label: 'Title', required: true },
    { name: 'topic', label: 'Topic', required: true, hint: 'e.g. consumer, utilities, safety' },
    { name: 'country', label: 'Country', type: 'select', options: countryList, hint: 'Leave empty for general guidance shown in every country' },
    { name: 'language', label: 'Language code', createOnly: true, hint: 'e.g. en, hi, es, ar' },
    { name: 'summary', label: 'Summary', type: 'textarea' },
    { name: 'body', label: 'Body (plain text)', type: 'textarea', hint: 'Leave empty and give a URL to fetch from instead.' },
    { name: 'fetchUrl', label: 'Fetch body from URL', createOnly: true, hint: 'The page text is fetched and stored as a draft.' },
    { name: 'canonicalUrl', label: 'Canonical URL (cited)' },
    { name: 'lastReviewedOn', label: 'Last reviewed', type: 'date' },
    { name: 'disclaimer', label: 'Disclaimer', type: 'textarea' },
    { name: 'publish', label: 'Publish now', type: 'checkbox', createOnly: true },
  ];

  const openArticle = async (r: ArticleRow) => {
    const full = await api.get<Record<string, unknown>>(`/v1/admin/knowledge/articles/${r.slug}`);
    setEdit({ kind: 'article', row: full });
  };

  const articleCols = [
    { key: 'title', label: 'Title', render: (r: ArticleRow) => <button type="button" className="text-start font-medium text-brand" onClick={() => openArticle(r)}>{r.title}</button> },
    { key: 'topic', label: 'Topic' },
    { key: 'source', label: 'Source', render: (r: ArticleRow) => sourceName(r.sourceId) },
    { key: 'lastReviewedOn', label: 'Reviewed', render: (r: ArticleRow) => (r.lastReviewedOn ? fmt.day(r.lastReviewedOn) : <Badge tone="warn">Never</Badge>) },
    { key: 'status', label: 'Status', render: (r: ArticleRow) => <StatusBadge group="articleStatus" value={r.status} /> },
    {
      key: 'x',
      label: '',
      render: (r: ArticleRow) => (
        <div className="flex flex-wrap gap-1">
          {r.status !== 'published' && <Button size="sm" onClick={() => setArticleStatus.mutate({ id: r.id, status: 'published' })}>Publish</Button>}
          {r.status === 'published' && <Button size="sm" variant="secondary" onClick={() => setArticleStatus.mutate({ id: r.id, status: 'archived' })}>Archive</Button>}
          <Button size="sm" variant="ghost" onClick={() => markReviewed.mutate(r.id)}>Reviewed today</Button>
          <Button size="sm" variant="ghost" className="text-danger" onClick={async () => { if (await confirm({ title: 'Delete article?', body: r.title, danger: true })) delArticle.mutate(r.id); }}>Delete</Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Knowledge"
        description="Public guidance the assistant answers from. Only published articles from active sources are used."
        actions={
          <>
            <Button variant="secondary" onClick={() => setEdit({ kind: 'source', row: { active: true, reliabilityTier: 2, reviewIntervalDays: 180 } })}>Add source</Button>
            <Button onClick={() => setEdit({ kind: 'article', row: null })} disabled={!sources.data?.length}>Add article</Button>
          </>
        }
      />
      <Tabs<Tab> value={tab} onChange={setTab} tabs={[{ value: 'articles', label: 'Articles' }, { value: 'due', label: 'Review due' }, { value: 'sources', label: 'Sources' }]} />
      {tab === 'articles' && (
        <>
          <Select aria-label="Status" value={status} onChange={(ev) => setStatus(ev.target.value)} placeholder="All" options={['draft', 'published', 'archived'].map((s) => ({ value: s, label: e('articleStatus', s) }))} fieldClassName="mb-4 w-48" />
          {articles.isLoading && <LoadingBlock />}
          <DataTable rows={articles.items} rowKey={(r) => r.id} columns={articleCols} />
          <LoadMore hasMore={articles.hasMore} loading={articles.loadingMore} onClick={articles.loadMore} />
        </>
      )}
      {tab === 'due' && (
        <>
          <Notice tone="warn" className="mb-4">These published articles are past their source’s review interval. Check them against the source and mark them reviewed, or archive them.</Notice>
          <DataTable rows={due.data ?? []} rowKey={(r) => r.id} columns={articleCols} empty="Everything is up to date." />
        </>
      )}
      {tab === 'sources' && (
        <DataTable
          rows={sources.data ?? []}
          rowKey={(r) => r.id}
          onRowClick={(r) => setEdit({ kind: 'source', row: r as unknown as Record<string, unknown> })}
          columns={[
            { key: 'name', label: 'Name' },
            { key: 'kind', label: 'Kind', render: (r: Source) => e('sourceKind', r.kind) },
            { key: 'reliabilityTier', label: 'Tier' },
            { key: 'reviewIntervalDays', label: 'Review (days)' },
            { key: 'active', label: '', render: (r: Source) => (!r.active ? <Badge>Inactive</Badge> : null) },
          ]}
        />
      )}
      {edit && (
        <RecordDialog
          title={`${edit.row?.id ? 'Edit' : 'Add'} ${edit.kind}`}
          fields={edit.kind === 'source' ? SOURCE_FIELDS : ARTICLE_FIELDS}
          initial={edit.row}
          editing={!!edit.row?.id}
          onClose={() => setEdit(null)}
          onSubmit={async (body) => {
            const id = edit.row?.id as string | undefined;
            if (edit.kind === 'source') {
              if (id) await api.patch(`/v1/admin/knowledge/sources/${id}`, body);
              else await api.post('/v1/admin/knowledge/sources', body);
            } else if (id) await api.patch(`/v1/admin/knowledge/articles/${id}`, body);
            else await api.post('/v1/admin/knowledge/articles', body);
            refresh();
          }}
        />
      )}
    </div>
  );
}
