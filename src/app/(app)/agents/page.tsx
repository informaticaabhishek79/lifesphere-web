'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Bot, Plus } from 'lucide-react';
import { api } from '@/lib/api';
import { useSession } from '@/lib/session';
import type { AgentRun } from '@/lib/types';
import { useI18n } from '@/i18n';
import { AgentDialog, AgentIcon, RunCard, useAgents } from '@/components/agents';
import { Badge, Button, EmptyState, ErrorNotice, List, ListItem, LoadingBlock, PageHeader, Section } from '@/components/ui';

export default function AgentsPage() {
  const { t } = useI18n();
  const { fmt } = useSession();
  const agents = useAgents();
  const activity = useQuery({ queryKey: ['agent-runs', 'all'], queryFn: () => api.get<AgentRun[]>('/v1/agents/activity', { limit: 20 }) });
  const [open, setOpen] = useState(false);
  const names = new Map((agents.data ?? []).map((a) => [a.id, a.name]));
  return (
    <div className="max-w-3xl">
      <PageHeader
        title={t('nav.agents')}
        description={t('agents.intro')}
        actions={
          <Button icon={<Plus className="size-4" />} onClick={() => setOpen(true)}>
            {t('agents.new')}
          </Button>
        }
      />
      {agents.isLoading && <LoadingBlock />}
      <ErrorNotice error={agents.error} onRetry={agents.refetch} />
      {agents.data?.length === 0 && <EmptyState icon={<Bot className="size-6" />} title={t('agents.empty')} body={t('agents.emptyBody')} action={<Button onClick={() => setOpen(true)}>{t('agents.new')}</Button>} />}
      {(agents.data?.length ?? 0) > 0 && (
        <List>
          {agents.data!.map((a) => (
            <ListItem
              key={a.id}
              href={`/agents/${a.id}`}
              leading={<AgentIcon kind={a.kind} />}
              title={a.name}
              subtitle={a.kind === 'email' ? (a.mailbox?.address ?? t('agents.noMailbox')) : a.folders.map((f) => f.path).join(', ') || t('agents.noFolders')}
              meta={
                <>
                  <Badge tone="neutral">{t(`enums.agentKind.${a.kind}`)}</Badge>
                  {a.status === 'paused' && <Badge tone="warn">{t('agents.paused')}</Badge>}
                  {a.lastRunAt && <span className="text-xs text-muted">{t('agents.lastUsed', { when: fmt.ago(a.lastRunAt) })}</span>}
                </>
              }
            />
          ))}
        </List>
      )}
      {(activity.data?.length ?? 0) > 0 && (
        <Section title={t('agents.allActivity')} className="mt-8">
          <div className="space-y-3">
            {activity.data!.map((r) => (
              <RunCard key={r.id} run={r} agentName={names.get(r.agentId)} />
            ))}
          </div>
        </Section>
      )}
      <AgentDialog open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
