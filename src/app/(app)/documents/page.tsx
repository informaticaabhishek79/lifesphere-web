'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Bot, FilePlus2, FileText, Folder, FolderInput, FolderPlus, Pencil, RotateCcw, Trash2, Upload } from 'lucide-react';
import { FileIcon, sizeLabel } from '@/components/documents';
import { api } from '@/lib/api';
import { useAction } from '@/lib/hooks';
import { useSession } from '@/lib/session';
import type { DocFile, DocFolder } from '@/lib/types';
import { useI18n } from '@/i18n';
import { useAgents, useFolders } from '@/components/agents';
import { FormDialog, useConfirm } from '@/components/dialog';
import { Input, Select, Textarea } from '@/components/form';
import { Badge, Button, Card, cx, EmptyState, ErrorNotice, IconButton, LoadingBlock, Notice, PageHeader } from '@/components/ui';

type Dlg = { kind: 'folder'; parentId: string | null } | { kind: 'renameFolder'; folder: DocFolder } | { kind: 'moveFolder'; folder: DocFolder } | { kind: 'note' } | { kind: 'renameFile'; file: DocFile } | { kind: 'moveFile'; file: DocFile } | null;

function Inner() {
  const { t } = useI18n();
  const { fmt } = useSession();
  const router = useRouter();
  const params = useSearchParams();
  const qc = useQueryClient();
  const confirm = useConfirm();
  const folders = useFolders();
  const agents = useAgents();
  const view = params.get('view') === 'bin' ? 'bin' : 'files';
  const selected = params.get('folder') ?? folders.data?.[0]?.id ?? null;
  const folder = folders.data?.find((f) => f.id === selected) ?? null;
  const files = useQuery({ queryKey: ['documents', 'files', selected], queryFn: () => api.get<DocFile[]>(`/v1/documents/folders/${selected}/files`), enabled: !!selected && view === 'files' && !!folder });
  const bin = useQuery({ queryKey: ['documents', 'bin'], queryFn: () => api.get<{ folders: DocFolder[]; files: DocFile[]; purgeAfterDays: number }>('/v1/documents/bin'), enabled: view === 'bin' });
  const [dlg, setDlg] = useState<Dlg>(null);
  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const [target, setTarget] = useState('');
  const upload = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<unknown>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: ['documents'] });
  const go = (q: string) => router.replace(`/documents${q}`, { scroll: false });

  // Which agents can reach the selected folder (directly or through a parent).
  const withAccess = useMemo(() => {
    if (!folder || !agents.data || !folders.data) return [];
    const chain = new Set<string>();
    let cur: DocFolder | undefined = folder;
    let guard = 0;
    while (cur && guard++ < 50) {
      chain.add(cur.id);
      cur = folders.data.find((f) => f.id === cur!.parentId);
    }
    return agents.data.filter((a) => a.kind === 'documents' && a.status === 'active' && a.folders.some((g) => chain.has(g.folderId))).map((a) => ({ a, access: a.folders.find((g) => chain.has(g.folderId))!.access }));
  }, [folder, agents.data, folders.data]);

  const binFile = useAction((f: DocFile) => api.del(`/v1/documents/files/${f.id}`), { invalidate: [['documents']], success: t('documents.binned') });
  const restoreFile = useAction((id: string) => api.post(`/v1/documents/files/${id}/restore`), { invalidate: [['documents']], success: t('documents.restored') });
  const restoreFolder = useAction((id: string) => api.post(`/v1/documents/folders/${id}/restore`), { invalidate: [['documents'], ['agents']], success: t('documents.restored') });

  const open = (d: Dlg, initialName = '') => {
    setName(initialName);
    setContent('');
    setTarget('');
    setDlg(d);
  };

  const folderOptions = (exclude?: string) => {
    const all = folders.data ?? [];
    // A folder can't move into itself or anything inside it.
    const blocked = new Set<string>();
    if (exclude) {
      blocked.add(exclude);
      let changed = true;
      while (changed) {
        changed = false;
        for (const f of all) if (f.parentId && blocked.has(f.parentId) && !blocked.has(f.id)) (blocked.add(f.id), (changed = true));
      }
    }
    return all.filter((f) => !blocked.has(f.id)).map((f) => ({ value: f.id, label: f.path }));
  };

  return (
    <div className="max-w-6xl">
      <PageHeader
        title={t('nav.documents')}
        description={t('documents.intro')}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant={view === 'bin' ? 'primary' : 'secondary'} icon={<Trash2 className="size-4" />} onClick={() => go(view === 'bin' ? '' : '?view=bin')}>
              {t('documents.bin')}
            </Button>
            <Button icon={<FolderPlus className="size-4" />} onClick={() => open({ kind: 'folder', parentId: null })}>
              {t('documents.newFolder')}
            </Button>
          </div>
        }
      />
      <Notice tone="info" className="mb-4">
        {t('documents.notForSensitive')}
      </Notice>
      {folders.isLoading && <LoadingBlock />}
      <ErrorNotice error={folders.error} onRetry={folders.refetch} />

      {view === 'bin' ? (
        <Card className="p-4">
          {bin.isLoading && <LoadingBlock />}
          {bin.data && <p className="mb-3 text-sm text-muted">{t('documents.binHint', { days: bin.data.purgeAfterDays })}</p>}
          {bin.data && !bin.data.files.length && !bin.data.folders.length && <p className="text-muted">{t('documents.binEmpty')}</p>}
          <ul className="divide-y divide-line">
            {bin.data?.folders.map((f) => (
              <li key={f.id} className="flex items-center gap-3 py-2.5">
                <Folder className="size-5 text-muted" aria-hidden />
                <span className="min-w-0 flex-1 truncate font-medium">{f.name}</span>
                <span className="text-xs text-muted">{fmt.ago(f.deletedAt)}</span>
                <Button size="sm" variant="secondary" icon={<RotateCcw className="size-4" />} onClick={() => restoreFolder.mutate(f.id)}>
                  {t('documents.restore')}
                </Button>
              </li>
            ))}
            {bin.data?.files.map((f) => (
              <li key={f.id} className="flex items-center gap-3 py-2.5">
                <FileText className="size-5 text-muted" aria-hidden />
                <span className="min-w-0 flex-1 truncate font-medium">{f.name}</span>
                <span className="text-xs text-muted">{fmt.ago(f.deletedAt)}</span>
                <Button size="sm" variant="secondary" icon={<RotateCcw className="size-4" />} onClick={() => restoreFile.mutate(f.id)}>
                  {t('documents.restore')}
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      ) : folders.data?.length === 0 ? (
        <EmptyState icon={<Folder className="size-6" />} title={t('documents.noFolders')} body={t('documents.noFoldersBody')} action={<Button onClick={() => open({ kind: 'folder', parentId: null })}>{t('documents.newFolder')}</Button>} />
      ) : (
        folders.data && (
          <div className="grid gap-4 md:grid-cols-[17rem_1fr]">
            <Card as="div" className="h-fit p-2">
              <nav aria-label={t('nav.documents')}>
                <ul>
                  {folders.data.map((f) => {
                    const depth = f.path.split(' / ').length - 1;
                    return (
                      <li key={f.id}>
                        <button
                          type="button"
                          onClick={() => go(`?folder=${f.id}`)}
                          aria-current={f.id === selected ? 'true' : undefined}
                          className={cx('flex w-full items-center gap-2 rounded-lg py-2 pe-2 text-start text-sm', f.id === selected ? 'bg-brand-soft font-semibold text-brand' : 'hover:bg-surface-2')}
                          style={{ paddingInlineStart: `${0.5 + depth * 1}rem` }}
                        >
                          <Folder className="size-4 shrink-0" aria-hidden />
                          <span className="min-w-0 flex-1 truncate">{f.name}</span>
                          {!!f.fileCount && <span className="text-xs text-muted">{f.fileCount}</span>}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </nav>
            </Card>

            <div className="min-w-0">
              {!folder ? (
                <p className="text-muted">{t('documents.pickFolder')}</p>
              ) : (
                <>
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <h2 className="me-auto min-w-0 truncate font-display text-xl font-semibold">{folder.path}</h2>
                    <input
                      ref={upload}
                      type="file"
                      hidden
                      multiple
                      onChange={async (e) => {
                        const list = [...(e.target.files ?? [])];
                        e.target.value = '';
                        if (!list.length) return;
                        setUploading(true);
                        setUploadError(null);
                        try {
                          for (const file of list) {
                            const form = new FormData();
                            form.append('file', file);
                            await api.upload(`/v1/documents/folders/${folder.id}/files`, form);
                          }
                        } catch (err) {
                          setUploadError(err);
                        } finally {
                          setUploading(false);
                          refresh();
                        }
                      }}
                    />
                    <Button size="sm" icon={<Upload className="size-4" />} loading={uploading} onClick={() => upload.current?.click()}>
                      {uploading ? t('documents.uploading') : t('documents.upload')}
                    </Button>
                    <Button size="sm" variant="secondary" icon={<FilePlus2 className="size-4" />} onClick={() => open({ kind: 'note' })}>
                      {t('documents.newNote')}
                    </Button>
                    <Button size="sm" variant="secondary" icon={<FolderPlus className="size-4" />} onClick={() => open({ kind: 'folder', parentId: folder.id })}>
                      {t('documents.subfolder')}
                    </Button>
                    <IconButton label={t('documents.rename')} onClick={() => open({ kind: 'renameFolder', folder }, folder.name)}>
                      <Pencil className="size-4" />
                    </IconButton>
                    <IconButton label={t('documents.move')} onClick={() => open({ kind: 'moveFolder', folder })}>
                      <FolderInput className="size-4" />
                    </IconButton>
                    <IconButton
                      label={t('documents.toBin')}
                      onClick={async () => {
                        if (!(await confirm({ title: t('documents.binTitle'), body: t('documents.binFolderBody', { days: 30 }), confirmLabel: t('documents.toBin'), danger: true }))) return;
                        await api.del(`/v1/documents/folders/${folder.id}`);
                        refresh();
                        qc.invalidateQueries({ queryKey: ['agents'] });
                        go('');
                      }}
                    >
                      <Trash2 className="size-4" />
                    </IconButton>
                  </div>
                  <p className="mb-3 text-xs text-muted">{t('documents.allowed')}</p>
                  <ErrorNotice error={uploadError} className="mb-3" />

                  <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
                    <Bot className="size-4 text-muted" aria-hidden />
                    <span className="font-semibold text-muted">{t('documents.agentsWithAccess')}:</span>
                    {withAccess.length ? (
                      withAccess.map(({ a, access }) => (
                        <Badge key={a.id} tone={access === 'edit' ? 'warn' : 'neutral'}>
                          {a.name} · {t(`enums.folderAccess.${access}`)}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-muted">{t('documents.noAgentAccess')}</span>
                    )}
                  </div>

                  {files.isLoading && <LoadingBlock />}
                  <ErrorNotice error={files.error} onRetry={files.refetch} />
                  {files.data?.length === 0 && <p className="rounded-xl bg-surface-2 px-4 py-6 text-center text-muted">{t('documents.emptyFolder')}</p>}
                  {(files.data?.length ?? 0) > 0 && (
                    <ul className="card divide-y divide-line overflow-hidden">
                      {files.data!.map((f) => (
                        <li key={f.id} className="flex items-center gap-3 px-4 py-3">
                          <FileIcon mime={f.mimeType} />
                          <Link href={`/documents/files/${f.id}`} className="min-w-0 flex-1">
                            <div className="truncate font-medium text-ink hover:underline">{f.name}</div>
                            <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-sm text-muted">
                              <span>{sizeLabel(f.sizeBytes)}</span>
                              <span aria-hidden>·</span>
                              <span>{fmt.ago(f.updatedAt)}</span>
                              {f.lastChangedByAgentId && (
                                <Badge tone="info">
                                  <Bot className="size-3" /> {t('documents.byAgent')}
                                </Badge>
                              )}
                            </div>
                          </Link>
                          <IconButton label={t('documents.rename')} onClick={() => open({ kind: 'renameFile', file: f }, f.name)}>
                            <Pencil className="size-4" />
                          </IconButton>
                          <IconButton label={t('documents.move')} onClick={() => open({ kind: 'moveFile', file: f })}>
                            <FolderInput className="size-4" />
                          </IconButton>
                          <IconButton label={t('documents.toBin')} onClick={() => binFile.mutate(f)}>
                            <Trash2 className="size-4" />
                          </IconButton>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </div>
          </div>
        )
      )}

      <FormDialog
        open={dlg?.kind === 'folder' || dlg?.kind === 'renameFolder' || dlg?.kind === 'renameFile'}
        onClose={() => setDlg(null)}
        title={dlg?.kind === 'folder' ? (dlg.parentId ? t('documents.subfolder') : t('documents.newFolder')) : t('documents.rename')}
        submitLabel={dlg?.kind === 'folder' ? t('common.create') : t('common.save')}
        disabled={!name.trim()}
        onSubmit={async () => {
          if (dlg?.kind === 'folder') {
            const f = await api.post<DocFolder>('/v1/documents/folders', { name, parentId: dlg.parentId });
            go(`?folder=${f.id}`);
          } else if (dlg?.kind === 'renameFolder') await api.patch(`/v1/documents/folders/${dlg.folder.id}`, { name });
          else if (dlg?.kind === 'renameFile') await api.patch(`/v1/documents/files/${dlg.file.id}`, { name });
          refresh();
          qc.invalidateQueries({ queryKey: ['agents'] });
        }}
      >
        <Input label={dlg?.kind === 'folder' ? t('documents.folderName') : t('common.name')} value={name} onChange={(e) => setName(e.target.value)} maxLength={dlg?.kind === 'renameFile' ? 200 : 120} autoFocus />
      </FormDialog>

      <FormDialog
        open={dlg?.kind === 'moveFile' || dlg?.kind === 'moveFolder'}
        onClose={() => setDlg(null)}
        title={t('documents.move')}
        submitLabel={t('documents.move')}
        disabled={dlg?.kind === 'moveFile' && !target}
        onSubmit={async () => {
          if (dlg?.kind === 'moveFile') await api.patch(`/v1/documents/files/${dlg.file.id}`, { folderId: target });
          else if (dlg?.kind === 'moveFolder') await api.patch(`/v1/documents/folders/${dlg.folder.id}`, { parentId: target || null });
          refresh();
          qc.invalidateQueries({ queryKey: ['agents'] });
        }}
      >
        <Select
          label={t('documents.moveTo')}
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          placeholder={dlg?.kind === 'moveFolder' ? t('documents.topLevel') : t('common.selectPlaceholder')}
          options={folderOptions(dlg?.kind === 'moveFolder' ? dlg.folder.id : undefined).filter((o) => dlg?.kind !== 'moveFile' || o.value !== dlg.file.folderId)}
        />
      </FormDialog>

      <FormDialog
        open={dlg?.kind === 'note'}
        onClose={() => setDlg(null)}
        title={t('documents.newNote')}
        submitLabel={t('common.create')}
        size="lg"
        disabled={!name.trim() || !folder}
        onSubmit={async () => {
          await api.post('/v1/documents/files/text', { folderId: folder!.id, name, content });
          refresh();
        }}
      >
        <Input label={t('documents.noteName')} placeholder={t('documents.noteNamePlaceholder')} value={name} onChange={(e) => setName(e.target.value)} maxLength={200} autoFocus />
        <Textarea label={t('documents.noteContent')} value={content} onChange={(e) => setContent(e.target.value)} rows={10} />
      </FormDialog>
    </div>
  );
}

export default function DocumentsPage() {
  return (
    <Suspense>
      <Inner />
    </Suspense>
  );
}
