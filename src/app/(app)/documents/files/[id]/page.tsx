'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Bot, Download, Pencil } from 'lucide-react';
import { api, fileUrl } from '@/lib/api';
import { useAction } from '@/lib/hooks';
import { useSession } from '@/lib/session';
import type { DocFile } from '@/lib/types';
import { useI18n } from '@/i18n';
import { useFolders } from '@/components/agents';
import { sizeLabel } from '@/components/documents';
import { Textarea } from '@/components/form';
import { Badge, Button, Card, ErrorNotice, KeyValue, LoadingBlock, PageHeader } from '@/components/ui';

export default function DocumentFilePage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useI18n();
  const { fmt } = useSession();
  const qc = useQueryClient();
  const file = useQuery({ queryKey: ['documents', 'file', id], queryFn: () => api.get<DocFile>(`/v1/documents/files/${id}`) });
  const text = useQuery({ queryKey: ['documents', 'file', id, 'text'], queryFn: () => api.get<{ text: string | null }>(`/v1/documents/files/${id}/text`), enabled: !!file.data?.readableText });
  const folders = useFolders();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  useEffect(() => setDraft(text.data?.text ?? ''), [text.data]);
  const save = useAction(() => api.put(`/v1/documents/files/${id}/text`, { content: draft }), {
    success: t('common.saved'),
    onSuccess: () => {
      setEditing(false);
      qc.invalidateQueries({ queryKey: ['documents'] });
    },
  });
  if (file.isLoading) return <LoadingBlock />;
  if (file.error) return <ErrorNotice error={file.error} onRetry={file.refetch} />;
  const f = file.data!;
  const folder = folders.data?.find((x) => x.id === f.folderId);
  const inline = fileUrl(`/v1/documents/files/${f.id}/content?inline=true`);
  return (
    <div className="max-w-4xl">
      <PageHeader
        title={f.name}
        back={{ href: `/documents?folder=${f.folderId}`, label: folder?.path ?? t('nav.documents') }}
        actions={
          <a href={fileUrl(`/v1/documents/files/${f.id}/content`)} download className="inline-flex h-11 items-center gap-2 rounded-xl border border-line bg-surface px-4 font-semibold text-ink hover:bg-surface-2">
            <Download className="size-4" /> {t('common.download')}
          </a>
        }
      />
      <KeyValue
        className="mb-4"
        items={[
          { label: t('common.type'), value: f.mimeType },
          { label: t('common.updated', { when: '' }).trim(), value: fmt.dateTime(f.updatedAt) },
          { label: t('common.details'), value: sizeLabel(f.sizeBytes) },
          ...(f.lastChangedByAgentId ? [{ label: t('nav.agents'), value: <Badge tone="info"><Bot className="size-3" /> {t('documents.byAgent')}</Badge> }] : []),
        ]}
      />
      <Card className="p-4">
        <div className="mb-3 flex items-center gap-2">
          <h2 className="me-auto font-semibold">{t('documents.preview')}</h2>
          {f.readableText && !editing && (
            <Button size="sm" variant="secondary" icon={<Pencil className="size-4" />} onClick={() => setEditing(true)}>
              {t('documents.editText')}
            </Button>
          )}
        </div>
        {f.mimeType.startsWith('image/') ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={inline} alt={f.name} className="mx-auto max-h-[70vh] rounded-lg" />
        ) : f.mimeType === 'application/pdf' ? (
          <iframe src={inline} title={f.name} className="h-[70vh] w-full rounded-lg border border-line" />
        ) : f.readableText ? (
          editing ? (
            <div className="space-y-3">
              <Textarea aria-label={f.name} value={draft} onChange={(e) => setDraft(e.target.value)} rows={18} className="font-mono text-sm" />
              <div className="flex gap-2">
                <Button loading={save.isPending} onClick={() => save.mutate()}>
                  {t('common.save')}
                </Button>
                <Button variant="ghost" onClick={() => (setEditing(false), setDraft(text.data?.text ?? ''))}>
                  {t('common.cancel')}
                </Button>
              </div>
            </div>
          ) : text.isLoading ? (
            <LoadingBlock rows={4} />
          ) : (
            <pre className="max-h-[70vh] overflow-auto whitespace-pre-wrap rounded-lg bg-surface-2 p-4 text-sm" dir="auto">
              {text.data?.text}
            </pre>
          )
        ) : (
          <p className="text-muted">{t('documents.noPreview')}</p>
        )}
      </Card>
    </div>
  );
}
