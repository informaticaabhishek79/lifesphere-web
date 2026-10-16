'use client';

import { useState } from 'react';
import { Copy, Share2 } from 'lucide-react';
import { useI18n } from '@/i18n';
import { Button, Notice } from './ui';

/** Shows a one-time invite link with copy / share buttons. The token is only ever shown once. */
export function InviteLinkNotice({ link, title }: { link: string; title?: string }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const canShare = typeof navigator !== 'undefined' && 'share' in navigator;
  return (
    <Notice tone="ok" title={title ?? t('invite.linkReady')}>
      <p>{t('invite.linkHint')}</p>
      <code className="mt-2 block break-all rounded-lg bg-surface px-2 py-1.5 text-xs text-ink">{link}</code>
      <div className="mt-2 flex gap-2">
        <Button
          size="sm"
          variant="secondary"
          icon={<Copy className="size-4" />}
          onClick={async () => {
            await navigator.clipboard.writeText(link);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
        >
          {copied ? t('common.copied') : t('common.copyLink')}
        </Button>
        {canShare && (
          <Button size="sm" variant="secondary" icon={<Share2 className="size-4" />} onClick={() => navigator.share({ url: link, title: 'LifeSphere' }).catch(() => {})}>
            {t('common.share')}
          </Button>
        )}
      </div>
    </Notice>
  );
}
