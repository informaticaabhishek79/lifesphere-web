'use client';

import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Bot, ExternalLink, History, Send, ThumbsDown, ThumbsUp, Trash2 } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { useSession } from '@/lib/session';
import type { AssistantAnswer, Citation, Conversation } from '@/lib/types';
import { useI18n } from '@/i18n';
import { Badge, Button, ButtonLink, cx, EmptyState, ErrorNotice, IconButton, Notice, PageHeader } from '@/components/ui';
import { Select, Textarea } from '@/components/form';
import { Dialog, FormDialog, useConfirm, useToast } from '@/components/dialog';

interface Turn {
  question: string;
  answer?: AssistantAnswer;
  error?: unknown;
}

const EXAMPLES = ['example1', 'example2', 'example3', 'example4'];

function actionHref(a: AssistantAnswer['proposedActions'][number]) {
  const title = typeof a.payload?.title === 'string' ? encodeURIComponent(a.payload.title as string) : '';
  if (a.type === 'create_reminder') return `/reminders?new=1&title=${title}`;
  if (a.type === 'create_task') return `/tasks?new=1&title=${title}`;
  const w = a.payload?.workflow;
  if (w === 'consumer_case') return '/consumer?new=1';
  if (w === 'check_ins') return '/check-ins';
  if (w === 'service_request') return '/services';
  if (w === 'civic_issue') return '/civic';
  return '/';
}

export default function AssistantPage() {
  const { t } = useI18n();
  const { me, fmt } = useSession();
  const router = useRouter();
  const qc = useQueryClient();
  const toast = useToast();
  const confirm = useConfirm();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [question, setQuestion] = useState('');
  const [busy, setBusy] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [historyOpen, setHistoryOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ answer: AssistantAnswer; rating: 'up' | 'down' } | null>(null);
  const [reason, setReason] = useState('not_helpful');
  const [comment, setComment] = useState('');
  const end = useRef<HTMLDivElement>(null);
  const store = me.preferences.aiStoreHistory;
  const conversations = useQuery({ queryKey: ['assistant', 'conversations'], queryFn: () => api.get<Conversation[]>('/v1/assistant/conversations'), enabled: historyOpen });

  useEffect(() => {
    // Newer browsers return a Promise from scrollIntoView; an effect must return nothing or a cleanup function.
    end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [turns]);

  const ask = async (q: string) => {
    const text = q.trim();
    if (text.length < 3) return;
    setQuestion('');
    setBusy(true);
    setTurns((ts) => [...ts, { question: text }]);
    try {
      const a = await api.post<AssistantAnswer>('/v1/assistant/ask', { question: text, conversationId });
      if (a.conversationId) setConversationId(a.conversationId);
      setTurns((ts) => ts.map((x, i) => (i === ts.length - 1 ? { ...x, answer: a } : x)));
    } catch (err) {
      setTurns((ts) => ts.map((x, i) => (i === ts.length - 1 ? { ...x, error: err } : x)));
    } finally {
      setBusy(false);
    }
  };

  const loadConversation = async (id: string) => {
    const c = await api.get<Conversation>(`/v1/assistant/conversations/${id}`);
    const out: Turn[] = [];
    for (const m of c.messages ?? []) {
      if (m.role === 'user') out.push({ question: m.content });
      else if (out.length)
        out[out.length - 1]!.answer = { answer: m.content, citations: m.citations, proposedActions: m.proposedActions, groundedInSources: m.citations.length > 0, simulated: false, retrievalMode: '', conversationId: c.id, messageId: m.id, disclaimer: '' };
    }
    setTurns(out);
    setConversationId(c.id);
    setHistoryOpen(false);
  };

  if (!me.preferences.aiEnabled) {
    return (
      <div className="max-w-2xl">
        <PageHeader title={t('nav.assistant')} />
        <EmptyState icon={<Bot className="size-6" />} title={t('assistant.off')} body={t('assistant.offBody')} action={<ButtonLink href="/settings#features">{t('nav.settings')}</ButtonLink>} />
      </div>
    );
  }

  const disabled = turns.some((x) => x.error instanceof ApiError && x.error.code === 'assistant_disabled');

  return (
    <div className="flex min-h-[calc(100dvh-10rem)] max-w-3xl flex-col">
      <PageHeader
        title={t('nav.assistant')}
        description={t('assistant.intro')}
        actions={
          <>
            {store && (
              <Button variant="secondary" icon={<History className="size-4" />} onClick={() => setHistoryOpen(true)}>
                {t('assistant.history')}
              </Button>
            )}
            {turns.length > 0 && (
              <Button variant="ghost" onClick={() => { setTurns([]); setConversationId(undefined); }}>
                {t('assistant.newChat')}
              </Button>
            )}
          </>
        }
      />
      <Notice tone="info" className="mb-4">
        {store ? t('assistant.storedNotice') : t('assistant.notStoredNotice')}
      </Notice>

      <div className="flex-1 space-y-5">
        {turns.length === 0 && (
          <div className="grid gap-2 sm:grid-cols-2">
            {EXAMPLES.map((k) => (
              <button key={k} type="button" onClick={() => ask(t(`assistant.${k}`))} className="card px-4 py-3 text-start text-sm hover:border-line-strong">
                {t(`assistant.${k}`)}
              </button>
            ))}
          </div>
        )}
        {turns.map((turn, i) => (
          <div key={i} className="space-y-3">
            <div className="ms-auto max-w-[85%] rounded-2xl rounded-ee-md bg-brand px-4 py-2.5 text-brand-ink">{turn.question}</div>
            {!turn.answer && !turn.error && <div className="skeleton h-20 w-3/4" />}
            {turn.error ? <ErrorNotice error={turn.error} /> : null}
            {turn.answer && <AnswerBlock a={turn.answer} onFeedback={(rating) => { setReason('not_helpful'); setComment(''); setFeedback({ answer: turn.answer!, rating }); }} onAction={(href) => router.push(href)} />}
          </div>
        ))}
        <div ref={end} />
      </div>

      <form
        className="sticky bottom-20 mt-6 flex items-end gap-2 rounded-2xl border border-line bg-surface p-2 shadow-lg lg:bottom-4"
        onSubmit={(ev) => {
          ev.preventDefault();
          ask(question);
        }}
      >
        <textarea
          aria-label={t('assistant.ask')}
          placeholder={t('assistant.placeholder')}
          value={question}
          onChange={(ev) => setQuestion(ev.target.value)}
          onKeyDown={(ev) => {
            if (ev.key === 'Enter' && !ev.shiftKey) {
              ev.preventDefault();
              ask(question);
            }
          }}
          rows={1}
          maxLength={1000}
          disabled={disabled}
          className="max-h-40 min-h-11 flex-1 resize-none bg-transparent px-3 py-2.5 focus:outline-none"
        />
        <Button type="submit" icon={<Send className="size-4" />} loading={busy} disabled={question.trim().length < 3 || disabled}>
          {t('assistant.ask')}
        </Button>
      </form>

      <Dialog open={historyOpen} onClose={() => setHistoryOpen(false)} title={t('assistant.history')} description={t('assistant.historyHint')}>
        <ul className="divide-y divide-line">
          {conversations.data?.length === 0 && <li className="py-4 text-center text-muted">{t('common.emptyList')}</li>}
          {conversations.data?.map((c) => (
            <li key={c.id} className="flex items-center gap-2 py-2">
              <button type="button" className="min-w-0 flex-1 text-start" onClick={() => loadConversation(c.id)}>
                <div className="truncate font-medium">{c.title ?? t('assistant.untitled')}</div>
                <div className="text-xs text-muted">{fmt.ago(c.updatedAt)}{c.expiresAt && ` · ${t('assistant.deletesOn', { date: fmt.date(c.expiresAt) })}`}</div>
              </button>
              <IconButton
                label={t('common.delete')}
                onClick={async () => {
                  await api.del(`/v1/assistant/conversations/${c.id}`);
                  qc.invalidateQueries({ queryKey: ['assistant'] });
                  if (c.id === conversationId) setConversationId(undefined);
                }}
              >
                <Trash2 className="size-4" />
              </IconButton>
            </li>
          ))}
        </ul>
        {(conversations.data?.length ?? 0) > 0 && (
          <Button
            variant="ghost"
            className="mt-3 text-danger"
            onClick={async () => {
              if (!(await confirm({ title: t('assistant.deleteAll'), danger: true }))) return;
              await api.del('/v1/assistant/conversations');
              qc.invalidateQueries({ queryKey: ['assistant'] });
              setTurns([]);
              setConversationId(undefined);
            }}
          >
            {t('assistant.deleteAll')}
          </Button>
        )}
      </Dialog>

      {feedback && (
        <FormDialog
          open
          onClose={() => setFeedback(null)}
          title={feedback.rating === 'up' ? t('assistant.thanksUp') : t('assistant.whatWrong')}
          submitLabel={t('common.send')}
          onSubmit={async () => {
            await api.post('/v1/assistant/feedback', {
              messageId: feedback.answer.messageId ?? undefined,
              citedArticleIds: feedback.answer.citations.map((c) => c.articleId).slice(0, 10),
              rating: feedback.rating,
              reason: feedback.rating === 'down' ? reason : undefined,
              comment: comment.trim() || undefined,
            });
            toast(t('assistant.feedbackThanks'));
          }}
        >
          {feedback.rating === 'down' && (
            <Select label={t('common.reason')} value={reason} onChange={(ev) => setReason(ev.target.value)} options={['inaccurate', 'outdated', 'not_helpful', 'unsafe', 'other'].map((r) => ({ value: r, label: t(`assistant.reason.${r}`) }))} />
          )}
          <Textarea label={t('assistant.comment')} optional value={comment} onChange={(ev) => setComment(ev.target.value)} rows={2} maxLength={1000} />
        </FormDialog>
      )}
    </div>
  );
}

function AnswerBlock({ a, onFeedback, onAction }: { a: AssistantAnswer; onFeedback: (r: 'up' | 'down') => void; onAction: (href: string) => void }) {
  const { t } = useI18n();
  const { fmt } = useSession();
  return (
    <div className="card max-w-[92%] space-y-3 px-4 py-3.5">
      <div className="flex flex-wrap items-center gap-2">
        <Bot className="size-4 text-brand" />
        {a.simulated && <Badge tone="accent">{t('common.simulated')}</Badge>}
        {!a.groundedInSources && <Badge tone="warn">{t('assistant.noSources')}</Badge>}
      </div>
      <div className="prose-body whitespace-pre-wrap leading-relaxed">{a.answer}</div>
      {a.citations.length > 0 && (
        <div>
          <div className="mb-1 text-xs font-bold uppercase tracking-wide text-muted">{t('assistant.sources')}</div>
          <ol className="list-decimal space-y-1 ps-5 text-sm">
            {a.citations.map((c: Citation, i) => (
              <li key={`${c.articleId}-${i}`}>
                {c.url ? (
                  <a href={c.url} target="_blank" rel="noreferrer" className="font-medium text-brand hover:underline">
                    {c.title} <ExternalLink className="inline size-3" />
                  </a>
                ) : (
                  <Link href={`/knowledge?q=${encodeURIComponent(c.title)}`} className="font-medium text-brand hover:underline">
                    {c.title}
                  </Link>
                )}
                {c.lastReviewedOn && <span className="text-muted"> · {t('assistant.reviewed', { date: fmt.day(c.lastReviewedOn) })}</span>}
              </li>
            ))}
          </ol>
        </div>
      )}
      {a.proposedActions.length > 0 && (
        <div className="flex flex-wrap gap-2 border-t border-line pt-3">
          {a.proposedActions.map((x, i) => (
            <Button key={i} size="sm" variant="soft" onClick={() => onAction(actionHref(x))}>
              {x.label}
            </Button>
          ))}
        </div>
      )}
      {a.disclaimer && <p className="text-xs text-muted">{a.disclaimer}</p>}
      <div className="flex items-center gap-1">
        <span className="me-1 text-xs text-muted">{t('assistant.helpful')}</span>
        <IconButton label={t('assistant.thumbsUp')} onClick={() => onFeedback('up')} className="size-8">
          <ThumbsUp className="size-4" />
        </IconButton>
        <IconButton label={t('assistant.thumbsDown')} onClick={() => onFeedback('down')} className={cx('size-8')}>
          <ThumbsDown className="size-4" />
        </IconButton>
      </div>
    </div>
  );
}
