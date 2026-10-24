'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Globe, HeartHandshake, Lock, ShieldCheck, Users } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import type { LoginResult, OtpChallenge } from '@/lib/types';
import { useI18n, LANGUAGE_OPTIONS, type Locale } from '@/i18n';
import { Logo } from '@/components/brand';
import { Button, ErrorNotice, Notice } from '@/components/ui';
import { Checkbox, Input, Segmented } from '@/components/form';
import { PhoneInput, useDetectedCountry } from '@/components/phone';

const POLICY_VERSION = '2026-10';
const GOOGLE_NOTICES = new Set(['signup', 'failed', 'cancelled', 'disabled', 'unavailable']);

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
  const [country, setCountryState] = useDetectedCountry();
  const setCountry = (c: string) => {
    setCountryState(c);
    document.cookie = `ls_region=${c}; path=/; max-age=31536000; samesite=lax`;
  };
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
  const googleResult = params.get('google');
  const [notice, setNotice] = useState<string | null>(
    params.get('expired') ? t('auth.sessionExpired') : googleResult && GOOGLE_NOTICES.has(googleResult) ? t(`auth.google.${googleResult}` as 'auth.google.failed') : null,
  );
  const health = useQuery({
    queryKey: ['health'],
    queryFn: () => api.get<{ integrations: Record<string, string> }>('/v1/health/ready'),
    staleTime: 10 * 60_000,
    retry: false,
  });
  const googleOn = health.data?.integrations?.googleSignIn === 'on';
  const smsByWhatsApp = (health.data?.integrations?.sms ?? '').includes('whatsapp');
  const [cooldown, setCooldown] = useState(0);
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  // Back from Google with a second step to do: the token arrives in the address fragment, which never reaches a server.
  useEffect(() => {
    const m = /[#&]mfa=([^&]+)/.exec(window.location.hash);
    if (m) {
      setMfaToken(decodeURIComponent(m[1]));
      setStep('mfa');
      history.replaceState(null, '', window.location.pathname + window.location.search);
    }
    if (googleResult === 'signup') setIsNew(true);
  }, [googleResult]);

  useEffect(() => {
    if (step === 'code') codeRef.current?.focus();
  }, [step]);

  const signupValid = !isNew || (displayName.trim().length > 0 && ageConfirmed && policyAccepted);

  async function sendCode(e?: React.FormEvent) {
    e?.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const ch = await api.post<OtpChallenge>('/v1/auth/otp/request', { channel, destination: destination.trim(), ...(channel === 'sms' ? { country } : {}) });
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
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || undefined,
        locale,
        country,
        ...(isNew ? { displayName: displayName.trim(), ageConfirmed: true, acceptedPolicyVersion: POLICY_VERSION } : {}),
      });
      if (res.status === 'mfa_required') {
        setMfaToken(res.mfaToken);
        setStep('mfa');
      } else {
        // A brand-new account starts with the short "what is LifeSphere for?" setup, unless it came from an invite link.
        router.replace(res.user.isNew && safeNext === '/' ? '/get-started' : safeNext);
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

  const googleReady = !isNew || (ageConfirmed && policyAccepted);
  function continueWithGoogle() {
    const q = new URLSearchParams({ locale, tz: Intl.DateTimeFormat().resolvedOptions().timeZone || '' });
    if (safeNext !== '/') q.set('next', safeNext);
    if (isNew) {
      q.set('new', '1');
      q.set('age', '1');
      q.set('policy', POLICY_VERSION);
    }
    setBusy(true);
    window.location.assign(`/auth/google?${q}`);
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
      <aside className="relative hidden overflow-hidden bg-[#062f2d] text-white lg:flex lg:flex-col lg:gap-10 lg:px-12 lg:pt-12">
        {/* An evening neighbourhood: a mother checks in from her balcony, her son walks home, a neighbour waves. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/sign-in-sky.svg" alt="" aria-hidden className="pointer-events-none absolute inset-0 size-full object-cover object-top" />
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_75%_45%_at_50%_100%,rgb(243_166_96/0.85),rgb(201_112_63/0.35)_45%,transparent_75%)]" />
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
        <div className="relative max-w-lg [text-shadow:0_1px_12px_rgb(3_30_28/0.6)]">
          <h1 className="font-display text-[2.6rem] leading-[1.08] font-semibold">{t('app.tagline')}</h1>
          <ul className="mt-8 space-y-4 text-[1.02rem] text-white/95">
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
        <div aria-hidden className="relative -mx-12 min-h-[200px] flex-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/sign-in-town.svg" alt="" className="pointer-events-none absolute inset-0 size-full object-cover object-bottom" />
        </div>
        <div className="absolute end-6 bottom-1.5 text-xs text-white/60">© {new Date().getFullYear()} LifeSphere</div>
      </aside>

      {/* Form */}
      <main className="flex flex-col px-5 py-6 sm:px-10">
        <div className="flex items-center justify-between">
          <Logo className="lg:invisible" />
          <label className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-semibold text-muted focus-within:text-ink hover:text-ink">
            <Globe className="size-4" aria-hidden />
            <span className="sr-only">{t('common.language')}</span>
            <select value={locale} onChange={(e) => void setLocale(e.target.value as Locale)} className="cursor-pointer bg-transparent font-semibold text-ink focus:outline-none">
              {LANGUAGE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        {/* Phones and tablets: a strip of the same neighbourhood scene above the form. */}
        <div aria-hidden className="relative mt-5 h-32 overflow-hidden rounded-2xl bg-[#062f2d] sm:h-40 lg:hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/sign-in-sky.svg" alt="" className="absolute inset-0 size-full object-cover object-top" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_70%_at_50%_100%,rgb(243_166_96/0.8),rgb(201_112_63/0.3)_45%,transparent_75%)]" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/sign-in-town.svg" alt="" className="absolute inset-0 size-full object-cover object-bottom" />
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
                <PhoneInput label={t('auth.phoneLabel')} hint={t('auth.phoneHint')} value={destination} onChange={setDestination} country={country} onCountryChange={setCountry} required />
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
              {googleOn && (
                <>
                  <div className="flex items-center gap-3 text-sm text-muted" aria-hidden>
                    <span className="h-px flex-1 bg-line" />
                    {t('auth.google.or')}
                    <span className="h-px flex-1 bg-line" />
                  </div>
                  <Button type="button" variant="secondary" size="lg" className="w-full" disabled={busy || !googleReady} onClick={continueWithGoogle}>
                    <GoogleMark />
                    {t('auth.google.button')}
                  </Button>
                  {isNew && !googleReady && <p className="text-sm text-muted">{t('auth.google.needBoxes')}</p>}
                </>
              )}
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
                <p className="mt-2 text-muted">{t(channel === 'sms' && smsByWhatsApp ? 'auth.codeSentWhatsApp' : 'auth.codeSentTo', { to: challenge.sentTo })}</p>
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

function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" className="size-5" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

export default function SignInPage() {
  return (
    <Suspense>
      <SignInInner />
    </Suspense>
  );
}
