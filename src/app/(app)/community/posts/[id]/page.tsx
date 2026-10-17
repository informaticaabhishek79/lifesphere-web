'use client';

import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { Ban, EyeOff, Pencil, Pin, RotateCcw, Send, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useAction, usePaged } from '@/lib/hooks';
import { useSession } from '@/lib/session';
import type { Comment, GroupDetail, Post } from '@/lib/types';
import { useI18n } from '@/i18n';
import { Avatar, Button, Card, CardBody, ErrorNotice, IconButton, LoadingBlock, LoadMore, Notice, PageHeader } from '@/components/ui';
import { Input, Textarea } from '@/components/form';
import { FormDialog, useConfirm } from '@/components/dialog';
import { PostCard, PostFields, postBody, postToForm, ReportButton, type PostFormValue } from '@/components/community';

export default function PostPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useI18n();
  const { me, fmt } = useSession();
  const router = useRouter();
  const qc = useQueryClient();
  const confirm = useConfirm();
  const q = useQuery({ queryKey: ['community', 'post', id], queryFn: () => api.get<Post>(`/v1/community/posts/${id}`) });
  const group = useQuery({ queryKey: ['community', 'group', q.data?.groupId], queryFn: () => api.get<GroupDetail>(`/v1/community/groups/${q.data!.groupId}`), enabled: !!q.data });
  const comments = usePaged<Comment>(['community', 'comments', id], `/v1/community/posts/${id}/comments`, {}, { enabled: !!q.data });
  const reactions = useQuery({ queryKey: ['community', 'reactions', id], queryFn: () => api.get<{ kind: string; count: number }[]>(`/v1/community/posts/${id}/reactions`), enabled: !!q.data });
  const [body, setBody] = useState('');
  const [held, setHeld] = useState(false);
  const [edit, setEdit] = useState<PostFormValue | null>(null);
  const [editComment, setEditComment] = useState<Comment | null>(null);
  const [mod, setMod] = useState<{ action: 'hide' | 'remove' | 'restore'; reason: string } | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: ['community'] });
  const addComment = useAction(() => api.post<Comment>(`/v1/community/posts/${id}/comments`, { body: body.trim() }), {
    onSuccess: (c) => {
      setBody('');
      setHeld(!!c.heldForReview);
      refresh();
    },
  });
  const delComment = useAction((cid: string) => api.del(`/v1/community/comments/${cid}`), { onSuccess: refresh });
  const pin = useAction(() => api.post(`/v1/community/posts/${id}/pin`, { pinned: !q.data?.pinnedAt }), { onSuccess: refresh });
  const block = useAction((uid: string) => api.put(`/v1/community/blocks/${uid}`), { onSuccess: () => router.replace('/community'), success: t('community.blockedDone') });

  if (q.isLoading) return <LoadingBlock rows={3} />;
  if (q.error || !q.data) return <ErrorNotice error={q.error} onRetry={q.refetch} />;
  const post = q.data;
  const mine = post.authorId === me.id;
  const role = group.data?.membership?.status === 'active' ? group.data.membership.role : null;
  const isStaff = role === 'owner' || role === 'admin' || role === 'moderator';
  const isAdmin = role === 'owner' || role === 'admin';

  return (
    <div className="max-w-3xl">
      <PageHeader back={{ href: `/community/groups/${post.groupId}`, label: group.data?.name ?? t('community.groups') }} title={post.title ?? t(`enums.postKind.${post.kind}`)} />
      <div className="space-y-4">
        <PostCard post={post} onChanged={refresh} />
        <div className="flex flex-wrap items-center gap-3 px-1">
          {reactions.data && reactions.data.length > 0 && (
            <span className="text-sm text-muted">
              {reactions.data.map((r) => `${t(`enums.reaction.${r.kind}`)} ${r.count}`).join(' · ')}
            </span>
          )}
          <span className="flex-1" />
          {mine && (
            <>
              <Button size="sm" variant="ghost" icon={<Pencil className="size-4" />} onClick={() => setEdit(postToForm(post))}>
                {t('common.edit')}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-danger"
                icon={<Trash2 className="size-4" />}
                onClick={async () => {
                  if (!(await confirm({ title: t('community.deletePost'), danger: true }))) return;
                  await api.del(`/v1/community/posts/${id}`);
                  refresh();
                  router.replace(`/community/groups/${post.groupId}`);
                }}
              >
                {t('common.delete')}
              </Button>
            </>
          )}
          {isAdmin && (
            <Button size="sm" variant="ghost" icon={<Pin className="size-4" />} onClick={() => pin.mutate()}>
              {post.pinnedAt ? t('households.unpin') : t('households.pin')}
            </Button>
          )}
          {isStaff && !mine && (
            post.status === 'published' ? (
              <>
                <Button size="sm" variant="ghost" icon={<EyeOff className="size-4" />} onClick={() => setMod({ action: 'hide', reason: '' })}>
                  {t('enums.moderationAction.hide')}
                </Button>
                <Button size="sm" variant="ghost" className="text-danger" icon={<Trash2 className="size-4" />} onClick={() => setMod({ action: 'remove', reason: '' })}>
                  {t('enums.moderationAction.remove')}
                </Button>
              </>
            ) : (
              <Button size="sm" variant="ghost" icon={<RotateCcw className="size-4" />} onClick={() => setMod({ action: 'restore', reason: '' })}>
                {t('enums.moderationAction.restore')}
              </Button>
            )
          )}
          {!mine && (
            <>
              <ReportButton targetType="post" targetId={post.id} />
              <Button size="sm" variant="ghost" icon={<Ban className="size-4" />} onClick={async () => { if (await confirm({ title: t('community.blockTitle', { name: post.author.displayName }), body: t('community.blockBody') })) block.mutate(post.authorId); }}>
                {t('community.block')}
              </Button>
            </>
          )}
        </div>

        <Card>
          <CardBody className="space-y-4 pt-5">
            <h2 className="font-semibold">{t('community.comments', { count: post.commentCount })}</h2>
            {held && <Notice tone="warn">{t('community.heldForReview')}</Notice>}
            <form
              className="flex items-end gap-2"
              onSubmit={(ev) => {
                ev.preventDefault();
                if (body.trim()) addComment.mutate();
              }}
            >
              <Input aria-label={t('community.addComment')} placeholder={t('community.addComment')} value={body} onChange={(ev) => setBody(ev.target.value)} fieldClassName="flex-1" maxLength={2000} />
              <Button type="submit" icon={<Send className="size-4" />} loading={addComment.isPending} disabled={!body.trim()}>
                {t('common.send')}
              </Button>
            </form>
            <ul className="space-y-3">
              {comments.items.map((c) => (
                <li key={c.id} className="flex gap-3">
                  <Avatar name={c.authorName} size="sm" />
                  <div className="min-w-0 flex-1 rounded-xl bg-surface-2 px-3 py-2">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="font-semibold">{c.authorName}</span>
                      <span className="text-xs text-muted">{fmt.ago(c.createdAt)}</span>
                      {c.editedAt && <span className="text-xs text-muted">({t('community.edited')})</span>}
                    </div>
                    <p className="whitespace-pre-wrap text-[0.95rem]">{c.status === 'published' ? c.body : <em className="text-muted">{t(`enums.contentStatus.${c.status}`)}</em>}</p>
                  </div>
                  <div className="flex shrink-0 flex-col">
                    {c.authorId === me.id ? (
                      <>
                        <IconButton label={t('common.edit')} onClick={() => setEditComment(c)}>
                          <Pencil className="size-4" />
                        </IconButton>
                        <IconButton label={t('common.delete')} onClick={() => delComment.mutate(c.id)}>
                          <Trash2 className="size-4" />
                        </IconButton>
                      </>
                    ) : (
                      <ReportButton targetType="comment" targetId={c.id} label="" />
                    )}
                  </div>
                </li>
              ))}
            </ul>
            <LoadMore hasMore={comments.hasMore} loading={comments.loadingMore} onClick={comments.loadMore} />
          </CardBody>
        </Card>
        <p className="text-center text-sm">
          <Link href={`/community/groups/${post.groupId}`} className="font-semibold text-brand">
            <span aria-hidden className="flip-rtl inline-block">←</span> {group.data?.name}
          </Link>
        </p>
      </div>

      {edit && (
        <FormDialog open size="lg" onClose={() => setEdit(null)} title={t('common.edit')} disabled={!edit.body.trim()} onSubmit={async () => { await api.patch(`/v1/community/posts/${id}`, postBody(edit)); refresh(); }}>
          <PostFields value={edit} onChange={setEdit} allowAnnouncement={isAdmin} />
        </FormDialog>
      )}
      {editComment && (
        <FormDialog open onClose={() => setEditComment(null)} title={t('common.edit')} disabled={!editComment.body.trim()} onSubmit={async () => { await api.patch(`/v1/community/comments/${editComment.id}`, { body: editComment.body.trim() }); refresh(); }}>
          <Textarea label={t('community.comment')} value={editComment.body} onChange={(ev) => setEditComment({ ...editComment, body: ev.target.value })} rows={3} autoFocus />
        </FormDialog>
      )}
      {mod && (
        <FormDialog
          open
          onClose={() => setMod(null)}
          title={t(`enums.moderationAction.${mod.action}`)}
          description={t('community.modHint')}
          danger={mod.action !== 'restore'}
          disabled={mod.reason.trim().length < 3}
          onSubmit={async () => {
            await api.post(`/v1/community/posts/${id}/moderate`, { action: mod.action, reason: mod.reason.trim() });
            refresh();
          }}
        >
          <Textarea label={t('common.reason')} hint={t('community.modReasonHint')} value={mod.reason} onChange={(ev) => setMod({ ...mod, reason: ev.target.value })} rows={2} autoFocus />
        </FormDialog>
      )}
    </div>
  );
}
