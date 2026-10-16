'use client';

import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import type { OtpChallenge } from '@/lib/types';
import { useI18n } from '@/i18n';
import { Dialog } from './dialog';
import { Input, Segmented } from './form';
import { Button, ErrorNotice, Notice } from './ui';

type Runner = <T>(fn: () => Promise<T>) => Promise<T>;
const ReauthContext = createContext<Runner>((fn) => fn());

/**
 * Sensitive actions (changing contact details, two-step settings, account deletion, staff tools) need a
 * recent confirmation. `withReauth(fn)` runs fn; if the API asks for re-authentication it shows the
 * confirm-it's-you dialog and then retries once.
 */
export function ReauthProvider({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState<'sms' | 'email' | 'totp'>('sms');
  const [challenge, setChallenge] = useState<OtpChallenge | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const pending = useRef<{ resolve: () => void; reject: (e: unknown) => void } | null>(null);

  const reset = () => {
    setChallenge(null);
    setCode('');
    setError(null);
    setBusy(false);
  };

  const ask = () =>
    new Promise<void>((resolve, reject) => {
      pending.current = { resolve, reject };
      reset();
      setOpen(true);
    });

  const withReauth: Runner = useCallback(async (fn) => {
    try {
      return await fn();
    } catch (e) {
      if (e instanceof ApiError && e.code === 'reauth_required') {
        await ask();
        return fn();
      }
      throw e;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const close = () => {
    setOpen(false);
    pending.current?.reject(new ApiError({ status: 403, code: 'reauth_required', detail: t('errors.reauth_required') }));
    pending.current = null;
  };

  const send = async () => {
    setBusy(true);
    setError(null);
    try {
      setChallenge(await api.post<OtpChallenge>('/v1/auth/reauth/request', { channel: method }));
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.post('/v1/auth/reauth/verify', method === 'totp' ? { totpCode: code } : { challengeId: challenge?.challengeId, code });
      setOpen(false);
      pending.current?.resolve();
      pending.current = null;
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  };

  const needsCode = method === 'totp' || !!challenge;
  return (
    <ReauthContext.Provider value={withReauth}>
      {children}
      <Dialog
        open={open}
        onClose={close}
        title={t('reauth.title')}
        description={t('reauth.body')}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={close}>
              {t('common.cancel')}
            </Button>
            {needsCode ? (
              <Button onClick={verify} loading={busy} disabled={code.length !== 6}>
                {t('reauth.verify')}
              </Button>
            ) : (
              <Button onClick={send} loading={busy}>
                {t('reauth.send')}
              </Button>
            )}
          </>
        }
      >
        <div className="space-y-4">
          <Segmented
            value={method}
            onChange={(m) => {
              setMethod(m);
              reset();
            }}
            options={[
              { value: 'sms', label: t('auth.phoneTab') },
              { value: 'email', label: t('auth.emailTab') },
              { value: 'totp', label: t('auth.mfaCode') },
            ]}
          />
          {challenge && <p className="text-sm text-muted">{t('auth.codeSentTo', { to: challenge.sentTo })}</p>}
          {challenge?.devCode && <Notice tone="warn">{t('auth.devCode', { code: challenge.devCode })}</Notice>}
          {needsCode && (
            <Input
              label={method === 'totp' ? t('auth.mfaCode') : t('auth.codeLabel')}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              className="text-center text-xl tracking-[0.4em]"
              autoFocus
            />
          )}
          <ErrorNotice error={error} />
        </div>
      </Dialog>
    </ReauthContext.Provider>
  );
}

export const useReauth = () => useContext(ReauthContext);
