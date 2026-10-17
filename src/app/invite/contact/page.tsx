'use client';

import { useCallback } from 'react';
import { api } from '@/lib/api';
import { useI18n } from '@/i18n';
import { InviteAccept } from '@/components/invite-accept';

interface Preview {
  id: string;
  inviterName: string;
  message: string | null;
  proposedScopes: { scope: string; meaning: string }[];
}

export default function ContactInvitePage() {
  const { t, e } = useI18n();
  const preview = useCallback(
    async (token: string) => {
      const p = await api.post<Preview>('/v1/contacts/invitations/preview', { token });
      return (
        <div className="space-y-3">
          <p className="text-ink-2">{t('invite.contactBody', { name: p.inviterName })}</p>
          {p.message && <blockquote className="rounded-xl bg-surface-2 px-4 py-3 italic">“{p.message}”</blockquote>}
          {p.proposedScopes.length > 0 && (
            <div>
              <div className="mb-1.5 text-sm font-semibold">{t('invite.theyOffer', { name: p.inviterName })}</div>
              <ul className="list-disc space-y-1 ps-5 text-sm text-ink-2">
                {p.proposedScopes.map((s) => (
                  <li key={s.scope}>{e('grantScope', s.scope)}</li>
                ))}
              </ul>
            </div>
          )}
          <p className="text-[0.82rem] text-muted">{t('invite.contactNoAccess')}</p>
        </div>
      );
    },
    [t, e],
  );
  return <InviteAccept kind="contact" title={t('invite.contactTitle')} preview={preview} accept={(token) => api.post('/v1/contacts/invitations/accept', { token })} successHref="/contacts" />;
}
