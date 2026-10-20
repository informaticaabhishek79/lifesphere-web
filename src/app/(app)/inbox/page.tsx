'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Copy, FolderOpen, FolderSync, HardDrive, Inbox, RotateCcw, Sparkles, Undo2, Upload } from 'lucide-react';
import { api } from '@/lib/api';
import { useHouseholds } from '@/lib/data';
import { useAction } from '@/lib/hooks';
import { allowAgain, connectFolder, disconnectFolder, folderSyncSupported, MAX_BYTES, syncOnce, syncState, type SyncState } from '@/lib/inbox-sync';
import { useSession } from '@/lib/session';
import type { InboxHint, InboxImport, InboxStatus } from '@/lib/types';
import { useI18n } from '@/i18n';
import { useConfirm, useToast } from '@/components/dialog';
import { Checkbox, Select, Switch } from '@/components/form';
import { inboxTargets } from '@/components/inbox-watcher';
import { Badge, Button, ButtonLink, Card, CardHeader, cx, EmptyState, ErrorNotice, LoadingBlock, Notice, PageHeader } from '@/components/ui';

const STATUS_TONE: Record<InboxImport['status'], 'neutral' | 'brand' | 'ok' | 'warn' | 'danger'> = {
  queued: 'neutral',
  processing: 'brand',
  done: 'ok',
  needs_review: 'warn',
  failed: 'danger',
  skipped: 'neutral',
  undone: 'neutral',
};

function FolderGuide({ status }: { status: InboxStatus }) {
  const { t } = useI18n();
  return (
    <ul className="divide-y divide-line rounded-xl border border-line">
      <li className="flex items-start gap-3 bg-surface-2 px-4 py-3">
        <FolderOpen className="mt-0.5 size-5 shrink-0 text-brand" aria-hidden />
        <div>
          <div className="font-semibold">{status.rootName}</div>
          <div className="text-sm text-muted">{t('inbox.folder.root')}</div>
        </div>
      </li>
      {status.folders.map((f) => (
        <li key={f.hint} className="flex items-start gap-3 py-2.5 ps-10 pe-4">
          <FolderOpen className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />
          <div className="min-w-0">
            <div className="font-medium">{f.name}</div>
            <div className="text-sm text-muted">{t(`inbox.folder.${f.hint}`)}</div>
          </div>
        </li>
      ))}
    </ul>
  );
}

function Setup({ status }: { status: InboxStatus }) {
  const { t } = useI18n();
  const households = useHouseholds();
  const [ai, setAi] = useState(status.aiAvailable);
  const [household, setHousehold] = useState('');
  const setup = useAction(() => api.post<InboxStatus>('/v1/inbox/setup', { aiConsent: ai && status.aiAvailable, householdId: household || null }), {
    invalidate: [['inbox'], ['documents']],
    success: t('inbox.setup.done'),
    onSuccess: () => window.dispatchEvent(new Event('lifesphere:inbox-changed')),
  });
  return (
    <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
      <Card className="space-y-5 p-5 sm:p-6">
        <div>
          <h2 className="font-display text-xl font-semibold">{t('inbox.setup.title')}</h2>
          <ol className="mt-3 space-y-2.5">
            {(['step1', 'step2', 'step3'] as const).map((k, i) => (
              <li key={k} className="flex gap-3">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-soft text-sm font-semibold text-brand">{i + 1}</span>
                <span>{t(`inbox.setup.${k}`)}</span>
              </li>
            ))}
          </ol>
        </div>
        <Checkbox
          label={t('inbox.ai.consentLabel')}
          hint={status.aiAvailable ? t('inbox.ai.consentHint') : t('inbox.ai.unavailable')}
          checked={ai && status.aiAvailable}
          onChange={setAi}
          disabled={!status.aiAvailable}
        />
        {!!households.data?.length && (
          <Select
            label={t('inbox.household')}
            hint={t('inbox.householdHint')}
            value={household}
            onChange={(e) => setHousehold(e.target.value)}
            options={[{ value: '', label: t('inbox.justMe') }, ...households.data.map((h) => ({ value: h.id, label: h.name }))]}
          />
        )}
        <p className="text-sm text-muted">{t('inbox.safety')}</p>
        <Button size="lg" icon={<FolderSync className="size-5" />} loading={setup.isPending} onClick={() => setup.mutate()}>
          {t('inbox.setup.create')}
        </Button>
      </Card>
      <div>
        <h3 className="mb-2 font-semibold">{t('inbox.guide.title')}</h3>
        <FolderGuide status={status} />
      </div>
    </div>
  );
}

function ComputerFolder({ status }: { status: InboxStatus }) {
  const { t } = useI18n();
  const { me, fmt } = useSession();
  const toast = useToast();
  const qc = useQueryClient();
  const [st, setSt] = useState<SyncState | null>(null);
  const [busy, setBusy] = useState(false);
  const supported = typeof window !== 'undefined' && folderSyncSupported();
  const refresh = () => syncState(me.id).then(setSt);

  useEffect(() => {
    if (!supported) return;
    void refresh();
    const on = () => void refresh();
    window.addEventListener('lifesphere:inbox-synced', on);
    return () => window.removeEventListener('lifesphere:inbox-synced', on);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supported]);

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      if ((e as Error).name !== 'AbortError') toast(t('inbox.computer.failed'), 'danger');
    } finally {
      setBusy(false);
      void refresh();
    }
  };
  const checkNow = async () => {
    const { map, fallback } = inboxTargets(status);
    const r = await syncOnce(me.id, map, fallback, 25);
    qc.invalidateQueries({ queryKey: ['inbox'] });
    toast(r.uploaded ? t('inbox.computer.uploaded', { count: r.uploaded }) : t('inbox.computer.nothingNew'));
    if (r.skipped.length) toast(t('inbox.computer.skippedFiles', { names: r.skipped.slice(0, 3).join(', ') }), 'danger');
  };

  return (
    <Card className="p-5">
      <CardHeader icon={<HardDrive className="size-5" />} title={t('inbox.computer.title')} description={t('inbox.computer.body')} />
      <div className="mt-4 space-y-3">
        {!supported ? (
          <Notice tone="info">{t('inbox.computer.unsupported')}</Notice>
        ) : !st?.connected ? (
          <Button icon={<FolderSync className="size-4" />} loading={busy} onClick={() => run(() => connectFolder(me.id, status.folders.map((f) => f.name)).then(checkNow))}>
            {t('inbox.computer.choose')}
          </Button>
        ) : (
          <>
            <p className="font-medium">{t('inbox.computer.watching', { name: st.folderName ?? '' })}</p>
            {st.permission !== 'granted' ? (
              <Notice tone="warn" action={<Button size="sm" onClick={() => run(async () => (await allowAgain(me.id)) && (await checkNow()))}>{t('inbox.computer.allow')}</Button>}>
                {t('inbox.computer.allowAgain')}
              </Notice>
            ) : (
              <p className="text-sm text-muted">{st.lastCheckedAt ? t('inbox.computer.lastChecked', { when: fmt.ago(st.lastCheckedAt) }) : t('inbox.computer.whileOpen')}</p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" icon={<RotateCcw className="size-4" />} loading={busy} disabled={st.permission !== 'granted'} onClick={() => run(checkNow)}>
                {t('inbox.computer.checkNow')}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => run(() => disconnectFolder(me.id))}>
                {t('inbox.computer.disconnect')}
              </Button>
            </div>
          </>
        )}
        <p className="text-xs text-muted">{t('inbox.computer.whileOpen')}</p>
      </div>
    </Card>
  );
}

function AddFiles({ status }: { status: InboxStatus }) {
  const { t } = useI18n();
  const toast = useToast();
  const qc = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const [target, setTarget] = useState(status.folders.find((f) => f.hint === 'mixed')?.folderId ?? status.rootFolderId ?? '');
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);

  const upload = async (files: FileList | File[]) => {
    const list = [...files];
    if (!list.length || !target) return;
    setBusy(true);
    let ok = 0;
    for (const f of list) {
      if (f.size > MAX_BYTES) {
        toast(t('inbox.add.tooBig', { name: f.name }), 'danger');
        continue;
      }
      const form = new FormData();
      form.append('file', f, f.name);
      try {
        await api.upload(`/v1/documents/folders/${target}/files`, form);
        ok++;
      } catch {
        toast(t('inbox.add.failed', { name: f.name }), 'danger');
      }
    }
    setBusy(false);
    if (ok) toast(t('inbox.add.done', { count: ok }));
    qc.invalidateQueries({ queryKey: ['inbox'] });
  };

  return (
    <Card className="p-5">
      <CardHeader icon={<Upload className="size-5" />} title={t('inbox.add.title')} description={t('inbox.add.body')} />
      <div className="mt-4 space-y-3">
        <Select
          label={t('inbox.add.putIn')}
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          options={status.folders.filter((f) => f.folderId).map((f) => ({ value: f.folderId!, label: f.name }))}
        />
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            void upload(e.dataTransfer.files);
          }}
          className={cx('rounded-xl border-2 border-dashed p-5 text-center text-sm text-muted transition', drag ? 'border-brand bg-brand-soft' : 'border-line')}
        >
          <p>{t('inbox.add.drop')}</p>
          <input ref={input} type="file" multiple className="hidden" accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.docx,.xlsx,.pptx,.txt,.md,.csv,.json" onChange={(e) => e.target.files && void upload(e.target.files).then(() => (e.target.value = ''))} />
          <Button className="mt-3" size="sm" icon={<Upload className="size-4" />} loading={busy} onClick={() => input.current?.click()}>
            {t('inbox.add.choose')}
          </Button>
        </div>
      </div>
    </Card>
  );
}

function Settings({ status }: { status: InboxStatus }) {
  const { t } = useI18n();
  const households = useHouseholds();
  const save = useAction((patch: Record<string, unknown>) => api.patch<InboxStatus>('/v1/inbox', patch), {
    invalidate: [['inbox']],
    success: t('common.saved'),
    onSuccess: () => window.dispatchEvent(new Event('lifesphere:inbox-changed')),
  });
  return (
    <Card className="space-y-4 p-5">
      <CardHeader icon={<Sparkles className="size-5" />} title={t('inbox.settings.title')} />
      <Switch label={t('inbox.settings.on')} hint={t('inbox.settings.onHint')} checked={status.enabled} onChange={(v) => save.mutate({ enabled: v })} />
      <Switch
        label={t('inbox.ai.consentLabel')}
        hint={!status.aiAvailable ? t('inbox.ai.unavailable') : status.aiTurnedOffInSettings ? t('inbox.ai.offInSettings') : t('inbox.ai.consentHint')}
        checked={!!status.aiConsentAt && status.aiAvailable}
        disabled={!status.aiAvailable}
        onChange={(v) => save.mutate({ aiConsent: v })}
      />
      {!!households.data?.length && (
        <Select
          label={t('inbox.household')}
          hint={t('inbox.householdHint')}
          value={status.householdId ?? ''}
          onChange={(e) => save.mutate({ householdId: e.target.value || null })}
          options={[{ value: '', label: t('inbox.justMe') }, ...households.data.map((h) => ({ value: h.id, label: h.name }))]}
        />
      )}
    </Card>
  );
}

function ImportCard({ imp }: { imp: InboxImport }) {
  const { t } = useI18n();
  const { fmt } = useSession();
  const confirm = useConfirm();
  const toast = useToast();
  const undo = useAction(() => api.post(`/v1/inbox/imports/${imp.id}/undo`), { invalidate: [['inbox']], success: t('inbox.undone') });
  const retry = useAction(() => api.post(`/v1/inbox/imports/${imp.id}/retry`), { invalidate: [['inbox']] });
  const dismiss = useAction((i: number) => api.post(`/v1/inbox/imports/${imp.id}/suggestions/${i}/dismiss`), { invalidate: [['inbox']] });
  const working = imp.status === 'queued' || imp.status === 'processing';
  const live = imp.createdItems.length > 0 && !imp.undoneAt;

  return (
    <Card as="li" className="p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate font-semibold">{imp.fileName}</div>
          <div className="text-sm text-muted">
            {fmt.dateTime(imp.createdAt)}
            {imp.reader === 'ai' && ` · ${t('inbox.reader.ai')}`}
            {imp.reader === 'rules' && ` · ${t('inbox.reader.rules')}`}
          </div>
        </div>
        <Badge tone={STATUS_TONE[imp.status]}>{t(`inbox.status.${imp.status}`)}</Badge>
      </div>
      {imp.summary && <p className="mt-2 text-[0.95rem]">{imp.summary}</p>}
      {imp.error && (
        <Notice tone={imp.status === 'failed' ? 'danger' : 'warn'} className="mt-3">
          {imp.error}
        </Notice>
      )}

      {imp.createdItems.length > 0 && (
        <div className={cx('mt-3', imp.undoneAt && 'opacity-60')}>
          <div className="mb-1.5 text-sm font-semibold text-muted">{imp.undoneAt ? t('inbox.removed', { count: imp.createdItems.length }) : t('inbox.created', { count: imp.createdItems.length })}</div>
          <ul className="flex flex-wrap gap-1.5">
            {imp.createdItems.map((c) => (
              <li key={`${c.type}-${c.id}`}>
                {imp.undoneAt ? (
                  <span className="inline-flex rounded-full border border-line px-2.5 py-1 text-sm line-through">{c.title}</span>
                ) : (
                  <Link href={c.href} className="inline-flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-sm hover:border-brand hover:text-brand">
                    <CheckCircle2 className="size-3.5 text-ok" aria-hidden />
                    <span className="text-muted">{t(`inbox.type.${c.type}`)}:</span> {c.title}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {imp.suggestions.length > 0 && !imp.undoneAt && (
        <div className="mt-4 rounded-xl border border-warn/40 bg-warn-soft/40 p-3">
          <div className="text-sm font-semibold">{t('inbox.review.title')}</div>
          <p className="mb-2 text-sm text-muted">{t('inbox.review.hint')}</p>
          <ul className="space-y-2">
            {imp.suggestions.map((s, i) => (
              <li key={i} className="rounded-lg bg-surface p-3">
                <div className="text-sm text-muted">{t(`inbox.type.${s.type}`)}</div>
                <div className="font-medium">{s.title}</div>
                {s.details && <div className="mt-0.5 text-sm whitespace-pre-line">{s.details}</div>}
                <div className="mt-2 flex flex-wrap gap-2">
                  <ButtonLink href={s.href} size="sm" variant="secondary">
                    {t('inbox.review.open')}
                  </ButtonLink>
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={<Copy className="size-4" />}
                    onClick={() =>
                      navigator.clipboard
                        ?.writeText([s.title, s.details].filter(Boolean).join('\n'))
                        .then(() => toast(t('inbox.review.copied')))
                        .catch(() => undefined)
                    }
                  >
                    {t('inbox.review.copy')}
                  </Button>
                  <Button size="sm" variant="ghost" loading={dismiss.isPending} onClick={() => dismiss.mutate(i)}>
                    {t('inbox.review.done')}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {imp.skippedItems.length > 0 && !imp.undoneAt && (
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer font-medium text-muted">{t('inbox.skipped', { count: imp.skippedItems.length })}</summary>
          <ul className="mt-1.5 space-y-1 ps-4">
            {imp.skippedItems.map((s, i) => (
              <li key={i} className="list-disc">
                <span className="font-medium">{s.title}</span> — {s.reason}
              </li>
            ))}
          </ul>
        </details>
      )}

      {!working && (
        <div className="mt-3 flex flex-wrap gap-2">
          {live && (
            <Button
              size="sm"
              variant="secondary"
              icon={<Undo2 className="size-4" />}
              loading={undo.isPending}
              onClick={async () => {
                if (await confirm({ title: t('inbox.undoTitle'), body: t('inbox.undoBody', { count: imp.createdItems.length }), confirmLabel: t('inbox.undo'), danger: true })) undo.mutate();
              }}
            >
              {t('inbox.undo')}
            </Button>
          )}
          {(imp.status === 'failed' || imp.status === 'undone' || (imp.status === 'needs_review' && !imp.createdItems.length)) && (
            <Button size="sm" variant="ghost" icon={<RotateCcw className="size-4" />} loading={retry.isPending} onClick={() => retry.mutate()}>
              {t('inbox.retry')}
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}

export default function InboxPage() {
  const { t } = useI18n();
  const status = useQuery({ queryKey: ['inbox', 'status'], queryFn: () => api.get<InboxStatus>('/v1/inbox') });
  const imports = useQuery({
    queryKey: ['inbox', 'imports'],
    queryFn: () => api.get<InboxImport[]>('/v1/inbox/imports', { limit: 100 }),
    enabled: !!status.data?.setUp,
    refetchInterval: (q) => ((q.state.data ?? []).some((i) => i.status === 'queued' || i.status === 'processing') ? 3000 : 20_000),
  });
  const s = status.data;
  const waiting = (imports.data ?? []).filter((i) => i.status === 'queued' || i.status === 'processing').length;
  const [filter, setFilter] = useState<'all' | 'review'>('all');
  const shown = (imports.data ?? []).filter((i) => filter === 'all' || i.status === 'needs_review' || i.status === 'failed');

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title={t('inbox.title')}
        description={t('inbox.intro')}
        actions={
          s?.rootFolderId ? (
            <ButtonLink href={`/documents?folder=${s.rootFolderId}`} variant="secondary" icon={<FolderOpen className="size-4" />}>
              {t('inbox.guide.open')}
            </ButtonLink>
          ) : undefined
        }
      />
      {status.isLoading && <LoadingBlock />}
      <ErrorNotice error={status.error} onRetry={status.refetch} />
      {s && !s.setUp && <Setup status={s} />}
      {s?.setUp && (
        <div className="space-y-6">
          {!s.enabled && <Notice tone="warn">{t('inbox.pausedNotice')}</Notice>}
          {s.enabled && !s.aiReading && <Notice tone="info">{t('inbox.ai.offNotice')}</Notice>}
          <div className="grid gap-5 md:grid-cols-2">
            <ComputerFolder status={s} />
            <AddFiles status={s} />
          </div>

          <section>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-xl font-semibold">{t('inbox.activity.title')}</h2>
              <div className="flex items-center gap-2 text-sm">
                {waiting > 0 && <Badge tone="brand">{t('inbox.activity.reading', { count: waiting })}</Badge>}
                <Button size="sm" variant={filter === 'all' ? 'secondary' : 'ghost'} onClick={() => setFilter('all')}>
                  {t('inbox.activity.all')}
                </Button>
                <Button size="sm" variant={filter === 'review' ? 'secondary' : 'ghost'} onClick={() => setFilter('review')}>
                  {t('inbox.activity.needsYou')}
                </Button>
              </div>
            </div>
            {imports.isLoading && <LoadingBlock />}
            <ErrorNotice error={imports.error} onRetry={imports.refetch} />
            {imports.data && !shown.length && <EmptyState icon={<Inbox className="size-6" />} title={t('inbox.activity.empty')} body={t('inbox.activity.emptyBody')} />}
            <ul className="space-y-3">
              {shown.map((i) => (
                <ImportCard key={i.id} imp={i} />
              ))}
            </ul>
          </section>

          <div className="grid gap-5 md:grid-cols-2">
            <Settings status={s} />
            <Card className="p-5">
              <CardHeader icon={<FolderOpen className="size-5" />} title={t('inbox.guide.title')} description={t('inbox.guide.body')} />
              <div className="mt-4">
                <FolderGuide status={s} />
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

export type { InboxHint };
