'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '@/lib/api';
import { useAction } from '@/lib/hooks';
import { useSession } from '@/lib/session';
import { Badge, Button, Card, CardBody, CardHeader, PageHeader, Stat } from '@/components/ui';
import { Input, Textarea } from '@/components/form';
import { FormDialog, useConfirm } from '@/components/dialog';
import { DataTable, Json } from '@/components/admin';

interface EvalCase {
  id: string;
  question: string;
  expectedArticleIds: string[];
  mustNotContain: string[] | null;
  createdAt: string;
}
interface EvalRun {
  id: string;
  totalCases: number;
  retrievalHits: number;
  createdAt: string;
  hitRate?: number;
  retrievalMode?: string;
  results?: unknown;
}

export default function AdminAssistant() {
  const { fmt } = useSession();
  const qc = useQueryClient();
  const confirm = useConfirm();
  const cases = useQuery({ queryKey: ['admin', 'eval-cases'], queryFn: () => api.get<EvalCase[]>('/v1/admin/assistant/eval-cases') });
  const runs = useQuery({ queryKey: ['admin', 'eval-runs'], queryFn: () => api.get<EvalRun[]>('/v1/admin/assistant/eval-runs') });
  const feedback = useQuery({ queryKey: ['admin', 'feedback'], queryFn: () => api.get<{ rating: string; reason: string | null; n: number }[]>('/v1/admin/assistant/feedback-summary') });
  const [lastRun, setLastRun] = useState<EvalRun | null>(null);
  const [form, setForm] = useState<{ question: string; expected: string; mustNot: string } | null>(null);
  const run = useAction(() => api.post<EvalRun>('/v1/admin/assistant/eval-runs'), { invalidate: [['admin', 'eval-runs']], onSuccess: (r) => setLastRun(r) });
  const del = useAction((id: string) => api.del(`/v1/admin/assistant/eval-cases/${id}`), { invalidate: [['admin', 'eval-cases']] });
  const up = feedback.data?.filter((f) => f.rating === 'up').reduce((s, f) => s + f.n, 0) ?? 0;
  const down = feedback.data?.filter((f) => f.rating === 'down').reduce((s, f) => s + f.n, 0) ?? 0;
  return (
    <div className="space-y-6">
      <PageHeader
        title="Assistant quality"
        description="Evaluation cases check that the right guidance is retrieved for real questions."
        actions={
          <>
            <Button variant="secondary" onClick={() => setForm({ question: '', expected: '', mustNot: '' })}>Add case</Button>
            <Button onClick={() => run.mutate()} loading={run.isPending} disabled={!cases.data?.length}>Run evaluation</Button>
          </>
        }
      />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Helpful" value={up} tone="ok" />
        <Stat label="Not helpful" value={down} tone={down ? 'warn' : 'neutral'} />
        <Stat label="Eval cases" value={cases.data?.length ?? 0} />
        <Stat label="Last hit rate" value={runs.data?.[0] ? `${Math.round((runs.data[0].retrievalHits / Math.max(1, runs.data[0].totalCases)) * 100)}%` : '—'} />
      </div>
      {lastRun && (
        <Card>
          <CardHeader title={`Run result: ${Math.round((lastRun.hitRate ?? 0) * 100)}% hit rate`} description={`Retrieval: ${lastRun.retrievalMode}`} />
          <CardBody>
            <Json value={lastRun.results} />
          </CardBody>
        </Card>
      )}
      <DataTable
        rows={cases.data ?? []}
        rowKey={(r) => r.id}
        columns={[
          { key: 'question', label: 'Question' },
          { key: 'expected', label: 'Expected articles', render: (r) => r.expectedArticleIds.length },
          { key: 'mustNot', label: 'Must not contain', render: (r) => (r.mustNotContain ?? []).join(', ') || '—' },
          { key: 'x', label: '', render: (r) => <Button size="sm" variant="ghost" className="text-danger" onClick={async () => { if (await confirm({ title: 'Delete case?', danger: true })) del.mutate(r.id); }}>Delete</Button> },
        ]}
      />
      <Card>
        <CardHeader title="Runs" />
        <CardBody>
          <ul className="divide-y divide-line text-sm">
            {runs.data?.map((r) => (
              <li key={r.id} className="flex justify-between py-2">
                <span>{fmt.dateTime(r.createdAt)}</span>
                <span>
                  {r.retrievalHits}/{r.totalCases} <Badge tone={r.retrievalHits === r.totalCases ? 'ok' : 'warn'}>{Math.round((r.retrievalHits / Math.max(1, r.totalCases)) * 100)}%</Badge>
                </span>
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>
      <Card>
        <CardHeader title="Feedback by reason" />
        <CardBody>
          <ul className="divide-y divide-line text-sm">
            {feedback.data?.map((f, i) => (
              <li key={i} className="flex justify-between py-2">
                <span>
                  {f.rating === 'up' ? '👍' : '👎'} {f.reason ?? '—'}
                </span>
                <span className="font-semibold">{f.n}</span>
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>
      {form && (
        <FormDialog
          open
          onClose={() => setForm(null)}
          title="Add evaluation case"
          disabled={!form.question.trim() || !form.expected.trim()}
          onSubmit={async () => {
            await api.post('/v1/admin/assistant/eval-cases', {
              question: form.question.trim(),
              expectedArticleIds: form.expected.split(/[\s,]+/).filter(Boolean),
              mustNotContain: form.mustNot ? form.mustNot.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
            });
            qc.invalidateQueries({ queryKey: ['admin', 'eval-cases'] });
          }}
        >
          <Textarea label="Question" value={form.question} onChange={(ev) => setForm({ ...form, question: ev.target.value })} rows={2} autoFocus />
          <Input label="Expected article IDs" hint="Comma-separated (see Knowledge)" value={form.expected} onChange={(ev) => setForm({ ...form, expected: ev.target.value })} />
          <Input label="Answer must not contain" optional hint="Comma-separated phrases" value={form.mustNot} onChange={(ev) => setForm({ ...form, mustNot: ev.target.value })} />
        </FormDialog>
      )}
    </div>
  );
}
