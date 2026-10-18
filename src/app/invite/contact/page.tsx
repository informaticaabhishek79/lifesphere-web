'use client';

import { useCallback, useRef, useState } from 'react';
import { api } from '@/lib/api';
import type { Me } from '@/lib/types';
import { useI18n } from '@/i18n';
import { InviteAccept } from '@/components/invite-accept';
import { Checkbox } from '@/components/form';
import { useReauth } from '@/components/reauth';

interface Preview {
  id: string;
  inviterName: string;
  message: string | null;
  proposedScopes: { scope: string; meaning: string }[];
  requestedScopes: { scope: string; meaning: string }[];
}

/** What the inviter asks to see. Nothing is ticked for the person; they choose. */
function ShareBack({ name, scopes, onChange }: { name: string; scopes: string[]; onChange: (v: string[]) => void }) {
  const { t, e } = useI18n();
  const [on, setOn] = useState<string[]>(scopes.filter((s) => s !== 'help.location'));
  const set = (v: string[]) => {
    setOn(v);
    onChange(v);
  };
  return (
    <div className="rounded-xl border border-line p-4">
      <div className="mb-1 font-semibold">{t('care.acceptInvite.asks', { name })}</div>
      <p className="mb-3 text-[0.82rem] text-muted">{t('care.acceptInvite.hint', { name })}</p>
      <div className="space-y-2.5">
        {scopes.map((s) => (
          <Checkbox key={s} label={e('grantScope', s)} checked={on.includes(s)} onChange={(v) => set(v ? [...on, s] : on.filter((x) => x !== s))} />
        ))}
      </div>
    </div>
  );
}

export default function ContactInvitePage() {
  const { t, e } = useI18n();
  const withReauth = useReauth();
  const shareBack = useRef<string[]>([]);
  const next = useRef('/contacts');
  const preview = useCallback(
    async (token: string) => {
      const p = await api.post<Preview>('/v1/contacts/invitations/preview', { token });
      const requested = (p.requestedScopes ?? []).map((s) => s.scope);
      shareBack.current = requested.filter((s) => s !== 'help.location');
      return (
        <div className="space-y-3">
          <p className="text-ink-2">{t('invite.contactBody', { name: p.inviterName })}</p>
          {p.message && <blockquote className="rounded-xl bg-surface-2 px-4 py-3 italic">“{p.message}”</blockquote>}
          {requested.length > 0 && <ShareBack name={p.inviterName} scopes={requested} onChange={(v) => (shareBack.current = v)} />}
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
          <p className="text-[0.82rem] text-muted">{requested.length ? t('care.acceptInvite.undo') : t('invite.contactNoAccess')}</p>
        </div>
      );
    },
    [t, e],
  );
  const accept = async (token: string) => {
    const back = shareBack.current;
    await withReauth(() => api.post('/v1/contacts/invitations/accept', { token, shareBack: back.length ? back : undefined }));
    // Someone who just agreed to be looked after goes straight on to set up their day.
    if (back.length) {
      const me = await api.get<Me>('/v1/me');
      next.current = me.preferences.homeMode ? '/' : '/get-started?as=cared_for';
    }
  };
  return <InviteAccept kind="contact" title={t('invite.contactTitle')} preview={preview} accept={accept} successHref={() => next.current} />;
}
