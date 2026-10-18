'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { Bot, Inbox, Mail, Plus, Send, Unplug } from 'lucide-react';
import { api } from '@/lib/api';
import { useAction } from '@/lib/hooks';
import { useSession } from '@/lib/session';
import type { Agent, AgentRun, MailAccount, MailMessage, MailSummary } from '@/lib/types';
import { useI18n } from '@/i18n';
import { AgentDialog, RunCard, useAgents, useMailAccounts } from '@/components/agents';
import { useConfirm, useToast } from '@/components/dialog';
import { Checkbox, Select, Textarea } from '@/components/form';
import { Badge, Button, Card, cx, EmptyState, ErrorNotice, LoadingBlock, Notice, PageHeader } from '@/components/ui';

const sender = (from: string) => from.split('<')[0].replace(/"/g, '').trim() || from;

function Connect({ onConnected }: { onConnected: (a: MailAccount) => void }) {
  const { t } = useI18n();
  const providers = useQuery({ queryKey: ['mail', 'providers'], queryFn: () => api.get<{ demo: boolean; gmail: boolean; outlook: boolean }>('/v1/mail/providers') });
  const demo = useAction(() => api.post<MailAccount>('/v1/mail/accounts/demo'), { invalidate: [['mail']], onSuccess: onConnected });
  const start = useAction((p: 'gmail' | 'outlook') => api.post<{ url: string }>(`/v1/mail/oauth/${p}/start`), { onSuccess: (r) => (window.location.href = r.url) });
  const p = providers.data;
  return (
    <Card className="p-5">
      <h2 className="font-display text-xl font-semibold">{t('email.connect')}</h2>
      <p className="mt-1 text-sm text-muted">{t('email.connectBody')}</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {(['gmail', 'outlook'] as const).map((k) => (
          <div key={k} className="rounded-xl border border-line p-4">
            <div className="font-semibold">{t(`enums.mailProvider.${k}`)}</div>
            <p className="mt-1 min-h-10 text-sm text-muted">{p && !p[k] ? t('email.notConfigured') : ''}</p>
            <Button className="mt-2 w-full" disabled={!p?.[k]} loading={start.isPending && start.variables === k} onClick={() => start.mutate(k)}>
              {k === 'gmail' ? t('email.gmail') : t('email.outlook')}
            </Button>
          </div>
        ))}
        {p?.demo && (
          <div className="rounded-xl border border-dashed border-line-strong p-4">
            <div className="font-semibold">{t('enums.mailProvider.demo')}</div>
            <p className="mt-1 min-h-10 text-sm text-muted">{t('email.demoBody')}</p>
            <Button className="mt-2 w-full" variant="secondary" loading={demo.isPending} onClick={() => demo.mutate()}>
              {t('email.demo')}
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}

function AskAgent({ account, message }: { account: MailAccount; message: MailMessage }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const agents = useAgents();
  const usable = (agents.data ?? []).filter((a) => a.kind === 'email' && a.status === 'active' && a.mailbox?.id === account.id);
  const [agentId, setAgentId] = useState('');
  const [instruction, setInstruction] = useState('');
  const [reviewFirst, setReviewFirst] = useState(false);
  const [creating, setCreating] = useState(false);
  const [last, setLast] = useState<AgentRun | null>(null);
  const chosen = usable.find((a) => a.id === agentId) ?? usable[0];
  useEffect(() => setReviewFirst(chosen?.reviewBeforeSending ?? false), [chosen?.id, chosen?.reviewBeforeSending]);
  useEffect(() => setLast(null), [message.id]);
  const history = useQuery({
    queryKey: ['agent-runs', 'email', message.id],
    queryFn: async () => (await api.get<AgentRun[]>('/v1/agents/activity', { limit: 200 })).filter((r) => r.targetRef === message.id),
  });
  const reply = useAction(() => api.post<AgentRun>(`/v1/agents/${chosen!.id}/email/reply`, { messageId: message.id, instruction, reviewFirst }), {
    invalidate: [['agents'], ['agent-runs']],
    onSuccess: (r) => {
      setLast(r);
      setInstruction('');
    },
  });
  return (
    <Card className="p-4">
      <h3 className="flex items-center gap-2 font-semibold">
        <Bot className="size-5 text-brand" aria-hidden /> {t('email.askAgent')}
      </h3>
      {agents.isLoading ? (
        <LoadingBlock rows={2} />
      ) : !usable.length ? (
        <div className="mt-2">
          <p className="text-sm text-muted">{t('email.noAgent')}</p>
          <Button className="mt-2" size="sm" icon={<Plus className="size-4" />} onClick={() => setCreating(true)}>
            {t('email.createAgent')}
          </Button>
        </div>
      ) : (
        <form
          className="mt-2 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (instruction.trim().length >= 2) reply.mutate();
          }}
        >
          <p className="text-sm text-muted">{t('email.askAgentHint')}</p>
          {usable.length > 1 && <Select label={t('nav.agents')} value={chosen?.id ?? ''} onChange={(e) => setAgentId(e.target.value)} options={usable.map((a) => ({ value: a.id, label: a.name }))} />}
          <Textarea label={t('email.instruction')} placeholder={t('email.instructionPlaceholder')} value={instruction} onChange={(e) => setInstruction(e.target.value)} rows={3} maxLength={2000} />
          <Checkbox label={t('email.reviewFirst')} checked={reviewFirst} onChange={setReviewFirst} />
          <Button type="submit" icon={<Send className="size-4" />} loading={reply.isPending} disabled={instruction.trim().length < 2}>
            {reply.isPending ? t('email.replying') : t('email.reply')}
          </Button>
        </form>
      )}
      {last && (
        <div className="mt-4">
          {last.status === 'sent' && <Notice tone="ok" title={t('email.sentTitle')}>{last.simulated ? t('email.sentSample') : null}</Notice>}
        </div>
      )}
      {(history.data?.length ?? 0) > 0 && (
        <div className="mt-4 space-y-3">
          <h4 className="text-sm font-semibold text-muted">{t('email.agentReplies')}</h4>
          {history.data!.map((r) => (
            <RunCard key={r.id} run={r} agentName={agents.data?.find((a) => a.id === r.agentId)?.name} invalidate={[['agent-runs', 'email', message.id]]} />
          ))}
        </div>
      )}
      <AgentDialog
        open={creating}
        onClose={() => setCreating(false)}
        defaultKind="email"
        defaultMailbox={account.id}
        onSaved={(a: Agent) => {
          setAgentId(a.id);
          qc.invalidateQueries({ queryKey: ['agents'] });
        }}
      />
    </Card>
  );
}

function Inner() {
  const { t } = useI18n();
  const { fmt } = useSession();
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToast();
  const confirm = useConfirm();
  const qc = useQueryClient();
  const accounts = useMailAccounts();
  const accountId = params.get('account') ?? accounts.data?.[0]?.id ?? null;
  const account = accounts.data?.find((a) => a.id === accountId) ?? null;
  const messageId = params.get('message');
  const go = (q: Record<string, string | null>) => {
    const next = new URLSearchParams();
    const merged = { account: accountId, message: messageId, ...q };
    for (const [k, v] of Object.entries(merged)) if (v) next.set(k, v);
    router.replace(`/email?${next}`, { scroll: false });
  };
  const inbox = useQuery({ queryKey: ['mail', 'inbox', accountId], queryFn: () => api.get<{ items: MailSummary[]; nextPageToken: string | null }>(`/v1/mail/accounts/${accountId}/messages`), enabled: !!account });
  const message = useQuery({ queryKey: ['mail', 'message', accountId, messageId], queryFn: () => api.get<MailMessage>(`/v1/mail/accounts/${accountId}/messages/${encodeURIComponent(messageId!)}`), enabled: !!account && !!messageId });

  // Coming back from Google / Microsoft.
  useEffect(() => {
    const connected = params.get('connected');
    const error = params.get('error');
    if (connected) {
      toast(t('email.connected'));
      qc.invalidateQueries({ queryKey: ['mail'] });
      router.replace(`/email?account=${connected}`);
    } else if (error) {
      toast(t('email.connectFailed'), 'danger');
      router.replace('/email');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="max-w-6xl">
      <PageHeader
        title={t('nav.email')}
        description={t('email.intro')}
        actions={
          account && (
            <div className="flex flex-wrap items-center gap-2">
              {(accounts.data?.length ?? 0) > 1 && (
                <Select aria-label={t('email.mailbox')} value={account.id} onChange={(e) => go({ account: e.target.value, message: null })} options={accounts.data!.map((a) => ({ value: a.id, label: a.address }))} fieldClassName="w-64" />
              )}
              <Button
                variant="ghost"
                icon={<Unplug className="size-4" />}
                onClick={async () => {
                  if (!(await confirm({ title: t('email.disconnectTitle'), body: t('email.disconnectBody'), confirmLabel: t('email.disconnect'), danger: true }))) return;
                  await api.del(`/v1/mail/accounts/${account.id}`);
                  qc.invalidateQueries({ queryKey: ['mail'] });
                  qc.invalidateQueries({ queryKey: ['agents'] });
                  router.replace('/email');
                }}
              >
                {t('email.disconnect')}
              </Button>
            </div>
          )
        }
      />
      {accounts.isLoading && <LoadingBlock />}
      <ErrorNotice error={accounts.error} onRetry={accounts.refetch} />
      {accounts.data && !account && <Connect onConnected={(a) => go({ account: a.id, message: null })} />}
      {account && (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-muted">
            <Mail className="size-4" aria-hidden />
            <span>{account.address}</span>
            <Badge tone={account.provider === 'demo' ? 'neutral' : 'info'}>{t(`enums.mailProvider.${account.provider}`)}</Badge>
          </div>
          {account.status === 'reconnect' && (
            <Notice tone="warn" className="mb-4">
              {t('email.reconnect')}
            </Notice>
          )}
          <div className="grid gap-4 lg:grid-cols-[22rem_1fr]">
            <Card as="div" className={cx('h-fit overflow-hidden', messageId && 'hidden lg:block')}>
              <div className="flex items-center gap-2 border-b border-line px-4 py-3 font-semibold">
                <Inbox className="size-4" aria-hidden /> {t('email.inbox')}
              </div>
              {inbox.isLoading && <LoadingBlock />}
              <ErrorNotice error={inbox.error} onRetry={inbox.refetch} className="m-3" />
              {inbox.data?.items.length === 0 && <p className="p-4 text-muted">{t('email.empty')}</p>}
              <ul className="max-h-[70vh] divide-y divide-line overflow-y-auto">
                {inbox.data?.items.map((m) => (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => go({ message: m.id })}
                      aria-current={m.id === messageId ? 'true' : undefined}
                      className={cx('block w-full px-4 py-3 text-start', m.id === messageId ? 'bg-brand-soft' : 'hover:bg-surface-2')}
                    >
                      <div className="flex items-center gap-2">
                        <span className={cx('min-w-0 flex-1 truncate', m.unread ? 'font-bold' : 'font-medium')}>{sender(m.from)}</span>
                        <span className="shrink-0 text-xs text-muted">{m.date ? fmt.ago(m.date) : ''}</span>
                      </div>
                      <div className={cx('truncate text-sm', m.unread ? 'font-semibold text-ink' : 'text-ink-2')} dir="auto">
                        {m.subject}
                      </div>
                      <div className="truncate text-xs text-muted" dir="auto">
                        {m.snippet}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </Card>
            <div className={cx('min-w-0 space-y-4', !messageId && 'hidden lg:block')}>
              {!messageId ? (
                <EmptyState icon={<Mail className="size-6" />} title={t('email.inbox')} body={t('email.askAgentHint')} />
              ) : message.isLoading ? (
                <LoadingBlock />
              ) : message.error ? (
                <ErrorNotice error={message.error} onRetry={message.refetch} />
              ) : (
                message.data && (
                  <>
                    <Button variant="ghost" size="sm" className="lg:hidden" onClick={() => go({ message: null })}>
                      <span aria-hidden className="flip-rtl inline-block">←</span> {t('email.inbox')}
                    </Button>
                    <Card as="article" className="p-5">
                      <h2 className="font-display text-xl font-semibold" dir="auto">
                        {message.data.subject}
                      </h2>
                      <div className="mt-2 text-sm text-muted">
                        <div>
                          <span className="font-semibold">{t('email.from')}:</span> <bdi>{message.data.from}</bdi>
                        </div>
                        {message.data.date && <div>{fmt.dateTime(message.data.date)}</div>}
                      </div>
                      <div className="mt-4 whitespace-pre-wrap text-[0.95rem] leading-relaxed" dir="auto">
                        {message.data.text}
                      </div>
                    </Card>
                    <AskAgent account={account} message={message.data} />
                  </>
                )
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function EmailPage() {
  return (
    <Suspense>
      <Inner />
    </Suspense>
  );
}
