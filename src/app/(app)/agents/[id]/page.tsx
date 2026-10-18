'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { Mail, Pause, Pencil, Play, Sparkles, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useAction } from '@/lib/hooks';
import type { Agent, AgentRun } from '@/lib/types';
import { useI18n } from '@/i18n';
import { AgentDialog, AgentIcon, RunCard } from '@/components/agents';
import { useConfirm } from '@/components/dialog';
import { Textarea } from '@/components/form';
import { Badge, Button, ButtonLink, Card, ErrorNotice, LoadingBlock, Notice, PageHeader, Section } from '@/components/ui';

export default function AgentPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useI18n();
  const router = useRouter();
  const qc = useQueryClient();
  const confirm = useConfirm();
  const agent = useQuery({ queryKey: ['agents', id], queryFn: () => api.get<Agent>(`/v1/agents/${id}`) });
  const runs = useQuery({ queryKey: ['agent-runs', id], queryFn: () => api.get<AgentRun[]>(`/v1/agents/${id}/activity`) });
  const [editing, setEditing] = useState(false);
  const [instruction, setInstruction] = useState('');
  const [last, setLast] = useState<AgentRun | null>(null);
  const toggle = useAction((status: 'active' | 'paused') => api.patch(`/v1/agents/${id}`, { status }), { invalidate: [['agents']] });
  const run = useAction(() => api.post<AgentRun>(`/v1/agents/${id}/documents/run`, { instruction }), {
    invalidate: [['agent-runs'], ['agents'], ['documents']],
    onSuccess: (r) => {
      setLast(r);
      setInstruction('');
    },
  });
  if (agent.isLoading) return <LoadingBlock />;
  if (agent.error) return <ErrorNotice error={agent.error} onRetry={agent.refetch} />;
  const a = agent.data!;
  return (
    <div className="max-w-3xl">
      <PageHeader
        title={a.name}
        eyebrow={t(`enums.agentKind.${a.kind}`)}
        back={{ href: '/agents', label: t('nav.agents') }}
        actions={
          <>
            <Button variant="secondary" icon={<Pencil className="size-4" />} onClick={() => setEditing(true)}>
              {t('common.edit')}
            </Button>
            <Button variant="secondary" icon={a.status === 'active' ? <Pause className="size-4" /> : <Play className="size-4" />} loading={toggle.isPending} onClick={() => toggle.mutate(a.status === 'active' ? 'paused' : 'active')}>
              {a.status === 'active' ? t('agents.pause') : t('agents.resume')}
            </Button>
            <Button
              variant="ghost"
              icon={<Trash2 className="size-4" />}
              onClick={async () => {
                if (!(await confirm({ title: t('agents.deleteTitle'), body: t('agents.deleteBody'), confirmLabel: t('common.delete'), danger: true }))) return;
                await api.del(`/v1/agents/${id}`);
                qc.invalidateQueries({ queryKey: ['agents'] });
                router.replace('/agents');
              }}
            >
              {t('common.delete')}
            </Button>
          </>
        }
      />
      {a.status === 'paused' && (
        <Notice tone="warn" className="mb-4">
          {t('agents.paused')}
        </Notice>
      )}
      <Card className="mb-6 p-4">
        <div className="flex items-start gap-3">
          <AgentIcon kind={a.kind} />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="text-sm font-semibold text-muted">{t('agents.canUse')}</div>
            {a.kind === 'email' ? (
              <div>{a.mailbox ? `${t(`enums.mailProvider.${a.mailbox.provider}`)} · ${a.mailbox.address}` : t('agents.noMailbox')}</div>
            ) : a.folders.length ? (
              <ul className="flex flex-wrap gap-2">
                {a.folders.map((f) => (
                  <li key={f.folderId}>
                    <Badge tone={f.access === 'edit' ? 'warn' : 'neutral'}>
                      {f.path} · {t(`enums.folderAccess.${f.access}`)}
                    </Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-muted">{t('agents.noFolders')}</div>
            )}
            {a.instructions && (
              <p className="whitespace-pre-wrap text-sm">
                <span className="font-semibold text-muted">{t('agents.instructions')}: </span>
                {a.instructions}
              </p>
            )}
            {a.kind === 'email' && a.reviewBeforeSending && <Badge tone="info">{t('agents.reviewBeforeSending')}</Badge>}
          </div>
        </div>
      </Card>

      {a.kind === 'documents' ? (
        <Card className="mb-6 p-4">
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (instruction.trim().length >= 2) run.mutate();
            }}
          >
            <Textarea label={t('agents.ask')} placeholder={t('agents.askPlaceholder')} hint={t('agents.askHint')} value={instruction} onChange={(e) => setInstruction(e.target.value)} rows={3} maxLength={2000} />
            <Button type="submit" icon={<Sparkles className="size-4" />} loading={run.isPending} disabled={a.status !== 'active' || instruction.trim().length < 2 || !a.folders.length}>
              {run.isPending ? t('agents.running') : t('agents.run')}
            </Button>
          </form>
          {last && (
            <div className="mt-4">
              <RunCard run={last} />
            </div>
          )}
        </Card>
      ) : (
        <Notice tone="info" className="mb-6" action={<ButtonLink href="/email" size="sm" variant="secondary" icon={<Mail className="size-4" />}>{t('agents.goToEmail')}</ButtonLink>}>
          {t('agents.useFromEmail')}
        </Notice>
      )}

      <Section title={t('agents.activity')}>
        {runs.isLoading && <LoadingBlock />}
        {runs.data?.length === 0 && <p className="text-muted">{t('agents.activityEmpty')}</p>}
        <div className="space-y-3">
          {runs.data?.filter((r) => r.id !== last?.id).map((r) => <RunCard key={r.id} run={r} />)}
        </div>
      </Section>
      <AgentDialog open={editing} onClose={() => setEditing(false)} agent={a} onSaved={() => qc.invalidateQueries({ queryKey: ['agents', id] })} />
    </div>
  );
}
