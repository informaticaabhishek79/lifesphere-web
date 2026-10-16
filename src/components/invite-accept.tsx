'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { useI18n } from '@/i18n';
import { Logo } from './brand';
import { Button, ButtonLink, ErrorNotice, Notice, Spinner } from './ui';

/**
 * Landing page for invite links (`/invite/<kind>#<token>`). The token lives in the URL fragment so it never
 * reaches server logs. If the visitor is not signed in, the token is kept in this tab while they sign in.
 */
export function InviteAccept({
  kind,
  preview,
  accept,
  title,
  successHref,
}: {
  kind: 'contact' | 'household';
  preview?: (token: string) => Promise<React.ReactNode>;
  accept: (token: string) => Promise<unknown>;
  title: string;
  successHref: string;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const storageKey = `ls_invite_${kind}`;
  const [token, setToken] = useState<string | null>(null);
  const [state, setState] = useState<'loading' | 'signed_out' | 'ready' | 'done' | 'error'>('loading');
  const [body, setBody] = useState<React.ReactNode>(null);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let tok = window.location.hash.replace(/^#(token=)?/, '');
    try {
      if (tok) sessionStorage.setItem(storageKey, tok);
      else tok = sessionStorage.getItem(storageKey) ?? '';
    } catch {
      /* storage unavailable: token stays in memory */
    }
    if (window.location.hash) history.replaceState(null, '', window.location.pathname);
    setToken(tok || null);
    if (!tok) {
      setState('error');
      return;
    }
    (async () => {
      try {
        await api.get('/v1/me');
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) {
          setState('signed_out');
          return;
        }
      }
      try {
        if (preview) setBody(await preview(tok));
        setState('ready');
      } catch (e) {
        setError(e);
        setState('error');
      }
    })();
  }, [preview, storageKey]);

  const doAccept = async (yes: boolean) => {
    if (!token) return;
    if (!yes) {
      try {
        sessionStorage.removeItem(storageKey);
      } catch {}
      router.replace('/');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await accept(token);
      try {
        sessionStorage.removeItem(storageKey);
      } catch {}
      setState('done');
      setTimeout(() => router.replace(successHref), 1200);
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-5 py-10">
      <Link href="/" className="mb-8">
        <Logo />
      </Link>
      <div className="card w-full max-w-md p-6">
        <h1 className="font-display text-2xl font-semibold">{title}</h1>
        <div className="mt-4 space-y-4">
          {state === 'loading' && <Spinner label={t('common.loading')} />}
          {state === 'signed_out' && (
            <>
              <p className="text-muted">{t('invite.signInFirst')}</p>
              <ButtonLink href={`/sign-in?next=${encodeURIComponent(`/invite/${kind}`)}`} className="w-full">
                {t('invite.signInToAccept')}
              </ButtonLink>
            </>
          )}
          {state === 'ready' && (
            <>
              {body}
              <ErrorNotice error={error} />
              <div className="flex gap-2">
                <Button variant="secondary" className="flex-1" onClick={() => doAccept(false)}>
                  {t('common.decline')}
                </Button>
                <Button className="flex-1" loading={busy} onClick={() => doAccept(true)}>
                  {t('common.accept')}
                </Button>
              </div>
            </>
          )}
          {state === 'done' && <Notice tone="ok">{t('invite.accepted')}</Notice>}
          {state === 'error' && (
            <>
              {error ? <ErrorNotice error={error} /> : <Notice tone="warn">{t('invite.invalid')}</Notice>}
              <ButtonLink href="/" variant="secondary">
                {t('nav.home')}
              </ButtonLink>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
