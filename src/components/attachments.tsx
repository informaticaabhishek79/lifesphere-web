'use client';

import { useRef, useState } from 'react';
import { FileText, ImageIcon, Paperclip, Trash2 } from 'lucide-react';
import { api, fileUrl } from '@/lib/api';
import type { Attachment } from '@/lib/types';
import { useI18n } from '@/i18n';
import { Button, ErrorNotice, IconButton } from './ui';

export type AttachmentPurpose = 'task' | 'post' | 'consumer_case' | 'inventory' | 'avatar' | 'provider' | 'civic';

/** Upload button: images (JPEG/PNG/WebP), and PDF where the purpose allows. Returns the stored attachment. */
export function UploadButton({ purpose, onUploaded, label, accept = 'image/jpeg,image/png,image/webp,application/pdf' }: { purpose: AttachmentPurpose; onUploaded: (a: Attachment) => void | Promise<void>; label?: string; accept?: string }) {
  const { t } = useI18n();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  return (
    <div>
      <input
        ref={input}
        type="file"
        accept={accept}
        hidden
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (!file) return;
          setBusy(true);
          setError(null);
          try {
            const form = new FormData();
            form.append('file', file);
            const a = await api.upload<Attachment>(`/v1/attachments?purpose=${purpose}`, form);
            await onUploaded(a);
          } catch (err) {
            setError(err);
          } finally {
            setBusy(false);
          }
        }}
      />
      <Button variant="secondary" size="sm" icon={<Paperclip className="size-4" />} loading={busy} onClick={() => input.current?.click()}>
        {label ?? t('common.attach')}
      </Button>
      <ErrorNotice error={error} className="mt-2" />
    </div>
  );
}

export function AttachmentList({ items, onRemove }: { items: Attachment[]; onRemove?: (a: Attachment) => void }) {
  const { t } = useI18n();
  if (!items.length) return null;
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {items.map((a) => {
        const isImage = a.mimeType.startsWith('image/');
        return (
          <li key={a.id} className="flex items-center gap-3 rounded-xl border border-line bg-surface-2 p-2">
            <a href={fileUrl(`/v1/attachments/${a.id}/content`)} target="_blank" rel="noreferrer" className="flex min-w-0 flex-1 items-center gap-3">
              {isImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={fileUrl(`/v1/attachments/${a.id}/content`)} alt="" className="size-12 rounded-lg object-cover" />
              ) : (
                <span className="flex size-12 items-center justify-center rounded-lg bg-bg-2 text-muted">{a.mimeType === 'application/pdf' ? <FileText className="size-5" /> : <ImageIcon className="size-5" />}</span>
              )}
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{a.originalName}</span>
                <span className="text-xs text-muted">{Math.max(1, Math.round(a.sizeBytes / 1024))} KB</span>
              </span>
            </a>
            {onRemove && (
              <IconButton label={t('common.remove')} onClick={() => onRemove(a)}>
                <Trash2 className="size-4" />
              </IconButton>
            )}
          </li>
        );
      })}
    </ul>
  );
}
