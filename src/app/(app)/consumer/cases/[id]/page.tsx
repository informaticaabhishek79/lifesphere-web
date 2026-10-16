'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { CheckCircle2, ClipboardCheck, Copy, FileText, Pencil, Plus, Sparkles, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useAction } from '@/lib/hooks';
import { useSession } from '@/lib/session';
import type { CaseDetail, CaseStatus, OfficialChannel } from '@/lib/types';
import { useI18n } from '@/i18n';
import { Badge, Button, Card, CardBody, CardHeader, ErrorNotice, IconButton, KeyValue, LoadingBlock, Notice, PageHeader } from '@/components/ui';
import { Checkbox, Input, Segmented, Select, Textarea } from '@/components/form';
import { FormDialog, useConfirm, useToast } from '@/components/dialog';
import { StatusBadge } from '@/components/status';
import { AttachmentList, UploadButton } from '@/components/attachments';
import { ChannelCard } from '@/components/consumer';

export default function CasePage() {
  const { id } = useParams<{ id: string }>();
  const { t, e } = useI18n();
  const { fmt } = useSession();
  const router = useRouter();
  const qc = useQueryClient();
  const confirm = useConfirm();
  const toast = useToast();
  const key = ['consumer', 'case', id];
  const q = useQuery({ queryKey: key, queryFn: () => api.get<CaseDetail>(`/v1/consumer/cases/${id}`) });
  const checklist = useQuery({ queryKey: ['consumer', 'checklist', q.data?.category], queryFn: () => api.get<{ items: string[]; disclaimer: string }>('/v1/consumer/evidence-checklist', { category: q.data?.category ?? undefined }), enabled: !!q.data });
  const channels = useQuery({ queryKey: ['channels', 'consumer'], queryFn: () => api.get<OfficialChannel[]>('/v1/consumer/official-channels', { kind: 'consumer' }) });
  const [statusTo, setStatusTo] = useState<CaseStatus | null>(null);
  const [statusForm, setStatusForm] = useState({ externalReference: '', note: '', confirm: false });
  const [eventOpen, setEventOpen] = useState(false);
  const [ev, setEv] = useState({ kind: 'note', occurredOn: new Date().toISOString().slice(0, 10), description: '' });
  const [gen, setGen] = useState<{ whatHappened: string; whatYouWant: string; tone: 'polite' | 'firm'; includeTimeline: boolean } | null>(null);
  const [draftEdit, setDraftEdit] = useState<{ id?: string; body: string } | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [edit, setEdit] = useState({ title: '', counterpartyName: '', officialChannelId: '', nextFollowUpOn: '', resolutionNote: '' });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: key });
    qc.invalidateQueries({ queryKey: ['consumer', 'cases'] });
    qc.invalidateQueries({ queryKey: ['dashboard'] });
  };
  const delEvent = useAction((eid: string) => api.del(`/v1/consumer/cases/${id}/timeline/${eid}`), { onSuccess: refresh });
  const detach = useAction((aid: string) => api.del(`/v1/consumer/cases/${id}/attachments/${aid}`), { onSuccess: refresh });
  const keep = useAction((aid: string) => api.post(`/v1/attachments/${aid}/keep`), { onSuccess: refresh, success: t('consumer.kept') });
  const approve = useAction((did: string) => api.post(`/v1/consumer/cases/${id}/drafts/${did}/approve`), { onSuccess: refresh, success: t('consumer.approved') });
  const delDraft = useAction((did: string) => api.del(`/v1/consumer/cases/${id}/drafts/${did}`), { onSuccess: refresh });

  if (q.isLoading) return <LoadingBlock rows={4} />;
  if (q.error || !q.data) return <ErrorNotice error={q.error} onRetry={q.refetch} />;
  const c = q.data;

  return (
    <div className="max-w-3xl">
      <PageHeader
        back={{ href: '/consumer', label: t('nav.consumer') }}
        title={c.title}
        description={c.counterpartyName ?? undefined}
        actions={
          <>
            <StatusBadge group="caseStatus" value={c.status} />
            <Button
              variant="secondary"
              icon={<Pencil className="size-4" />}
              onClick={() => {
                setEdit({ title: c.title, counterpartyName: c.counterpartyName ?? '', officialChannelId: c.officialChannelId ?? '', nextFollowUpOn: c.nextFollowUpOn ?? '', resolutionNote: c.resolutionNote ?? '' });
                setEditOpen(true);
              }}
            >
              {t('common.edit')}
            </Button>
          </>
        }
      />
      <div className="space-y-5">
        <Card>
          <CardBody className="space-y-4 pt-5">
            <KeyValue
              items={[
                { label: t('common.category'), value: c.category ? t(`consumer.cat.${c.category}`) : undefined },
                { label: t('consumer.ref'), value: c.externalReference },
                { label: t('consumer.submittedOn'), value: c.submittedAt ? fmt.date(c.submittedAt) : undefined },
                { label: t('consumer.nextFollowUp'), value: fmt.day(c.nextFollowUpOn) },
                { label: t('consumer.resolution'), value: c.resolutionNote },
              ]}
            />
            {c.allowedNextStatuses.length > 0 && (
              <div className="border-t border-line pt-4">
                <div className="mb-2 text-sm font-semibold">{t('consumer.moveTo')}</div>
                <div className="flex flex-wrap gap-2">
                  {c.allowedNextStatuses.map((s) => (
                    <Button key={s} size="sm" variant={s === 'submitted_by_user' || s === 'resolved' ? 'primary' : 'secondary'} onClick={() => { setStatusForm({ externalReference: c.externalReference ?? '', note: '', confirm: false }); setStatusTo(s); }}>
                      {e('caseStatus', s)}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            icon={<FileText className="size-5" />}
            title={t('consumer.drafts')}
            description={t('consumer.draftsHint')}
            action={
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => setDraftEdit({ body: '' })}>
                  {t('consumer.writeOwn')}
                </Button>
                <Button size="sm" icon={<Sparkles className="size-4" />} onClick={() => setGen({ whatHappened: '', whatYouWant: '', tone: 'polite', includeTimeline: true })}>
                  {t('consumer.draftForMe')}
                </Button>
              </div>
            }
          />
          <CardBody className="space-y-3">
            {c.drafts.length === 0 && <p className="text-sm text-muted">{t('consumer.noDrafts')}</p>}
            {c.drafts.map((d) => (
              <div key={d.id} className="rounded-xl border border-line">
                <div className="flex flex-wrap items-center gap-2 border-b border-line px-3 py-2">
                  <Badge tone={d.source === 'ai' ? 'accent' : 'neutral'}>{e('draftSource', d.source)}</Badge>
                  {d.approvedAt ? <Badge tone="ok">{t('consumer.approvedOn', { date: fmt.date(d.approvedAt) })}</Badge> : <Badge tone="warn">{t('consumer.notApproved')}</Badge>}
                  <span className="flex-1" />
                  <IconButton
                    label={t('common.copy')}
                    onClick={async () => {
                      await navigator.clipboard.writeText(d.body);
                      toast(t('common.copied'));
                    }}
                  >
                    <Copy className="size-4" />
                  </IconButton>
                  <IconButton label={t('common.edit')} onClick={() => setDraftEdit({ id: d.id, body: d.body })}>
                    <Pencil className="size-4" />
                  </IconButton>
                  <IconButton label={t('common.delete')} onClick={() => delDraft.mutate(d.id)}>
                    <Trash2 className="size-4" />
                  </IconButton>
                </div>
                <pre className="max-h-72 overflow-auto whitespace-pre-wrap px-4 py-3 font-sans text-sm leading-relaxed">{d.body}</pre>
                {!d.approvedAt && (
                  <div className="border-t border-line px-3 py-2">
                    <Button size="sm" icon={<CheckCircle2 className="size-4" />} onClick={() => approve.mutate(d.id)}>
                      {t('consumer.approve')}
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title={t('consumer.timeline')}
            action={
              <Button size="sm" variant="secondary" icon={<Plus className="size-4" />} onClick={() => { setEv({ kind: 'note', occurredOn: new Date().toISOString().slice(0, 10), description: '' }); setEventOpen(true); }}>
                {t('common.add')}
              </Button>
            }
          />
          <CardBody>
            {c.timeline.length === 0 ? (
              <p className="text-sm text-muted">{t('common.emptyList')}</p>
            ) : (
              <ol className="relative space-y-4 border-l-2 border-line pl-5">
                {c.timeline.map((x) => (
                  <li key={x.id} className="relative">
                    <span className="absolute top-1.5 -left-[1.62rem] size-3 rounded-full border-2 border-surface bg-accent" />
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-sm text-muted">
                          {fmt.day(x.occurredOn)} · {e('caseEventKind', x.kind)}
                        </div>
                        <div className="whitespace-pre-wrap">{x.description}</div>
                      </div>
                      {x.kind !== 'status_change' && (
                        <IconButton label={t('common.delete')} onClick={() => delEvent.mutate(x.id)}>
                          <Trash2 className="size-4" />
                        </IconButton>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            icon={<ClipboardCheck className="size-5" />}
            title={t('consumer.evidence')}
            description={t('consumer.evidenceHint')}
            action={
              <UploadButton
                purpose="consumer_case"
                onUploaded={async (a) => {
                  await api.post(`/v1/consumer/cases/${id}/attachments`, { attachmentId: a.id });
                  refresh();
                }}
              />
            }
          />
          <CardBody className="space-y-4">
            <AttachmentList items={c.attachments} onRemove={(a) => detach.mutate(a.id)} />
            {c.attachments.some((a) => a.temporary) && (
              <Notice tone="warn">
                {t('consumer.tempEvidence')}{' '}
                {c.attachments
                  .filter((a) => a.temporary)
                  .map((a) => (
                    <button key={a.id} type="button" className="ml-1 font-semibold underline" onClick={() => keep.mutate(a.id)}>
                      {t('consumer.keep', { name: a.originalName })}
                    </button>
                  ))}
              </Notice>
            )}
            {checklist.data && (
              <div className="rounded-xl bg-surface-2 p-4">
                <div className="mb-2 text-sm font-semibold">{t('consumer.checklist')}</div>
                <ul className="list-disc space-y-1 pl-5 text-sm text-ink-2">
                  {checklist.data.items.map((i) => (
                    <li key={i}>{i}</li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-muted">{checklist.data.disclaimer}</p>
              </div>
            )}
          </CardBody>
        </Card>

        {c.officialChannel ? (
          <div>
            <div className="mb-2 text-sm font-semibold">{t('consumer.whereToSubmit')}</div>
            <ChannelCard c={c.officialChannel} />
          </div>
        ) : (
          <Notice tone="info">{t('consumer.pickChannel')}</Notice>
        )}

        <div className="flex justify-end">
          <Button
            variant="ghost"
            className="text-danger"
            icon={<Trash2 className="size-4" />}
            onClick={async () => {
              if (!(await confirm({ title: t('consumer.deleteCase'), body: c.title, danger: true }))) return;
              await api.del(`/v1/consumer/cases/${id}`);
              qc.invalidateQueries({ queryKey: ['consumer'] });
              router.replace('/consumer');
            }}
          >
            {t('consumer.deleteCase')}
          </Button>
        </div>
      </div>

      {statusTo && (
        <FormDialog
          open
          onClose={() => setStatusTo(null)}
          title={e('caseStatus', statusTo)}
          disabled={statusTo === 'submitted_by_user' && !statusForm.confirm}
          onSubmit={async () => {
            await api.post(`/v1/consumer/cases/${id}/status`, {
              status: statusTo,
              externalReference: statusForm.externalReference.trim() || undefined,
              note: statusForm.note.trim() || undefined,
              confirmSubmittedMyself: statusTo === 'submitted_by_user' ? statusForm.confirm : undefined,
            });
            refresh();
          }}
        >
          {statusTo === 'submitted_by_user' && (
            <>
              <Notice tone="info">{t('consumer.submitYourself')}</Notice>
              <Input label={t('consumer.refLabel')} hint={t('consumer.refHint')} optional value={statusForm.externalReference} onChange={(x) => setStatusForm({ ...statusForm, externalReference: x.target.value })} />
              <Checkbox label={t('consumer.confirmSubmitted')} checked={statusForm.confirm} onChange={(v) => setStatusForm({ ...statusForm, confirm: v })} />
            </>
          )}
          <Textarea label={t('common.notes')} optional value={statusForm.note} onChange={(x) => setStatusForm({ ...statusForm, note: x.target.value })} rows={2} />
        </FormDialog>
      )}

      <FormDialog
        open={eventOpen}
        onClose={() => setEventOpen(false)}
        title={t('consumer.addEvent')}
        disabled={!ev.description.trim()}
        onSubmit={async () => {
          await api.post(`/v1/consumer/cases/${id}/timeline`, { kind: ev.kind, occurredOn: ev.occurredOn, description: ev.description.trim() });
          refresh();
        }}
      >
        <Select label={t('common.type')} value={ev.kind} onChange={(x) => setEv({ ...ev, kind: x.target.value })} options={(['note', 'contact', 'response', 'follow_up'] as const).map((k) => ({ value: k, label: e('caseEventKind', k) }))} />
        <Input type="date" label={t('common.date')} value={ev.occurredOn} onChange={(x) => setEv({ ...ev, occurredOn: x.target.value })} />
        <Textarea label={t('common.description')} value={ev.description} onChange={(x) => setEv({ ...ev, description: x.target.value })} rows={3} autoFocus />
      </FormDialog>

      {gen && (
        <FormDialog
          open
          size="lg"
          onClose={() => setGen(null)}
          title={t('consumer.draftForMe')}
          description={t('consumer.aiHint')}
          submitLabel={t('consumer.generate')}
          disabled={!gen.whatHappened.trim() || !gen.whatYouWant.trim()}
          onSubmit={async () => {
            await api.post(`/v1/consumer/cases/${id}/drafts/generate`, { whatHappened: gen.whatHappened.trim(), whatYouWant: gen.whatYouWant.trim(), tone: gen.tone, includeTimeline: gen.includeTimeline });
            refresh();
          }}
        >
          <Textarea label={t('consumer.whatHappened')} hint={t('consumer.noSensitive')} value={gen.whatHappened} onChange={(x) => setGen({ ...gen, whatHappened: x.target.value })} rows={4} autoFocus />
          <Textarea label={t('consumer.whatYouWant')} placeholder={t('consumer.whatYouWantPlaceholder')} value={gen.whatYouWant} onChange={(x) => setGen({ ...gen, whatYouWant: x.target.value })} rows={2} />
          <Segmented label={t('consumer.tone')} value={gen.tone} onChange={(v) => setGen({ ...gen, tone: v })} options={[{ value: 'polite', label: t('consumer.polite') }, { value: 'firm', label: t('consumer.firm') }]} />
          <Checkbox label={t('consumer.includeTimeline')} checked={gen.includeTimeline} onChange={(v) => setGen({ ...gen, includeTimeline: v })} />
        </FormDialog>
      )}

      {draftEdit && (
        <FormDialog
          open
          size="lg"
          onClose={() => setDraftEdit(null)}
          title={draftEdit.id ? t('common.edit') : t('consumer.writeOwn')}
          disabled={!draftEdit.body.trim()}
          onSubmit={async () => {
            if (draftEdit.id) await api.patch(`/v1/consumer/cases/${id}/drafts/${draftEdit.id}`, { body: draftEdit.body });
            else await api.post(`/v1/consumer/cases/${id}/drafts`, { body: draftEdit.body });
            refresh();
          }}
        >
          <Textarea label={t('consumer.draft')} value={draftEdit.body} onChange={(x) => setDraftEdit({ ...draftEdit, body: x.target.value })} rows={14} autoFocus />
        </FormDialog>
      )}

      <FormDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title={t('common.edit')}
        disabled={!edit.title.trim()}
        onSubmit={async () => {
          await api.patch(`/v1/consumer/cases/${id}`, {
            title: edit.title.trim(),
            counterpartyName: edit.counterpartyName.trim() || undefined,
            officialChannelId: edit.officialChannelId || null,
            nextFollowUpOn: edit.nextFollowUpOn || null,
            resolutionNote: edit.resolutionNote.trim() || undefined,
          });
          refresh();
        }}
      >
        <Input label={t('consumer.caseTitle')} value={edit.title} onChange={(x) => setEdit({ ...edit, title: x.target.value })} />
        <Input label={t('consumer.against')} optional value={edit.counterpartyName} onChange={(x) => setEdit({ ...edit, counterpartyName: x.target.value })} />
        <Select label={t('consumer.whereToSubmit')} value={edit.officialChannelId} onChange={(x) => setEdit({ ...edit, officialChannelId: x.target.value })} placeholder={t('common.none')} options={(channels.data ?? []).map((ch) => ({ value: ch.id, label: ch.name }))} />
        <Input type="date" label={t('consumer.nextFollowUp')} optional value={edit.nextFollowUpOn} onChange={(x) => setEdit({ ...edit, nextFollowUpOn: x.target.value })} />
        <Textarea label={t('consumer.resolution')} optional value={edit.resolutionNote} onChange={(x) => setEdit({ ...edit, resolutionNote: x.target.value })} rows={2} />
      </FormDialog>
    </div>
  );
}
