'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';
import { HeartHandshake, Lock, ShieldCheck, Users } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import type { LoginResult, OtpChallenge } from '@/lib/types';
import { useI18n, LOCALES } from '@/i18n';
import { Logo } from '@/components/brand';
import { Button, ErrorNotice, Notice } from '@/components/ui';
import { Checkbox, Input, Segmented } from '@/components/form';

const SIGNUP_CODES = new Set(['age_confirmation_required', 'policy_acceptance_required', 'display_name_required']);

function deviceName() {
  if (typeof navigator === 'undefined') return 'Web browser';
  const ua = navigator.userAgent;
  const browser = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'Browser';
  const os = /Windows/.test(ua) ? 'Windows' : /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS' : /Mac OS/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : '';
  return os ? `${browser} on ${os}` : browser;
}

function SignInInner() {
  const { t, locale, setLocale } = useI18n();
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next');
  const safeNext = next && next.startsWith('/') && !next.startsWith('//') ? next : '/';

  const [step, setStep] = useState<'start' | 'code' | 'mfa'>('start');
  const [channel, setChannel] = useState<'sms' | 'email'>('sms');
  const [destination, setDestination] = useState('');
  const [isNew, setIsNew] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [policyAccepted, setPolicyAccepted] = useState(false);
  const [challenge, setChallenge] = useState<OtpChallenge | null>(null);
  const [code, setCode] = useState('');
  const [mfaToken, setMfaToken] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [useRecovery, setUseRecovery] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [notice, setNotice] = useState<string | null>(params.get('expired') ? t('auth.sessionExpired') : null);
  const [cooldown, setCooldown] = useState(0);
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  useEffect(() => {
    if (step === 'code') codeRef.current?.focus();
  }, [step]);

  const signupValid = !isNew || (displayName.trim().length > 0 && ageConfirmed && policyAccepted);

  async function sendCode(e?: React.FormEvent) {
    e?.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const ch = await api.post<OtpChallenge>('/v1/auth/otp/request', { channel, destination: destination.trim() });
      setChallenge(ch);
      setCode('');
      setStep('code');
      setCooldown(30);
      setNotice(null);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  async function verify(e?: React.FormEvent) {
    e?.preventDefault();
    if (!challenge) return;
    setBusy(true);
    setError(null);
    try {
      const res = await api.post<LoginResult>('/v1/auth/otp/verify', {
        challengeId: challenge.challengeId,
        code: code.trim(),
        deviceName: deviceName(),
        platform: 'web',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata',
        locale: locale === 'hi' ? 'hi-IN' : 'en-IN',
        ...(isNew ? { displayName: displayName.trim(), ageConfirmed: true, acceptedPolicyVersion: '2026-10' } : {}),
      });
      if (res.status === 'mfa_required') {
        setMfaToken(res.mfaToken);
        setStep('mfa');
      } else {
        router.replace(safeNext);
        router.refresh();
      }
    } catch (err) {
      if (err instanceof ApiError && SIGNUP_CODES.has(err.code)) {
        // The code was used up proving the number; collect sign-up details and send a fresh one.
        setIsNew(true);
        setStep('start');
        setNotice(t('auth.signupNeeded'));
      } else setError(err);
    } finally {
      setBusy(false);
    }
  }

  async function verifyMfa(e?: React.FormEvent) {
    e?.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.post<LoginResult>('/v1/auth/mfa/verify', useRecovery ? { mfaToken, recoveryCode: mfaCode.trim() } : { mfaToken, code: mfaCode.trim() });
      router.replace(safeNext);
      router.refresh();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      {/* Brand panel */}
      <aside className="relative hidden overflow-hidden bg-brand text-brand-ink lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div aria-hidden className="pointer-events-none absolute -top-24 -right-24 size-[28rem] rounded-full bg-white/8" />
        <div aria-hidden className="pointer-events-none absolute bottom-[-10rem] left-[-6rem] size-[30rem] rounded-full border-[3rem] border-white/6" />
        <div aria-hidden className="pointer-events-none absolute top-[18%] right-20 size-20 rounded-full bg-accent/80" />
        <div className="relative">
          <span className="inline-flex items-center gap-2.5">
            <svg viewBox="0 0 40 40" className="size-10" aria-hidden>
              <circle cx="20" cy="20" r="18" fill="white" fillOpacity=".14" />
              <circle cx="20" cy="20" r="8.5" fill="white" />
              <circle cx="20" cy="20" r="3.4" fill="var(--accent)" />
            </svg>
            <span className="font-display text-2xl font-semibold">LifeSphere</span>
          </span>
        </div>
        <div className="relative max-w-lg">
          <h1 className="font-display text-[2.8rem] leading-[1.08] font-semibold">{t('app.tagline')}</h1>
          <ul className="mt-10 space-y-5 text-[1.02rem] text-white/90">
            <li className="flex gap-3">
              <HeartHandshake className="mt-0.5 size-5 shrink-0" aria-hidden />
              <span>{t('auth.pitchFamily')}</span>
            </li>
            <li className="flex gap-3">
              <Users className="mt-0.5 size-5 shrink-0" aria-hidden />
              <span>{t('auth.pitchCommunity')}</span>
            </li>
            <li className="flex gap-3">
              <Lock className="mt-0.5 size-5 shrink-0" aria-hidden />
              <span>{t('auth.privacyPromise')}</span>
            </li>
          </ul>
        </div>
        <div className="relative text-sm text-white/70">© {new Date().getFullYear()} LifeSphere</div>
      </aside>

      {/* Form */}
      <main className="flex flex-col px-5 py-6 sm:px-10">
        <div className="flex items-center justify-between">
          <Logo className="lg:invisible" />
          <div className="flex gap-1">
            {LOCALES.map((l) => (
              <button
                key={l.code}
                type="button"
                onClick={() => setLocale(l.code)}
                aria-pressed={locale === l.code}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${locale === l.code ? 'bg-brand-soft text-brand' : 'text-muted hover:text-ink'}`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
          {step === 'start' && (
            <form onSubmit={sendCode} className="rise space-y-5">
              <div>
                <h2 className="font-display text-3xl font-semibold">{t('auth.title')}</h2>
                <p className="mt-2 text-muted">{t('auth.subtitle')}</p>
              </div>
              {notice && <Notice tone="info">{notice}</Notice>}
              <Segmented
                value={channel}
                onChange={(v) => {
                  setChannel(v);
                  setDestination('');
                }}
                options={[
                  { value: 'sms', label: t('auth.phoneTab') },
                  { value: 'email', label: t('auth.emailTab') },
                ]}
              />
              {channel === 'sms' ? (
                <Input
                  label={t('auth.phoneLabel')}
                  hint={t('auth.phoneHint')}
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="98765 43210"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  required
                  className="h-13 text-lg tracking-wide"
                />
              ) : (
                <Input
                  label={t('auth.emailLabel')}
                  type="email"
                  autoComplete="email"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  required
                  className="h-13 text-lg"
                />
              )}

              <div className="rounded-2xl border border-line bg-surface p-4">
                <Checkbox label={t('auth.newAccountToggle')} hint={!isNew ? t('auth.newAccountBody') : undefined} checked={isNew} onChange={setIsNew} />
                {isNew && (
                  <div className="mt-4 space-y-4 border-t border-line pt-4">
                    <Input label={t('auth.displayName')} hint={t('auth.displayNameHint')} value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={80} autoComplete="given-name" />
                    <Checkbox label={t('auth.ageConfirm')} checked={ageConfirmed} onChange={setAgeConfirmed} />
                    <Checkbox
                      label={t('auth.policyAccept')}
                      hint={
                        <Link href="/privacy-notice" target="_blank" className="font-semibold text-brand underline">
                          {t('auth.readPrivacy')}
                        </Link>
                      }
                      checked={policyAccepted}
                      onChange={setPolicyAccepted}
                    />
                  </div>
                )}
              </div>

              <ErrorNotice error={error} />
              <Button type="submit" size="lg" className="w-full" loading={busy} disabled={!destination.trim() || !signupValid}>
                {busy ? t('auth.sending') : t('auth.sendCode')}
              </Button>
              <p className="flex items-start gap-2 text-sm text-muted">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-ok" aria-hidden />
                {t('auth.privacyPromise')}
              </p>
            </form>
          )}

          {step === 'code' && challenge && (
            <form onSubmit={verify} className="rise space-y-5">
              <div>
                <h2 className="font-display text-3xl font-semibold">{t('auth.codeLabel')}</h2>
                <p className="mt-2 text-muted">{t('auth.codeSentTo', { to: challenge.sentTo })}</p>
              </div>
              {challenge.devCode && (
                <Notice tone="warn">
                  {t('auth.devCode', { code: challenge.devCode })}{' '}
                  <button type="button" className="font-semibold underline" onClick={() => setCode(challenge.devCode!)}>
                    {t('common.add')}
                  </button>
                </Notice>
              )}
              <Input
                ref={codeRef}
                label={t('auth.codeLabel')}
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]*"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                className="h-14 text-center text-2xl font-semibold tracking-[0.5em]"
                required
              />
              <ErrorNotice error={error} />
              <Button type="submit" size="lg" className="w-full" loading={busy} disabled={code.length < 4}>
                {busy ? t('auth.verifying') : t('auth.verify')}
              </Button>
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <button type="button" className="font-semibold text-brand disabled:text-muted" disabled={cooldown > 0 || busy} onClick={() => sendCode()}>
                  {cooldown > 0 ? t('auth.resendIn', { s: cooldown }) : t('auth.resend')}
                </button>
                <button
                  type="button"
                  className="font-semibold text-muted hover:text-ink"
                  onClick={() => {
                    setStep('start');
                    setError(null);
                  }}
                >
                  {t('auth.changeNumber')}
                </button>
              </div>
            </form>
          )}

          {step === 'mfa' && (
            <form onSubmit={verifyMfa} className="rise space-y-5">
              <div>
                <h2 className="font-display text-3xl font-semibold">{t('auth.mfaTitle')}</h2>
                <p className="mt-2 text-muted">{t('auth.mfaBody')}</p>
              </div>
              <Input
                label={useRecovery ? t('auth.recoveryCode') : t('auth.mfaCode')}
                inputMode={useRecovery ? 'text' : 'numeric'}
                autoComplete="one-time-code"
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value)}
                className="h-14 text-center text-xl font-semibold tracking-[0.3em]"
                autoFocus
                required
              />
              <ErrorNotice error={error} />
              <Button type="submit" size="lg" className="w-full" loading={busy} disabled={!mfaCode.trim()}>
                {t('auth.verify')}
              </Button>
              <button
                type="button"
                className="text-sm font-semibold text-brand"
                onClick={() => {
                  setUseRecovery(!useRecovery);
                  setMfaCode('');
                }}
              >
                {useRecovery ? t('auth.useAuthenticator') : t('auth.useRecovery')}
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense>
      <SignInInner />
    </Suspense>
  );
}
