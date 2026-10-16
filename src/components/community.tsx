'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Bookmark, BookmarkCheck, CalendarDays, Flag, MapPin, MessageCircle, Pin } from 'lucide-react';
import { api } from '@/lib/api';
import { useAction } from '@/lib/hooks';
import { useSession } from '@/lib/session';
import type { Post, PostKind, Reaction } from '@/lib/types';
import { useI18n } from '@/i18n';
import { Avatar, Badge, cx, Notice } from './ui';
import { FormDialog } from './dialog';
import { Input, Select, Textarea } from './form';
import { AttachmentList, UploadButton } from './attachments';
import { isoToLocalInput, localInputToIso } from '@/lib/format';
import type { Attachment } from '@/lib/types';

export const POST_KINDS: PostKind[] = ['text', 'announcement', 'event', 'recommendation', 'help_request', 'civic_info', 'lost_found'];
export const REACTIONS: Reaction[] = ['like', 'helpful', 'thanks', 'support'];
const REACTION_EMOJI: Record<Reaction, string> = { like: '👍', helpful: '💡', thanks: '🙏', support: '🤝' };
const REPORT_REASONS = ['spam', 'harassment', 'hate', 'fraud', 'impersonation', 'privacy', 'unsafe', 'misinformation', 'other'] as const;

export function ReactionBar({ post, onChanged }: { post: Post; onChanged: () => void }) {
  const { t, e } = useI18n();
  const set = useAction((kind: Reaction | null) => (kind ? api.put(`/v1/community/posts/${post.id}/reaction`, { kind }) : api.del(`/v1/community/posts/${post.id}/reaction`)), { onSuccess: onChanged });
  const bookmark = useAction(() => (post.bookmarked ? api.del(`/v1/community/posts/${post.id}/bookmark`) : api.put(`/v1/community/posts/${post.id}/bookmark`)), { onSuccess: onChanged });
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {REACTIONS.map((r) => (
        <button
          key={r}
          type="button"
          aria-pressed={post.myReaction === r}
          onClick={() => set.mutate(post.myReaction === r ? null : r)}
          className={cx('rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors', post.myReaction === r ? 'border-brand bg-brand-soft text-brand' : 'border-line text-ink-2 hover:bg-bg-2')}
        >
          <span aria-hidden>{REACTION_EMOJI[r]}</span> {e('reaction', r)}
        </button>
      ))}
      <span className="flex-1" />
      <button type="button" onClick={() => bookmark.mutate()} className="rounded-lg p-1.5 text-muted hover:bg-bg-2 hover:text-ink" aria-label={post.bookmarked ? t('community.unsave') : t('community.save')} title={post.bookmarked ? t('community.unsave') : t('community.save')}>
        {post.bookmarked ? <BookmarkCheck className="size-4 text-brand" /> : <Bookmark className="size-4" />}
      </button>
    </div>
  );
}

export function PostCard({ post, onChanged, showGroup }: { post: Post; onChanged: () => void; showGroup?: boolean }) {
  const { t, e } = useI18n();
  const { fmt } = useSession();
  return (
    <article className={cx('card px-4 py-4', post.pinnedAt && 'border-accent/40')}>
      <div className="flex items-start gap-3">
        <Avatar name={post.author.displayName} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            <span className="font-semibold">{post.author.displayName}</span>
            <span className="text-muted">{fmt.ago(post.createdAt)}</span>
            {post.editedAt && <span className="text-xs text-muted">({t('community.edited')})</span>}
            {post.kind !== 'text' && <Badge tone={post.kind === 'help_request' ? 'danger' : post.kind === 'announcement' ? 'accent' : 'info'}>{e('postKind', post.kind)}</Badge>}
            {post.pinnedAt && <Badge tone="accent"><Pin className="size-3" /> {t('households.pinned')}</Badge>}
            {post.status !== 'published' && <Badge tone="warn">{e('contentStatus', post.status)}</Badge>}
            {showGroup && post.groupName && (
              <Link href={`/community/groups/${post.groupId}`} className="text-xs font-semibold text-brand">
                {post.groupName}
              </Link>
            )}
          </div>
          <Link href={`/community/posts/${post.id}`} className="mt-1 block">
            {post.title && <h3 className="font-semibold">{post.title}</h3>}
            <p className="line-clamp-6 whitespace-pre-wrap text-ink-2">{post.body}</p>
          </Link>
          {post.kind === 'event' && post.eventStartsAt && (
            <div className="mt-2 flex flex-wrap gap-3 rounded-xl bg-info-soft px-3 py-2 text-sm text-info">
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="size-4" /> {fmt.dateTime(post.eventStartsAt)}
              </span>
              {post.eventLocationText && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="size-4" /> {post.eventLocationText}
                </span>
              )}
            </div>
          )}
          {post.attachments.length > 0 && (
            <div className="mt-3">
              <AttachmentList items={post.attachments} />
            </div>
          )}
          <div className="mt-3 flex items-center gap-3">
            <div className="flex-1">
              <ReactionBar post={post} onChanged={onChanged} />
            </div>
            <Link href={`/community/posts/${post.id}`} className="inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-ink">
              <MessageCircle className="size-4" /> {post.commentCount}
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}

export interface PostFormValue {
  kind: PostKind;
  title: string;
  body: string;
  eventStartsAt: string;
  eventEndsAt: string;
  eventLocationText: string;
  attachments: Attachment[];
}

export const emptyPost = (): PostFormValue => ({ kind: 'text', title: '', body: '', eventStartsAt: '', eventEndsAt: '', eventLocationText: '', attachments: [] });

export const postToForm = (p: Post): PostFormValue => ({
  kind: p.kind,
  title: p.title ?? '',
  body: p.body,
  eventStartsAt: isoToLocalInput(p.eventStartsAt),
  eventEndsAt: isoToLocalInput(p.eventEndsAt),
  eventLocationText: p.eventLocationText ?? '',
  attachments: p.attachments,
});

export const postBody = (v: PostFormValue) => ({
  kind: v.kind,
  title: v.title.trim() || undefined,
  body: v.body.trim(),
  eventStartsAt: v.kind === 'event' ? localInputToIso(v.eventStartsAt) : undefined,
  eventEndsAt: v.kind === 'event' ? localInputToIso(v.eventEndsAt) : undefined,
  eventLocationText: v.kind === 'event' ? v.eventLocationText.trim() || undefined : undefined,
  attachmentIds: v.attachments.map((a) => a.id),
});

export function PostFields({ value, onChange, allowAnnouncement }: { value: PostFormValue; onChange: (v: PostFormValue) => void; allowAnnouncement: boolean }) {
  const { t, e } = useI18n();
  const set = <K extends keyof PostFormValue>(k: K, v: PostFormValue[K]) => onChange({ ...value, [k]: v });
  return (
    <div className="space-y-4">
      <Select label={t('common.type')} value={value.kind} onChange={(ev) => set('kind', ev.target.value as PostKind)} options={POST_KINDS.filter((k) => allowAnnouncement || k !== 'announcement').map((k) => ({ value: k, label: e('postKind', k) }))} />
      <Input label={t('common.title')} optional value={value.title} onChange={(ev) => set('title', ev.target.value)} maxLength={200} />
      <Textarea label={t('community.message')} value={value.body} onChange={(ev) => set('body', ev.target.value)} rows={5} maxLength={5000} autoFocus />
      {value.kind === 'event' && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Input type="datetime-local" label={t('calendar.starts')} value={value.eventStartsAt} onChange={(ev) => set('eventStartsAt', ev.target.value)} />
          <Input type="datetime-local" label={t('calendar.ends')} optional value={value.eventEndsAt} onChange={(ev) => set('eventEndsAt', ev.target.value)} />
          <Input label={t('common.where')} optional value={value.eventLocationText} onChange={(ev) => set('eventLocationText', ev.target.value)} fieldClassName="sm:col-span-2" />
        </div>
      )}
      <AttachmentList items={value.attachments} onRemove={(a) => set('attachments', value.attachments.filter((x) => x.id !== a.id))} />
      <UploadButton purpose="post" accept="image/jpeg,image/png,image/webp" label={t('community.addPhoto')} onUploaded={(a) => set('attachments', [...value.attachments, a])} />
      <Notice tone="info">{t('community.privacyTip')}</Notice>
    </div>
  );
}

export function ReportDialog({ open, onClose, targetType, targetId }: { open: boolean; onClose: () => void; targetType: string; targetId: string }) {
  const { t, e } = useI18n();
  const [reason, setReason] = useState<string>('spam');
  const [details, setDetails] = useState('');
  const [done, setDone] = useState<string | null>(null);
  return (
    <FormDialog
      open={open}
      onClose={() => {
        setDone(null);
        onClose();
      }}
      title={t('community.report')}
      description={t('community.reportHint')}
      submitLabel={done ? t('common.done') : t('community.sendReport')}
      onSubmit={async () => {
        if (done) return;
        const r = await api.post<{ message: string }>('/v1/community/reports', { targetType, targetId, reason, details: details.trim() || undefined });
        setDone(r.message);
        return false;
      }}
    >
      {done ? (
        <Notice tone="ok">{done}</Notice>
      ) : (
        <>
          <Select label={t('common.reason')} value={reason} onChange={(ev) => setReason(ev.target.value)} options={REPORT_REASONS.map((r) => ({ value: r, label: e('reportReason', r) }))} />
          <Textarea label={t('common.details')} optional value={details} onChange={(ev) => setDetails(ev.target.value)} rows={3} maxLength={1000} />
        </>
      )}
    </FormDialog>
  );
}

export function ReportButton({ targetType, targetId, label }: { targetType: string; targetId: string; label?: string }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-danger">
        <Flag className="size-4" /> {label ?? t('community.report')}
      </button>
      <ReportDialog open={open} onClose={() => setOpen(false)} targetType={targetType} targetId={targetId} />
    </>
  );
}
