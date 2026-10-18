'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Ban, Bot, Check, FileText, Mail, X } from 'lucide-react';
import { api } from '@/lib/api';
import { useAction } from '@/lib/hooks';
import { useSession } from '@/lib/session';
import type { Agent, AgentRun, DocFolder, FolderAccess, MailAccount } from '@/lib/types';
import { useI18n } from '@/i18n';
import { FormDialog } from './dialog';
import { Checkbox, Input, Segmented, Select, Textarea } from './form';
import { Badge, Button, Card, cx } from './ui';

export const useAgents = () => useQuery({ queryKey: ['agents'], queryFn: () => api.get<Agent[]>('/v1/agents') });
export const useFolders = (enabled = true) => useQuery({ queryKey: ['documents', 'folders'], queryFn: () => api.get<DocFolder[]>('/v1/documents/folders'), enabled });
export const useMailAccounts = (enabled = true) => useQuery({ queryKey: ['mail', 'accounts'], queryFn: () => api.get<MailAccount[]>('/v1/mail/accounts'), enabled });

export function AgentIcon({ kind, className }: { kind: Agent['kind']; className?: string }) {
  return (
    <span className={cx('flex size-10 shrink-0 items-center justify-center rounded-xl', kind === 'email' ? 'bg-info-soft text-info' : 'bg-brand-soft text-brand', className)}>
      {kind === 'email' ? <Mail className="size-5" /> : <FileText className="size-5" />}
    </span>
  );
}

/** Per-folder choice: no access, read only, or read and edit. Subfolders follow their parent. */
export function FolderAccessPicker({ folders, value, onChange }: { folders: DocFolder[]; value: Record<string, FolderAccess>; onChange: (v: Record<string, FolderAccess>) => void }) {
  const { t } = useI18n();
  // A folder inside a granted folder is already covered; show it as inherited.
  const inherited = (f: DocFolder): FolderAccess | null => {
    let p = f.parentId;
    let guard = 0;
    while (p && guard++ < 50) {
      if (value[p]) return value[p];
      p = folders.find((x) => x.id === p)?.parentId ?? null;
    }
    return null;
  };
  return (
    <ul className="divide-y divide-line rounded-xl border border-line">
      {folders.map((f) => {
        const inh = inherited(f);
        const depth = f.path.split(' / ').length - 1;
        return (
          <li key={f.id} className="flex flex-wrap items-center gap-2 px-3 py-2" style={{ paddingInlineStart: `${0.75 + depth * 1.25}rem` }}>
            <span className="min-w-0 flex-1 truncate text-sm font-medium">{f.name}</span>
            {inh && !value[f.id] ? (
              <Badge tone="neutral">{t(`enums.folderAccess.${inh}`)}</Badge>
            ) : (
              <select
                aria-label={f.path}
                className="rounded-lg border border-line bg-surface px-2 py-1 text-sm"
                value={value[f.id] ?? ''}
                onChange={(e) => {
                  const next = { ...value };
                  if (e.target.value) next[f.id] = e.target.value as FolderAccess;
                  else delete next[f.id];
                  onChange(next);
                }}
              >
                <option value="">{t('agents.noAccess')}</option>
                <option value="read">{t('enums.folderAccess.read')}</option>
                <option value="edit">{t('enums.folderAccess.edit')}</option>
              </select>
            )}
          </li>
        );
      })}
    </ul>
  );
}

interface AgentForm {
  kind: Agent['kind'];
  name: string;
  instructions: string;
  mailAccountId: string;
  reviewBeforeSending: boolean;
  folders: Record<string, FolderAccess>;
}

const fromAgent = (a?: Agent | null, kind: Agent['kind'] = 'email'): AgentForm => ({
  kind: a?.kind ?? kind,
  name: a?.name ?? '',
  instructions: a?.instructions ?? '',
  mailAccountId: a?.mailbox?.id ?? '',
  reviewBeforeSending: a?.reviewBeforeSending ?? false,
  folders: Object.fromEntries((a?.folders ?? []).map((f) => [f.folderId, f.access])),
});

export function AgentDialog({ open, onClose, agent, defaultKind = 'email', defaultMailbox, onSaved }: { open: boolean; onClose: () => void; agent?: Agent | null; defaultKind?: Agent['kind']; defaultMailbox?: string; onSaved?: (a: Agent) => void }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const { featureOn } = useSession();
  const [form, setForm] = useState<AgentForm>(fromAgent(agent, defaultKind));
  const folders = useFolders(open && featureOn('documents'));
  const boxes = useMailAccounts(open);
  useEffect(() => {
    if (open) setForm({ ...fromAgent(agent, defaultKind), ...(defaultMailbox && !agent ? { mailAccountId: defaultMailbox } : {}) });
  }, [open, agent, defaultKind, defaultMailbox]);
  useEffect(() => {
    // Pick the only mailbox automatically.
    if (open && !agent && form.kind === 'email' && !form.mailAccountId && boxes.data?.length === 1) setForm((f) => ({ ...f, mailAccountId: boxes.data![0].id }));
  }, [open, agent, form.kind, form.mailAccountId, boxes.data]);
  const set = <K extends keyof AgentForm>(k: K, v: AgentForm[K]) => setForm((f) => ({ ...f, [k]: v }));
  return (
    <FormDialog
      open={open}
      onClose={onClose}
      title={agent ? t('agents.edit') : t('agents.new')}
      submitLabel={agent ? t('common.save') : t('common.create')}
      size="lg"
      disabled={!form.name.trim()}
      onSubmit={async () => {
        const body = {
          name: form.name,
          instructions: form.instructions,
          ...(form.kind === 'email'
            ? { mailAccountId: form.mailAccountId || null, reviewBeforeSending: form.reviewBeforeSending }
            : { folders: Object.entries(form.folders).map(([folderId, access]) => ({ folderId, access })) }),
        };
        const saved = agent ? await api.patch<Agent>(`/v1/agents/${agent.id}`, body) : await api.post<Agent>('/v1/agents', { kind: form.kind, ...body });
        qc.invalidateQueries({ queryKey: ['agents'] });
        onSaved?.(saved);
      }}
    >
      {!agent && (
        <div>
          <Segmented
            label={t('agents.kind')}
            value={form.kind}
            onChange={(v) => set('kind', v)}
            options={[
              { value: 'email', label: t('agents.emailKind') },
              ...(featureOn('documents') ? [{ value: 'documents' as const, label: t('agents.documentsKind') }] : []),
            ]}
          />
          <p className="mt-1.5 text-sm text-muted">{form.kind === 'email' ? t('agents.emailKindHint') : t('agents.documentsKindHint')}</p>
        </div>
      )}
      <Input label={t('agents.name')} placeholder={t('agents.namePlaceholder')} value={form.name} onChange={(e) => set('name', e.target.value)} maxLength={80} required />
      <Textarea label={t('agents.instructions')} hint={t('agents.instructionsHint')} optional value={form.instructions} onChange={(e) => set('instructions', e.target.value)} maxLength={2000} rows={3} />
      {form.kind === 'email' ? (
        <>
          {(boxes.data?.length ?? 0) > 0 ? (
            <Select
              label={t('agents.mailbox')}
              value={form.mailAccountId}
              onChange={(e) => set('mailAccountId', e.target.value)}
              placeholder={t('common.selectPlaceholder')}
              options={(boxes.data ?? []).map((b) => ({ value: b.id, label: `${t(`enums.mailProvider.${b.provider}`)} · ${b.address}` }))}
            />
          ) : (
            <p className="rounded-xl bg-surface-2 px-3 py-2 text-sm text-muted">{t('agents.noMailbox')}</p>
          )}
          <Checkbox label={t('agents.reviewBeforeSending')} checked={form.reviewBeforeSending} onChange={(v) => set('reviewBeforeSending', v)} />
        </>
      ) : (
        <div>
          <div className="mb-1 text-sm font-semibold text-ink">{t('agents.folders')}</div>
          <p className="mb-2 text-sm text-muted">{t('agents.foldersHint')}</p>
          {(folders.data?.length ?? 0) > 0 ? (
            <FolderAccessPicker folders={folders.data!} value={form.folders} onChange={(v) => set('folders', v)} />
          ) : (
            <p className="rounded-xl bg-surface-2 px-3 py-2 text-sm text-muted">{t('agents.noFolders')}</p>
          )}
        </div>
      )}
    </FormDialog>
  );
}

const runTone = (s: AgentRun['status']) => (s === 'sent' || s === 'completed' ? 'ok' : s === 'awaiting_approval' ? 'warn' : s === 'failed' ? 'danger' : 'neutral');

/** One entry of an agent's activity: what was asked, what it did step by step, and the result. */
export function RunCard({ run, agentName, invalidate = [] }: { run: AgentRun; agentName?: string; invalidate?: unknown[][] }) {
  const { t } = useI18n();
  const { fmt } = useSession();
  const [body, setBody] = useState(run.output ?? '');
  useEffect(() => setBody(run.output ?? ''), [run.output]);
  const keys = [['agents'], ['agent-runs'], ...invalidate];
  const approve = useAction(() => api.post<AgentRun>(`/v1/agents/activity/${run.id}/approve`, { body }), { invalidate: keys, success: t('email.sentTitle') });
  const discard = useAction(() => api.post<AgentRun>(`/v1/agents/activity/${run.id}/discard`), { invalidate: keys, success: t('email.discarded') });
  const waiting = run.status === 'awaiting_approval';
  return (
    <Card as="article" className="p-4">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Bot className="size-4 text-muted" aria-hidden />
        {agentName && <span className="font-semibold">{agentName}</span>}
        <Badge tone={runTone(run.status)}>{t(`enums.agentRunStatus.${run.status}`)}</Badge>
        {run.simulated && <Badge tone="neutral">{t('common.simulated')}</Badge>}
        <span className="ms-auto text-xs text-muted">{fmt.ago(run.createdAt)}</span>
      </div>
      {run.targetLabel && <div className="mt-2 truncate text-sm text-muted">{run.targetLabel}</div>}
      <div className="mt-2 text-sm">
        <span className="font-semibold text-muted">{t('agents.request')}: </span>
        {run.request}
      </div>
      {run.actions.length > 0 && (
        <details className="mt-2 text-sm">
          <summary className="cursor-pointer font-semibold text-muted">
            {t('agents.steps')} ({run.actions.length})
          </summary>
          <ul className="mt-1.5 space-y-1">
            {run.actions.map((a, i) => (
              <li key={i} className={cx('flex items-start gap-1.5', !a.ok && 'text-danger')}>
                {a.ok ? <Check className="mt-0.5 size-3.5 shrink-0 text-ok" aria-hidden /> : <Ban className="mt-0.5 size-3.5 shrink-0" aria-label={t('agents.blocked')} />}
                <span>{a.note}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
      {waiting ? (
        <div className="mt-3 space-y-2">
          <p className="text-sm text-muted">{t('email.reviewBody')}</p>
          <Textarea aria-label={t('email.reviewTitle')} value={body} onChange={(e) => setBody(e.target.value)} rows={8} />
          <div className="flex flex-wrap gap-2">
            <Button icon={<Mail className="size-4" />} loading={approve.isPending} disabled={!body.trim()} onClick={() => approve.mutate()}>
              {t('email.send')}
            </Button>
            <Button variant="ghost" icon={<X className="size-4" />} loading={discard.isPending} onClick={() => discard.mutate()}>
              {t('email.discard')}
            </Button>
          </div>
        </div>
      ) : (
        run.output && <div className="mt-3 whitespace-pre-wrap rounded-xl bg-surface-2 p-3 text-sm">{run.output}</div>
      )}
      {run.error && <p className="mt-2 text-sm text-danger">{run.error}</p>}
    </Card>
  );
}
