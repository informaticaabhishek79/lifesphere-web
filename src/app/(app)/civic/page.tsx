'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Landmark, Plus, Share2, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useAction } from '@/lib/hooks';
import { useLocalities } from '@/lib/data';
import { useSession } from '@/lib/session';
import type { CivicIssue, GroupSummary, OfficialChannel, Page } from '@/lib/types';
import { useI18n } from '@/i18n';
import { Badge, Button, Card, CardBody, EmptyState, ErrorNotice, IconButton, KeyValue, LoadingBlock, Notice, PageHeader } from '@/components/ui';
import { Input, Select, Textarea } from '@/components/form';
import { Dialog, FormDialog, useConfirm } from '@/components/dialog';
import { StatusBadge } from '@/components/status';
import { ChannelCard } from '@/components/consumer';

const CATS = ['streetlight', 'garbage', 'road', 'water', 'drainage', 'electricity', 'public_safety', 'other'] as const;
const STATUSES = ['draft', 'reported_by_user', 'in_progress', 'resolved', 'closed'] as const;

export default function CivicPage() {
  const { t, e } = useI18n();
  const { me, fmt } = useSession();
  const qc = useQueryClient();
  const confirm = useConfirm();
  const q = useQuery({ queryKey: ['civic'], queryFn: () => api.get<CivicIssue[]>('/v1/civic-issues') });
  const channels = useQuery({ queryKey: ['channels', 'civic'], queryFn: () => api.get<OfficialChannel[]>('/v1/consumer/official-channels', { kind: 'civic' }) });
  const localities = useLocalities();
  const myGroups = useQuery({ queryKey: ['community', 'groups', 'mine-all'], queryFn: () => api.get<Page<GroupSummary>>('/v1/community/groups', { mine: 'true', limit: 50 }) });
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ category: 'garbage', description: '', locationText: '', localityId: me.profile.locality?.id ?? '' });
  const [created, setCreated] = useState<CivicIssue | null>(null);
  const [selected, setSelected] = useState<CivicIssue | null>(null);
  const [upd, setUpd] = useState({ status: '', externalReference: '', officialChannelId: '' });
  const [shareTo, setShareTo] = useState('');
  const refresh = () => qc.invalidateQueries({ queryKey: ['civic'] });
  const remove = useAction((id: string) => api.del(`/v1/civic-issues/${id}`), { onSuccess: refresh });
  const share = useAction(() => api.post(`/v1/civic-issues/${selected!.id}/share`, { groupId: shareTo }), { onSuccess: refresh, success: t('civic.shared') });
  const channelName = (id: string | null) => channels.data?.find((c) => c.id === id)?.name;

  return (
    <div className="max-w-3xl">
      <PageHeader
        title={t('nav.civic')}
        description={t('civic.intro')}
        actions={
          <Button icon={<Plus className="size-4" />} onClick={() => setOpen(true)}>
            {t('civic.new')}
          </Button>
        }
      />
      <Notice tone="info" className="mb-5">
        {t('civic.notice')}
      </Notice>
      {q.isLoading && <LoadingBlock />}
      <ErrorNotice error={q.error} />
      {q.data?.length === 0 && <EmptyState icon={<Landmark className="size-6" />} title={t('civic.empty')} body={t('civic.emptyBody')} />}
      <div className="space-y-3">
        {q.data?.map((c) => (
          <Card key={c.id}>
            <CardBody className="pt-4">
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  className="min-w-0 flex-1 text-start"
                  onClick={() => {
                    setSelected(c);
                    setUpd({ status: c.status, externalReference: c.externalReference ?? '', officialChannelId: c.officialChannelId ?? '' });
                    setShareTo('');
                  }}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="info">{e('civicCategory', c.category)}</Badge>
                    <StatusBadge group="civicStatus" value={c.status} />
                    {c.postId && <Badge tone="accent">{t('civic.sharedBadge')}</Badge>}
                  </div>
                  <p className="mt-2 line-clamp-3">{c.description}</p>
                  <p className="mt-1 text-sm text-muted">
                    {[c.locationText, c.externalReference && `${t('consumer.ref')} ${c.externalReference}`, fmt.date(c.createdAt)].filter(Boolean).join(' · ')}
                  </p>
                </button>
                <IconButton label={t('common.delete')} onClick={async () => { if (await confirm({ title: t('civic.delete'), danger: true })) remove.mutate(c.id); }}>
                  <Trash2 className="size-4" />
                </IconButton>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      <FormDialog
        open={open}
        onClose={() => setOpen(false)}
        title={t('civic.new')}
        submitLabel={t('common.create')}
        disabled={f.description.trim().length < 5}
        onSubmit={async () => {
          const r = await api.post<CivicIssue>('/v1/civic-issues', { category: f.category, description: f.description.trim(), locationText: f.locationText.trim() || undefined, localityId: f.localityId || undefined });
          setF({ ...f, description: '', locationText: '' });
          setCreated(r);
          refresh();
        }}
      >
        <Select label={t('common.category')} value={f.category} onChange={(ev) => setF({ ...f, category: ev.target.value })} options={CATS.map((c) => ({ value: c, label: e('civicCategory', c) }))} />
        <Textarea label={t('civic.whatsWrong')} value={f.description} onChange={(ev) => setF({ ...f, description: ev.target.value })} rows={4} maxLength={2000} autoFocus />
        <Input label={t('civic.landmark')} hint={t('civic.landmarkHint')} optional value={f.locationText} onChange={(ev) => setF({ ...f, locationText: ev.target.value })} maxLength={200} />
        <Select label={t('settings.locality')} value={f.localityId} onChange={(ev) => setF({ ...f, localityId: ev.target.value })} placeholder={t('common.none')} options={(localities.data ?? []).map((l) => ({ value: l.id, label: `${l.name}, ${l.city}` }))} />
      </FormDialog>

      <Dialog open={!!created} onClose={() => setCreated(null)} title={t('civic.savedTitle')} footer={<Button onClick={() => setCreated(null)}>{t('common.done')}</Button>}>
        {created && (
          <div className="space-y-3">
            <p className="text-ink-2">{created.notice}</p>
            {(created.suggestedChannels?.length ?? 0) > 0 && <div className="text-sm font-semibold">{t('civic.whereToReport')}</div>}
            {created.suggestedChannels?.map((c) => <ChannelCard key={c.id} c={c} />)}
          </div>
        )}
      </Dialog>

      {selected && (
        <FormDialog
          open
          onClose={() => setSelected(null)}
          title={e('civicCategory', selected.category)}
          onSubmit={async () => {
            await api.patch(`/v1/civic-issues/${selected.id}`, { status: upd.status, externalReference: upd.externalReference.trim() || undefined, officialChannelId: upd.officialChannelId || undefined });
            refresh();
          }}
        >
          <p className="whitespace-pre-wrap">{selected.description}</p>
          <KeyValue items={[{ label: t('civic.landmark'), value: selected.locationText }, { label: t('civic.reportedOn'), value: selected.reportedAt ? fmt.date(selected.reportedAt) : undefined }, { label: t('consumer.whereToSubmit'), value: channelName(selected.officialChannelId) }]} />
          <Select label={t('common.status')} value={upd.status} onChange={(ev) => setUpd({ ...upd, status: ev.target.value })} options={STATUSES.map((s) => ({ value: s, label: e('civicStatus', s) }))} />
          <Select label={t('consumer.whereToSubmit')} value={upd.officialChannelId} onChange={(ev) => setUpd({ ...upd, officialChannelId: ev.target.value })} placeholder={t('common.none')} options={(channels.data ?? []).map((c) => ({ value: c.id, label: c.name }))} />
          <Input label={t('consumer.refLabel')} hint={t('civic.refHint')} optional value={upd.externalReference} onChange={(ev) => setUpd({ ...upd, externalReference: ev.target.value })} />
          {(myGroups.data?.items.length ?? 0) > 0 && !selected.postId && (
            <div className="flex items-end gap-2 rounded-xl bg-surface-2 p-3">
              <Select label={t('civic.shareToGroup')} value={shareTo} onChange={(ev) => setShareTo(ev.target.value)} placeholder={t('common.selectPlaceholder')} options={myGroups.data!.items.map((g) => ({ value: g.id, label: g.name }))} fieldClassName="flex-1" />
              <Button variant="secondary" icon={<Share2 className="size-4" />} disabled={!shareTo} loading={share.isPending} onClick={() => share.mutate()}>
                {t('common.share')}
              </Button>
            </div>
          )}
        </FormDialog>
      )}
    </div>
  );
}
