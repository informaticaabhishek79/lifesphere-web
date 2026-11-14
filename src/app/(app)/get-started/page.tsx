'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js/min';
import { ArrowLeft, Check, HeartHandshake, HeartPulse, LayoutGrid, MessageCircle, Pill, Plus, Trash2, UserPlus } from 'lucide-react';
import { api } from '@/lib/api';
import { useContacts } from '@/lib/data';
import { useSession } from '@/lib/session';
import type { Contact, ContactInvitation, HomeMode } from '@/lib/types';
import { useI18n } from '@/i18n';
import { Checkbox, CheckboxGroup, Input, Segmented, Switch } from '@/components/form';
import { PhoneInput, useDetectedCountry } from '@/components/phone';
import { useReauth } from '@/components/reauth';
import { InviteLinkNotice } from '@/components/invite-link';
import { Button, Card, cx, ErrorNotice, LoadingBlock, Notice } from '@/components/ui';

type Step = 'who' | 'invite' | 'alerts' | 'invited' | 'circle' | 'checkin' | 'medicines' | 'help';
const CARE_STEPS: Step[] = ['circle', 'checkin', 'medicines', 'help'];
const CAREGIVER_STEPS: Step[] = ['invite', 'alerts', 'invited'];
const ASK_DEFAULT = ['checkins.view', 'checkins.alerts', 'help.alerts', 'calendar.view'];
const ASK_ALL = ['checkins.view', 'checkins.alerts', 'help.alerts', 'help.location', 'calendar.view'];
const SLOTS = [
  { key: 'morning', time: '08:00' },
  { key: 'afternoon', time: '14:00' },
  { key: 'evening', time: '18:00' },
  { key: 'night', time: '21:00' },
] as const;

interface Medicine {
  name: string;
  times: string[];
}

function toE164(value: string, country: string) {
  const p = parsePhoneNumberFromString(value.trim(), value.trim().startsWith('+') ? undefined : (country as CountryCode));
  return p?.isValid() ? p.number : null;
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}

function StepShell({ title, intro, children, onBack, progress }: { title: React.ReactNode; intro?: React.ReactNode; children: React.ReactNode; onBack?: () => void; progress?: [number, number] }) {
  const { t } = useI18n();
  return (
    <div className="mx-auto max-w-xl rise">
      <div className="mb-5 flex items-center justify-between gap-3">
        {onBack ? (
          <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
            <ArrowLeft className="flip-rtl size-4" /> {t('common.back')}
          </button>
        ) : (
          <span />
        )}
        {progress && (
          <span className="flex items-center gap-1.5" aria-label={t('care.setup.progress', { n: progress[0], total: progress[1] })}>
            {Array.from({ length: progress[1] }, (_, i) => (
              <span key={i} className={cx('h-1.5 rounded-full transition-all', i < progress[0] ? 'w-6 bg-brand' : 'w-3 bg-line-strong')} />
            ))}
          </span>
        )}
      </div>
      <h1 className="font-display text-[1.9rem] leading-tight font-semibold sm:text-[2.2rem]">{title}</h1>
      {intro && <p className="mt-2 text-[1.02rem] text-ink-2">{intro}</p>}
      <div className="mt-6 space-y-5">{children}</div>
    </div>
  );
}

function Choice({ icon, title, body, onClick, testId }: { icon: React.ReactNode; title: string; body: string; onClick: () => void; testId: string }) {
  return (
    <button type="button" onClick={onClick} data-testid={testId} className="card flex w-full items-start gap-4 p-5 text-start transition hover:border-brand/50 hover:shadow-md">
      <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand">{icon}</span>
      <span className="min-w-0">
        <span className="font-display block text-lg font-semibold">{title}</span>
        <span className="mt-0.5 block text-sm text-ink-2">{body}</span>
      </span>
    </button>
  );
}

function GetStarted() {
  const { t } = useI18n();
  const { me } = useSession();
  const router = useRouter();
  const params = useSearchParams();
  const qc = useQueryClient();
  const withReauth = useReauth();
  const contacts = useContacts();

  const only = params.get('step') as Step | null;
  const initialAs = (params.get('as') as HomeMode | null) ?? (only === 'invite' ? 'caregiver' : null);
  const [step, setStep] = useState<Step>(only ?? (initialAs === 'cared_for' ? 'circle' : initialAs === 'caregiver' ? 'invite' : 'who'));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const go = (s: Step) => {
    setError(null);
    setStep(s);
    window.scrollTo({ top: 0 });
  };
  const finish = async () => {
    await qc.invalidateQueries({ queryKey: ['me'] });
    qc.invalidateQueries({ queryKey: ['care'] });
    router.replace('/home');
  };
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  };
  const setMode = (mode: HomeMode) => api.post('/v1/care/mode', { mode });

  // ---------------------------------------------------------------- caregiver: invite
  const [country, setCountry] = useDetectedCountry();
  const [phone, setPhone] = useState('');
  const [inviteBy, setInviteBy] = useState<'phone' | 'email'>('phone');
  const [email, setEmail] = useState('');
  const [label, setLabel] = useState('');
  const [ask, setAsk] = useState<string[]>(ASK_DEFAULT);
  const [message, setMessage] = useState(() => t('care.invite.defaultMessage', { name: me.profile.displayName }));
  const [link, setLink] = useState<string | null>(null);
  const suggestions = t('care.invite.labelSuggestions').split(/[,،]/).map((s) => s.trim()).filter(Boolean);
  const phoneE164 = toE164(phone, country);
  const inviteTarget = inviteBy === 'phone' ? (phoneE164 ? { phone: phoneE164 } : null) : isEmail(email) ? { email: email.trim() } : null;
  const who = label.trim() || t('care.invite.them');

  // ---------------------------------------------------------------- caregiver: alerts
  const [sms, setSms] = useState(true);
  const [bypass, setBypass] = useState(true);

  // ---------------------------------------------------------------- cared-for: circle
  const [share, setShare] = useState<Record<string, string[]>>({});
  const [invitePhone, setInvitePhone] = useState('');
  const [circleBy, setCircleBy] = useState<'phone' | 'email'>('phone');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [invitedLink, setInvitedLink] = useState<string | null>(null);
  const [invitedNames, setInvitedNames] = useState<string[]>([]);
  const list: Contact[] = useMemo(() => contacts.data ?? [], [contacts.data]);
  useEffect(() => {
    if (!contacts.data) return;
    setShare((cur) => {
      const next = { ...cur };
      for (const c of contacts.data!) if (!next[c.contactUserId]) next[c.contactUserId] = c.iShare.map((g) => g.scope);
      return next;
    });
  }, [contacts.data]);
  const alertIds = list.filter((c) => (share[c.contactUserId] ?? []).includes('checkins.alerts')).map((c) => c.contactUserId);
  const alertNames = [...list.filter((c) => alertIds.includes(c.contactUserId)).map((c) => c.label || c.displayName), ...invitedNames];

  // ---------------------------------------------------------------- cared-for: day
  const [checkInTime, setCheckInTime] = useState<string | null>('10:00');
  const [consent, setConsent] = useState(true);
  const [meds, setMeds] = useState<Medicine[]>([{ name: '', times: ['08:00'] }]);
  const [medAlerts, setMedAlerts] = useState(true);
  // undefined = not chosen yet (defaults to the first person who gets alerts); null = only the emergency number.
  const [firstCall, setFirstCall] = useState<string | null | undefined>(undefined);
  const [larger, setLarger] = useState(true);
  const [focus, setFocus] = useState(true);
  useEffect(() => {
    if (firstCall === undefined && alertIds[0]) setFirstCall(alertIds[0]);
  }, [alertIds, firstCall]);

  const careIndex = CARE_STEPS.indexOf(step);
  const giverIndex = CAREGIVER_STEPS.indexOf(step);
  const progress: [number, number] | undefined = only ? undefined : careIndex >= 0 ? [careIndex + 1, CARE_STEPS.length] : giverIndex >= 0 ? [giverIndex + 1, CAREGIVER_STEPS.length] : undefined;
  const back = (s: Step) => (only ? () => router.back() : () => go(s));
  const cleanMeds = meds.map((m) => ({ name: m.name.trim(), times: m.times })).filter((m) => m.name && m.times.length);

  const saveCare = (extra: Record<string, unknown>) =>
    run(async () => {
      await api.post('/v1/care/setup', {
        alertContactIds: alertIds,
        consentToAlertContacts: consent && (alertIds.length > 0 || invitedNames.length > 0) ? true : undefined,
        ...extra,
      });
      await finish();
    });

  if (contacts.isLoading && (step === 'circle' || step === 'help')) return <LoadingBlock rows={3} />;

  // ================================================================ screens
  if (step === 'who') {
    return (
      <StepShell title={t('care.setup.whoTitle')} intro={t('care.setup.whoIntro')}>
        <Choice testId="mode-caregiver" icon={<HeartHandshake className="size-6" />} title={t('care.setup.caregiver')} body={t('care.setup.caregiverBody')} onClick={() => go('invite')} />
        <Choice testId="mode-cared-for" icon={<HeartPulse className="size-6" />} title={t('care.setup.caredFor')} body={t('care.setup.caredForBody')} onClick={() => go('circle')} />
        <Choice testId="mode-standard" icon={<LayoutGrid className="size-6" />} title={t('care.setup.standard')} body={t('care.setup.standardBody')} onClick={() => run(async () => { await setMode('standard'); await finish(); })} />
        <ErrorNotice error={error} />
      </StepShell>
    );
  }

  if (step === 'invite') {
    return (
      <StepShell title={t('care.invite.title')} intro={t('care.invite.intro')} onBack={only ? undefined : back('who')} progress={progress}>
        {link ? (
          <>
            <InviteLinkNotice link={link} title={t('care.invite.sent', { name: who })} />
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`${message}\n${link}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-13 w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-5 font-semibold text-white hover:brightness-95"
            >
              <MessageCircle className="size-5" /> {t('care.invite.whatsapp')}
            </a>
            <Button size="lg" className="w-full" onClick={() => (only ? finish() : go('alerts'))}>
              {t('common.next')}
            </Button>
          </>
        ) : (
          <>
            <div>
              <Input label={t('care.invite.labelLabel')} hint={t('care.invite.labelHint')} value={label} onChange={(e) => setLabel(e.target.value)} maxLength={40} />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {suggestions.map((s) => (
                  <button key={s} type="button" onClick={() => setLabel(s)} className={cx('rounded-full border px-3 py-1 text-sm font-medium', label === s ? 'border-brand bg-brand-soft text-brand' : 'border-line hover:bg-surface-2')}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <Segmented
              value={inviteBy}
              onChange={setInviteBy}
              options={[
                { value: 'phone', label: t('care.invite.byPhone') },
                { value: 'email', label: t('care.invite.byEmail') },
              ]}
            />
            {inviteBy === 'phone' ? (
              <PhoneInput label={t('care.invite.phoneLabel', { name: who })} hint={t('care.invite.phoneHint')} value={phone} onChange={setPhone} country={country} onCountryChange={setCountry} required />
            ) : (
              <Input label={t('care.invite.emailLabel', { name: who })} hint={t('care.invite.emailHint')} type="email" autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={254} required />
            )}
            <CheckboxGroup
              label={t('care.invite.askLabel', { name: who })}
              hint={t('care.invite.askHint')}
              value={ask}
              onChange={setAsk}
              options={ASK_ALL.map((s) => ({ value: s, label: t(`care.ask.${s.replace('.', '_')}`) }))}
            />
            <Input label={t('care.invite.messageLabel')} value={message} onChange={(e) => setMessage(e.target.value)} maxLength={300} />
            <ErrorNotice error={error} />
            <Button
              size="lg"
              className="w-full"
              icon={<UserPlus className="size-5" />}
              loading={busy}
              disabled={!inviteTarget || ask.length === 0}
              onClick={() =>
                run(async () => {
                  if (me.preferences.homeMode !== 'caregiver' && me.preferences.homeMode !== 'cared_for') await setMode('caregiver');
                  const r = await api.post<ContactInvitation>('/v1/contacts/invitations', { ...inviteTarget, label: label.trim() || undefined, message: message.trim() || undefined, requestedScopes: ask });
                  qc.invalidateQueries({ queryKey: ['me'] });
                  qc.invalidateQueries({ queryKey: ['care'] });
                  setLink(r.inviteLink ?? null);
                  if (!r.inviteLink) go('alerts');
                })
              }
            >
              {t('care.invite.send')}
            </Button>
          </>
        )}
      </StepShell>
    );
  }

  if (step === 'alerts') {
    return (
      <StepShell title={t('care.alerts.title')} intro={t('care.alerts.intro', { name: who })} onBack={back('invite')} progress={progress}>
        <Card className="space-y-4 p-5">
          <Switch label={t('care.alerts.sms')} hint={t('care.alerts.smsHint')} checked={sms} onChange={setSms} />
          <Switch label={t('care.alerts.bypass')} hint={t('care.alerts.bypassHint')} checked={bypass} onChange={setBypass} />
        </Card>
        <ErrorNotice error={error} />
        <Button
          size="lg"
          className="w-full"
          loading={busy}
          onClick={() =>
            run(async () => {
              await api.put('/v1/notifications/preferences', {
                items: ['checkins', 'help'].map((category) => ({ category, inApp: true, push: true, email: true, sms, bypassQuietHours: bypass })),
              });
              go('invited');
            })
          }
        >
          {t('common.next')}
        </Button>
      </StepShell>
    );
  }

  if (step === 'invited') {
    const steps = [t('care.next.one', { name: who }), t('care.next.two', { name: who }), t('care.next.three', { name: who })];
    return (
      <StepShell title={t('care.next.title')} progress={progress}>
        <ol className="space-y-3">
          {steps.map((s, i) => (
            <li key={i} className="card flex items-start gap-3 p-4">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-bold text-brand-ink">{i + 1}</span>
              <span className="pt-1 text-ink-2">{s}</span>
            </li>
          ))}
        </ol>
        <Notice tone="info">{t('care.next.privacy', { name: who })}</Notice>
        <Button size="lg" className="w-full" onClick={finish}>
          {t('care.next.goHome')}
        </Button>
      </StepShell>
    );
  }

  if (step === 'circle') {
    const scopes = ['checkins.view', 'checkins.alerts', 'help.alerts'];
    const toAdd = list.flatMap((c) => (share[c.contactUserId] ?? []).filter((s) => !c.iShare.some((g) => g.scope === s)).map((s) => ({ c, s })));
    return (
      <StepShell title={t('care.circle.title')} intro={t('care.circle.intro')} onBack={only ? undefined : back('who')} progress={progress}>
        {list.map((c) => (
          <Card key={c.contactUserId} className="space-y-3 p-5">
            <div className="font-display text-lg font-semibold">{c.label || c.displayName}</div>
            {scopes.map((s) => {
              const given = c.iShare.find((g) => g.scope === s);
              const on = (share[c.contactUserId] ?? []).includes(s);
              return (
                <Checkbox
                  key={s}
                  label={t(`care.share.${s.replace('.', '_')}`, { name: c.label || c.displayName })}
                  hint={given ? (given.status === 'active' ? t('care.circle.alreadyShared') : t('care.circle.startsSoon')) : undefined}
                  checked={on}
                  disabled={!!given}
                  onChange={(v) => setShare({ ...share, [c.contactUserId]: v ? [...(share[c.contactUserId] ?? []), s] : (share[c.contactUserId] ?? []).filter((x) => x !== s) })}
                />
              );
            })}
          </Card>
        ))}

        <Card className="space-y-4 p-5">
          <div className="font-display text-lg font-semibold">{list.length ? t('care.circle.addAnother') : t('care.circle.addFirst')}</div>
          {invitedLink ? (
            <>
              <InviteLinkNotice link={invitedLink} />
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setInvitedLink(null);
                  setInvitePhone('');
                  setInviteEmail('');
                  setInviteName('');
                }}
              >
                {t('care.circle.inviteMore')}
              </Button>
            </>
          ) : (
            <>
              <Input label={t('care.circle.nameLabel')} value={inviteName} onChange={(e) => setInviteName(e.target.value)} maxLength={40} />
              <Segmented
                value={circleBy}
                onChange={setCircleBy}
                options={[
                  { value: 'phone', label: t('care.invite.byPhone') },
                  { value: 'email', label: t('care.invite.byEmail') },
                ]}
              />
              {circleBy === 'phone' ? (
                <PhoneInput label={t('auth.phoneLabel')} value={invitePhone} onChange={setInvitePhone} country={country} onCountryChange={setCountry} />
              ) : (
                <Input label={t('auth.emailLabel')} type="email" autoComplete="off" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} maxLength={254} />
              )}
              <p className="text-sm text-muted">{t('care.circle.inviteHint')}</p>
              <Button
                variant="secondary"
                icon={<UserPlus className="size-4" />}
                loading={busy}
                disabled={circleBy === 'phone' ? !toE164(invitePhone, country) : !isEmail(inviteEmail)}
                onClick={() =>
                  run(async () => {
                    const r = await api.post<ContactInvitation>('/v1/contacts/invitations', { ...(circleBy === 'phone' ? { phone: toE164(invitePhone, country) } : { email: inviteEmail.trim() }), label: inviteName.trim() || undefined, proposedScopes: scopes });
                    setInvitedNames([...invitedNames, inviteName.trim() || t('care.invite.them')]);
                    setInvitedLink(r.inviteLink ?? null);
                  })
                }
              >
                {t('care.circle.invite')}
              </Button>
            </>
          )}
        </Card>
        <ErrorNotice error={error} />
        <Button
          size="lg"
          className="w-full"
          loading={busy}
          onClick={() =>
            run(async () => {
              const by = new Map<string, string[]>();
              for (const { c, s } of toAdd) by.set(c.contactUserId, [...(by.get(c.contactUserId) ?? []), s]);
              for (const [granteeId, sc] of by) await withReauth(() => api.post('/v1/grants', { granteeId, scopes: sc }));
              if (by.size) await qc.invalidateQueries({ queryKey: ['contacts'] });
              if (only) await finish();
              else go('checkin');
            })
          }
        >
          {toAdd.length ? t('care.circle.shareAndNext') : t('common.next')}
        </Button>
      </StepShell>
    );
  }

  if (step === 'checkin') {
    return (
      <StepShell title={t('care.checkin.title')} intro={t('care.checkin.intro')} onBack={back('circle')} progress={progress}>
        <Card className="space-y-4 p-5">
          <div className="flex flex-wrap gap-2">
            {['08:00', '09:00', '10:00', '11:00', '12:00'].map((tm) => (
              <button
                key={tm}
                type="button"
                onClick={() => setCheckInTime(tm)}
                className={cx('rounded-xl border px-4 py-2.5 text-lg font-semibold tabular-nums', checkInTime === tm ? 'border-brand bg-brand text-brand-ink' : 'border-line-strong hover:bg-surface-2')}
                aria-pressed={checkInTime === tm}
              >
                {tm}
              </button>
            ))}
          </div>
          <Input type="time" label={t('care.checkin.otherTime')} value={checkInTime ?? ''} onChange={(e) => setCheckInTime(e.target.value || null)} />
          {alertNames.length > 0 ? (
            <Checkbox label={t('care.checkin.consent', { names: alertNames.join(', ') })} hint={t('care.checkin.consentHint')} checked={consent} onChange={setConsent} />
          ) : (
            <Notice tone="info">{t('care.checkin.noOneYet')}</Notice>
          )}
        </Card>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            onClick={() => {
              setCheckInTime(null);
              go('medicines');
            }}
          >
            {t('care.checkin.skip')}
          </Button>
          <Button size="lg" className="flex-1" disabled={!checkInTime} onClick={() => go('medicines')}>
            {t('common.next')}
          </Button>
        </div>
      </StepShell>
    );
  }

  if (step === 'medicines') {
    const update = (i: number, m: Partial<Medicine>) => setMeds(meds.map((x, j) => (j === i ? { ...x, ...m } : x)));
    return (
      <StepShell title={t('care.meds.title')} intro={t('care.meds.intro')} onBack={only ? () => router.back() : back('checkin')} progress={progress}>
        {meds.map((m, i) => (
          <Card key={i} className="space-y-3 p-5">
            <div className="flex items-end gap-2">
              <Input label={t('care.meds.nameLabel')} placeholder={t('care.meds.namePlaceholder')} value={m.name} onChange={(e) => update(i, { name: e.target.value })} maxLength={60} fieldClassName="flex-1" />
              {meds.length > 1 && (
                <button type="button" onClick={() => setMeds(meds.filter((_, j) => j !== i))} className="mb-1 rounded-lg p-2.5 text-muted hover:bg-bg-2 hover:text-danger" aria-label={t('common.remove')}>
                  <Trash2 className="size-5" />
                </button>
              )}
            </div>
            <div>
              <div className="mb-1.5 text-sm font-semibold">{t('care.meds.when')}</div>
              <div className="flex flex-wrap gap-2">
                {SLOTS.map((s) => {
                  const on = m.times.includes(s.time);
                  return (
                    <button
                      key={s.key}
                      type="button"
                      aria-pressed={on}
                      onClick={() => update(i, { times: on ? m.times.filter((x) => x !== s.time) : [...m.times, s.time].sort() })}
                      className={cx('rounded-xl border px-3.5 py-2 text-start', on ? 'border-accent bg-accent-soft text-accent' : 'border-line-strong hover:bg-surface-2')}
                    >
                      <span className="block font-semibold">{t(`care.meds.slot.${s.key}`)}</span>
                      <span className="block text-xs tabular-nums opacity-80">{s.time}</span>
                    </button>
                  );
                })}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {m.times
                  .filter((x) => !SLOTS.some((s) => s.time === x))
                  .map((x) => (
                    <button key={x} type="button" onClick={() => update(i, { times: m.times.filter((y) => y !== x) })} className="rounded-full border border-accent bg-accent-soft px-3 py-1 text-sm font-semibold text-accent tabular-nums">
                      {x} ×
                    </button>
                  ))}
                <input
                  type="time"
                  aria-label={t('care.meds.otherTime')}
                  className="h-9 rounded-lg border border-line-strong bg-surface px-2 text-sm"
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v && !m.times.includes(v) && m.times.length < 4) update(i, { times: [...m.times, v].sort() });
                    e.target.value = '';
                  }}
                />
              </div>
            </div>
          </Card>
        ))}
        {meds.length < 10 && (
          <Button variant="secondary" icon={<Plus className="size-4" />} onClick={() => setMeds([...meds, { name: '', times: ['08:00'] }])}>
            {t('care.meds.addAnother')}
          </Button>
        )}
        {(alertNames.length > 0 || only) && (
          <Checkbox label={t('care.meds.alerts', { names: alertNames.join(', ') || t('care.meds.yourContacts') })} hint={t('care.meds.alertsHint')} checked={medAlerts} onChange={setMedAlerts} />
        )}
        <Notice tone="info">{t('care.meds.privacy')}</Notice>
        <ErrorNotice error={error} />
        {only ? (
          <Button size="lg" className="w-full" icon={<Pill className="size-5" />} loading={busy} disabled={!cleanMeds.length} onClick={() => saveCare({ medicines: cleanMeds, medicineAlerts: medAlerts, alertContactIds: undefined, consentToAlertContacts: medAlerts || undefined })}>
            {t('care.meds.save')}
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                setMeds([{ name: '', times: ['08:00'] }]);
                go('help');
              }}
            >
              {t('care.meds.none')}
            </Button>
            <Button size="lg" className="flex-1" onClick={() => go('help')}>
              {t('common.next')}
            </Button>
          </div>
        )}
      </StepShell>
    );
  }

  // step === 'help'
  const callable = list.filter((c) => (share[c.contactUserId] ?? []).length > 0 || c.iShare.length > 0);
  return (
    <StepShell title={t('care.helpStep.title')} intro={t('care.helpStep.intro', { number: me.profile.countryDefaults.emergency })} onBack={back('medicines')} progress={progress}>
      {callable.length > 0 && (
        <Card className="space-y-2 p-5">
          <div className="mb-1 font-semibold">{t('care.helpStep.firstCall')}</div>
          {[...callable.map((c) => ({ id: c.contactUserId as string | null, name: c.label || c.displayName })), { id: null, name: t('care.helpStep.onlyEmergency', { number: me.profile.countryDefaults.emergency }) }].map((o) => (
            <label key={o.id ?? 'none'} className={cx('flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3', firstCall === o.id ? 'border-brand bg-brand-soft' : 'border-line')}>
              <input type="radio" name="firstCall" checked={firstCall === o.id} onChange={() => setFirstCall(o.id)} className="size-5 accent-[var(--brand)]" />
              <span className="text-lg font-medium">{o.name}</span>
            </label>
          ))}
        </Card>
      )}
      <Card className="space-y-4 p-5">
        <Switch label={t('care.helpStep.larger')} hint={t('care.helpStep.largerHint')} checked={larger} onChange={setLarger} />
        <Switch label={t('care.helpStep.focus')} hint={t('care.helpStep.focusHint')} checked={focus} onChange={setFocus} />
      </Card>
      <ErrorNotice error={error} />
      <Button
        size="xl"
        className="w-full"
        icon={<Check className="size-6" />}
        loading={busy}
        onClick={() =>
          saveCare({
            checkInTime,
            checkInLabel: t('care.checkin.label'),
            medicines: cleanMeds,
            medicineAlerts: medAlerts,
            primaryCallContactId: callable.length ? (firstCall ?? null) : undefined,
            largerText: larger,
            focus,
          })
        }
      >
        {t('care.helpStep.finish')}
      </Button>
      <p className="text-center text-sm text-muted">
        {t('care.helpStep.later')}{' '}
        <Link href="/settings" className="font-semibold text-brand">
          {t('nav.settings')}
        </Link>
      </p>
    </StepShell>
  );
}

export default function GetStartedPage() {
  return (
    <Suspense fallback={<LoadingBlock rows={3} />}>
      <GetStarted />
    </Suspense>
  );
}
