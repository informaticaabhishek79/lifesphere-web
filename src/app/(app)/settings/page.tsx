'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, KeyRound, LogOut, Monitor, Smartphone } from 'lucide-react';
import { api } from '@/lib/api';
import { useAction, usePaged } from '@/lib/hooks';
import { applyAppearance, useSession } from '@/lib/session';
import type { ActivityItem, Feature, Locality, Me, MfaStatus, OtpChallenge, Preferences, SessionInfo, Theme } from '@/lib/types';
import { LANGUAGE_OPTIONS, useI18n, type Locale } from '@/i18n';
import { useCountryOptions } from '@/lib/countries';
import { Badge, Button, ButtonLink, Card, CardBody, CardHeader, ErrorNotice, List, ListItem, LoadingBlock, LoadMore, Notice, PageHeader, Tabs } from '@/components/ui';
import { InstallAppCard } from '@/components/install-app';
import { Input, Segmented, Select, Switch, Textarea } from '@/components/form';
import { FormDialog, useConfirm, useToast } from '@/components/dialog';
import { useReauth } from '@/components/reauth';

type Tab = 'profile' | 'appearance' | 'notifications' | 'widgets' | 'features' | 'security' | 'activity';
const FEATURES: Feature[] = ['lifeos', 'household', 'familycare', 'community', 'consumer', 'services', 'assistant', 'documents', 'agents'];
/** Every IANA time zone the browser knows (falls back to a short list on very old browsers). */
const TIMEZONES: string[] = (() => {
  try {
    return (Intl as unknown as { supportedValuesOf(k: string): string[] }).supportedValuesOf('timeZone');
  } catch {
    return ['UTC', 'Asia/Kolkata', 'Asia/Dubai', 'Asia/Singapore', 'Europe/London', 'Europe/Berlin', 'America/New_York', 'America/Los_Angeles', 'Australia/Sydney'];
  }
})();

function usePrefsSaver() {
  const qc = useQueryClient();
  const { me } = useSession();
  return useAction((patch: Partial<Preferences> & { accessibility?: Partial<Preferences['accessibility']> }) => api.patch<Preferences>('/v1/me/preferences', patch), {
    onSuccess: (prefs) => {
      qc.setQueryData<Me>(['me'], (old) => (old ? { ...old, preferences: prefs } : old));
      applyAppearance({ ...me, preferences: prefs });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export default function SettingsPage() {
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>('profile');
  useEffect(() => {
    const h = window.location.hash.slice(1) as Tab;
    if (h) setTab(h);
  }, []);
  return (
    <div>
      <PageHeader title={t('settings.title')} />
      <Tabs<Tab>
        value={tab}
        onChange={(v) => {
          setTab(v);
          history.replaceState(null, '', `#${v}`);
        }}
        tabs={[
          { value: 'profile', label: t('settings.profile') },
          { value: 'appearance', label: t('settings.appearance') },
          { value: 'notifications', label: t('settings.notifications') },
          { value: 'widgets', label: t('settings.widgets') },
          { value: 'features', label: t('settings.features') },
          { value: 'security', label: t('settings.security') },
          { value: 'activity', label: t('settings.activity') },
        ]}
      />
      <div className="max-w-3xl">
        {tab === 'profile' && <ProfileTab />}
        {tab === 'appearance' && <AppearanceTab />}
        {tab === 'notifications' && (
          <div className="space-y-5">
            <InstallAppCard />
            <NotificationsTab />
          </div>
        )}
        {tab === 'widgets' && <WidgetsTab />}
        {tab === 'features' && <FeaturesTab />}
        {tab === 'security' && <SecurityTab />}
        {tab === 'activity' && <ActivityTab />}
      </div>
    </div>
  );
}

function ProfileTab() {
  const { t, setLocale, locale } = useI18n();
  const { me } = useSession();
  const qc = useQueryClient();
  const toast = useToast();
  const [form, setForm] = useState({
    displayName: me.profile.displayName,
    bio: me.profile.bio ?? '',
    localityId: me.profile.locality?.id ?? '',
    timezone: me.profile.timezone,
    country: me.profile.country ?? '',
    seniorMode: me.profile.seniorMode,
    discoverable: me.profile.discoverable,
  });
  const countries = useCountryOptions(locale);
  const [localitySearch, setLocalitySearch] = useState('');
  const localities = useQuery({
    queryKey: ['localities', form.country, localitySearch],
    queryFn: () => api.get<Locality[]>('/v1/localities', { search: localitySearch || undefined, country: form.country || 'all' }),
  });
  const save = useAction(
    () =>
      api.patch<Me>('/v1/me/profile', {
        displayName: form.displayName.trim(),
        bio: form.bio.trim() || null,
        localityId: form.localityId || null,
        timezone: form.timezone,
        ...(form.country ? { country: form.country } : {}),
        seniorMode: form.seniorMode,
        discoverable: form.discoverable,
      }),
    {
      success: t('common.saved'),
      onSuccess: (m) => {
        qc.setQueryData(['me'], m);
        applyAppearance(m);
      },
    },
  );
  const localityOptions = [...(localities.data ?? [])];
  if (me.profile.locality && !localityOptions.some((l) => l.id === me.profile.locality!.id)) localityOptions.unshift(me.profile.locality);

  return (
    <Card>
      <CardBody className="space-y-5 pt-5">
        <Input label={t('settings.displayName')} value={form.displayName} maxLength={80} onChange={(e) => setForm({ ...form, displayName: e.target.value })} />
        <Textarea label={t('settings.bio')} hint={t('settings.bioHint')} optional value={form.bio} maxLength={280} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
        <Select
          label={t('settings.country')}
          hint={t('settings.countryHint')}
          value={form.country}
          placeholder={t('common.none')}
          onChange={(e) => {
            const code = e.target.value;
            // A new country usually means a new time zone and neighbourhood (both stay editable).
            const zoneCountry = (tz: string) => countries.find((c) => c.timezone === tz)?.code;
            const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
            const timezone =
              zoneCountry(form.timezone) === code || !zoneCountry(form.timezone)
                ? form.timezone
                : zoneCountry(browserTz) === code
                  ? browserTz
                  : (countries.find((c) => c.code === code)?.timezone ?? form.timezone);
            setForm({ ...form, country: code, localityId: '', timezone });
          }}
          options={countries.map((c) => ({ value: c.code, label: `${c.flag} ${c.name}` }))}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label={t('common.search')} value={localitySearch} onChange={(e) => setLocalitySearch(e.target.value)} placeholder={t('settings.localitySearchPlaceholder')} />
          <Select
            label={t('settings.locality')}
            value={form.localityId}
            onChange={(e) => setForm({ ...form, localityId: e.target.value })}
            placeholder={t('common.none')}
            options={localityOptions.map((l) => ({ value: l.id, label: `${l.name}, ${l.city}${l.country && l.country !== form.country ? ` (${l.country})` : ''}` }))}
          />
        </div>
        <p className="-mt-3 text-[0.82rem] text-muted">{t('settings.localityHint')}</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label={t('settings.timezone')} value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })} options={[...new Set([form.timezone, ...TIMEZONES])].map((z) => ({ value: z, label: z }))} />
          <Select
            label={t('common.language')}
            value={locale}
            onChange={(e) => {
              const l = e.target.value as Locale;
              void setLocale(l);
              api
                .patch<Me>('/v1/me/profile', { locale: l })
                .then((m) => qc.setQueryData(['me'], m))
                .catch(() => toast(t('common.somethingWrong'), 'danger'));
            }}
            options={LANGUAGE_OPTIONS}
          />
        </div>
        <div className="space-y-3 rounded-xl bg-surface-2 p-4">
          <Switch label={t('settings.seniorMode')} hint={t('settings.seniorModeHint')} checked={form.seniorMode} onChange={(v) => setForm({ ...form, seniorMode: v })} />
          <Switch label={t('settings.discoverable')} hint={t('settings.discoverableHint')} checked={form.discoverable} onChange={(v) => setForm({ ...form, discoverable: v })} />
        </div>
        <div className="flex justify-end">
          <Button onClick={() => save.mutate()} loading={save.isPending} disabled={!form.displayName.trim()}>
            {t('common.save')}
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}

function AppearanceTab() {
  const { t } = useI18n();
  const { me } = useSession();
  const save = usePrefsSaver();
  const p = me.preferences;
  const a = p.accessibility;
  const setA = (patch: Partial<typeof a>) => save.mutate({ accessibility: { ...a, ...patch } });
  return (
    <Card>
      <CardBody className="space-y-6 pt-5">
        <Segmented<Theme>
          label={t('settings.theme')}
          value={p.theme === 'system' ? 'light' : p.theme}
          onChange={(v) => save.mutate({ theme: v })}
          options={(['light', 'dark', 'high_contrast'] as Theme[]).map((v) => ({ value: v, label: t(`enums.theme.${v}`) }))}
        />
        <div>
          <label htmlFor="scale" className="mb-1.5 block text-sm font-semibold">
            {t('settings.textScale')} <span className="font-normal text-muted">({Math.round(a.textScale * 100)}%)</span>
          </label>
          <input
            id="scale"
            type="range"
            min={1}
            max={2}
            step={0.1}
            defaultValue={a.textScale}
            onChange={(e) => document.documentElement.style.setProperty('--scale', e.target.value)}
            onMouseUp={(e) => setA({ textScale: Number((e.target as HTMLInputElement).value) })}
            onTouchEnd={(e) => setA({ textScale: Number((e.target as HTMLInputElement).value) })}
            onKeyUp={(e) => setA({ textScale: Number((e.target as HTMLInputElement).value) })}
            className="w-full accent-[var(--brand)]"
          />
          <p className="mt-2 text-muted" style={{ fontSize: `${a.textScale}rem` }}>
            Aa — {t('app.tagline')}
          </p>
        </div>
        <div className="space-y-3 border-t border-line pt-5">
          <Switch label={t('settings.highContrast')} checked={a.highContrast} onChange={(v) => setA({ highContrast: v })} />
          <Switch label={t('settings.reduceMotion')} checked={a.reduceMotion} onChange={(v) => setA({ reduceMotion: v })} />
          <Switch label={t('settings.simpleConfirmations')} hint={t('settings.simpleConfirmationsHint')} checked={a.simpleConfirmations} onChange={(v) => setA({ simpleConfirmations: v })} />
          <Switch label={t('settings.screenReaderHints')} checked={a.screenReaderHints} onChange={(v) => setA({ screenReaderHints: v })} />
          <Switch label={t('settings.voiceNavigation')} checked={a.voiceNavigation} onChange={(v) => setA({ voiceNavigation: v })} />
        </div>
      </CardBody>
    </Card>
  );
}

function NotificationsTab() {
  const { t } = useI18n();
  const { me } = useSession();
  const save = usePrefsSaver();
  const p = me.preferences;
  const [qs, setQs] = useState(p.quietHoursStart ?? '');
  const [qe, setQe] = useState(p.quietHoursEnd ?? '');
  return (
    <Card>
      <CardBody className="space-y-6 pt-5">
        <div>
          <Segmented
            label={t('settings.lockScreen')}
            value={p.lockScreenDetail}
            onChange={(v) => save.mutate({ lockScreenDetail: v })}
            options={(['none', 'generic', 'full'] as const).map((v) => ({ value: v, label: t(`enums.lockScreen.${v}`) }))}
          />
          <p className="mt-1.5 text-[0.82rem] text-muted">{t('settings.lockScreenHint')}</p>
        </div>
        <div className="border-t border-line pt-5">
          <div className="text-sm font-semibold">{t('settings.quietHours')}</div>
          <p className="mb-3 text-[0.82rem] text-muted">{t('settings.quietHoursHint')}</p>
          <div className="flex flex-wrap items-end gap-3">
            <Input type="time" label={t('settings.quietStart')} value={qs} onChange={(e) => setQs(e.target.value)} fieldClassName="w-40" />
            <Input type="time" label={t('settings.quietEnd')} value={qe} onChange={(e) => setQe(e.target.value)} fieldClassName="w-40" />
            <Button variant="secondary" loading={save.isPending} onClick={() => save.mutate({ quietHoursStart: qs || null, quietHoursEnd: qe || null } as Partial<Preferences>)}>
              {t('common.save')}
            </Button>
            {(p.quietHoursStart || p.quietHoursEnd) && (
              <Button
                variant="ghost"
                onClick={() => {
                  setQs('');
                  setQe('');
                  save.mutate({ quietHoursStart: null, quietHoursEnd: null });
                }}
              >
                {t('common.remove')}
              </Button>
            )}
          </div>
        </div>
        <div className="border-t border-line pt-5">
          <a href="/notifications?tab=settings" className="font-semibold text-brand">
            {t('notifications.preferences')} <span aria-hidden className="flip-rtl inline-block">→</span>
          </a>
        </div>
      </CardBody>
    </Card>
  );
}

function WidgetsTab() {
  const { t } = useI18n();
  const { me } = useSession();
  const save = usePrefsSaver();
  const widgets = [...me.preferences.dashboardWidgets].sort((a, b) => a.order - b.order);
  const commit = (list: typeof widgets) => save.mutate({ dashboardWidgets: list.map((w, i) => ({ ...w, order: i })) });
  const move = (i: number, d: -1 | 1) => {
    const list = [...widgets];
    const j = i + d;
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j]!, list[i]!];
    commit(list);
  };
  return (
    <Card id="widgets">
      <CardHeader title={t('dashboard.widgetsTitle')} />
      <CardBody>
        <ul className="divide-y divide-line">
          {widgets.map((w, i) => (
            <li key={w.key} className="flex items-center gap-3 py-2.5">
              <div className="flex-1">
                <Switch label={t(`dashboard.widget.${w.key}`)} checked={w.enabled} onChange={(v) => commit(widgets.map((x) => (x.key === w.key ? { ...x, enabled: v } : x)))} />
              </div>
              <div className="flex">
                <button type="button" className="rounded-lg p-2 text-muted hover:bg-bg-2 disabled:opacity-30" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up">
                  <ArrowUp className="size-4" />
                </button>
                <button type="button" className="rounded-lg p-2 text-muted hover:bg-bg-2 disabled:opacity-30" disabled={i === widgets.length - 1} onClick={() => move(i, 1)} aria-label="Move down">
                  <ArrowDown className="size-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </CardBody>
    </Card>
  );
}

function FeaturesTab() {
  const { t } = useI18n();
  const { me } = useSession();
  const save = usePrefsSaver();
  const off = me.preferences.disabledFeatures;
  const mode = me.preferences.homeMode;
  return (
    <div className="space-y-5">
      <Card>
        <CardHeader title={t('care.settingsTitle')} description={mode ? t(`care.settingsMode.${mode}`) : t('care.settingsNotChosen')} action={<ButtonLink href="/get-started" size="sm" variant="secondary">{t('care.settingsChange')}</ButtonLink>} />
      </Card>
      <Card>
        <CardHeader title={t('settings.features')} description={t('settings.featuresHint')} />
        <CardBody className="space-y-2">
          {FEATURES.map((f) => (
            <Switch key={f} label={t(`enums.feature.${f}`)} checked={!off.includes(f)} onChange={(v) => save.mutate({ disabledFeatures: v ? off.filter((x) => x !== f) : [...off, f] })} />
          ))}
        </CardBody>
      </Card>
      <Card>
        <CardHeader title={t('settings.ai')} />
        <CardBody className="space-y-3">
          <Switch label={t('settings.aiEnabled')} checked={me.preferences.aiEnabled} onChange={(v) => save.mutate({ aiEnabled: v })} />
          <Switch label={t('settings.aiHistory')} hint={t('settings.aiHistoryHint')} checked={me.preferences.aiStoreHistory} onChange={(v) => save.mutate({ aiStoreHistory: v })} />
        </CardBody>
      </Card>
    </div>
  );
}

function SecurityTab() {
  const { t } = useI18n();
  const { me, fmt } = useSession();
  const confirm = useConfirm();
  const withReauth = useReauth();
  const qc = useQueryClient();
  const sessions = useQuery({ queryKey: ['sessions'], queryFn: () => api.get<SessionInfo[]>('/v1/auth/sessions') });
  const mfa = useQuery({ queryKey: ['mfa'], queryFn: () => api.get<MfaStatus>('/v1/auth/mfa') });
  const revoke = useAction((id: string) => api.del(`/v1/auth/sessions/${id}`), { invalidate: [['sessions']] });
  const revokeAll = useAction(() => api.post<{ revoked: number }>('/v1/auth/logout-all'), {
    invalidate: [['sessions']],
    success: (r) => t('settings.signedOutOthers', { count: r.revoked }),
  });

  // contact verification
  const [contactOpen, setContactOpen] = useState<null | 'sms' | 'email'>(null);
  const [dest, setDest] = useState('');
  const [challenge, setChallenge] = useState<OtpChallenge | null>(null);
  const [code, setCode] = useState('');

  // MFA setup
  const [setup, setSetup] = useState<{ secret: string; otpauthUrl: string } | null>(null);
  const [totp, setTotp] = useState('');
  const [codes, setCodes] = useState<string[] | null>(null);

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader title={t('settings.contactDetails')} />
        <CardBody className="space-y-3">
          {(
            [
              ['sms', t('settings.phone'), me.phoneMasked, me.phoneVerified],
              ['email', t('settings.email'), me.emailMasked, me.emailVerified],
            ] as const
          ).map(([ch, label, value, verified]) => (
            <div key={ch} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface-2 px-4 py-3">
              <div>
                <div className="text-sm text-muted">{label}</div>
                <div className="font-medium"><bdi dir="ltr">{value ?? '—'}</bdi></div>
              </div>
              <div className="flex items-center gap-2">
                {value && <Badge tone={verified ? 'ok' : 'warn'}>{verified ? t('settings.verified') : t('settings.notVerified')}</Badge>}
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setDest('');
                    setChallenge(null);
                    setCode('');
                    setContactOpen(ch);
                  }}
                >
                  {value ? (ch === 'sms' ? t('settings.changePhone') : t('common.edit')) : t('settings.addEmail')}
                </Button>
              </div>
            </div>
          ))}
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          icon={<KeyRound className="size-5" />}
          title={t('settings.mfa')}
          description={mfa.data ? (mfa.data.totpEnabled ? t('settings.mfaOn', { date: fmt.date(mfa.data.enabledAt), count: mfa.data.recoveryCodesRemaining }) : t('settings.mfaOff')) : undefined}
        />
        <CardBody>
          {mfa.data?.totpEnabled ? (
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                onClick={() =>
                  withReauth(() => api.post<{ recoveryCodes: string[] }>('/v1/auth/mfa/recovery-codes'))
                    .then((r) => {
                      setCodes(r.recoveryCodes);
                      qc.invalidateQueries({ queryKey: ['mfa'] });
                    })
                    .catch(() => {})
                }
              >
                {t('settings.regenerateCodes')}
              </Button>
              <Button
                variant="ghost"
                className="text-danger"
                onClick={async () => {
                  if (!(await confirm({ title: t('settings.mfaDisable'), body: t('common.areYouSure'), danger: true }))) return;
                  await withReauth(() => api.post('/v1/auth/mfa/totp/disable', { confirm: true })).catch(() => {});
                  qc.invalidateQueries({ queryKey: ['mfa'] });
                  qc.invalidateQueries({ queryKey: ['me'] });
                }}
              >
                {t('settings.mfaDisable')}
              </Button>
            </div>
          ) : (
            <Button
              onClick={() =>
                withReauth(() => api.post<{ secret: string; otpauthUrl: string }>('/v1/auth/mfa/totp/setup'))
                  .then((s) => {
                    setSetup(s);
                    setTotp('');
                  })
                  .catch(() => {})
              }
            >
              {t('settings.mfaSetup')}
            </Button>
          )}
          {codes && codes.length > 0 && (
            <Notice tone="warn" title={t('settings.recoveryCodes')} className="mt-4">
              <p>{t('settings.recoveryCodesBody')}</p>
              <ul className="mt-2 grid grid-cols-2 gap-1 font-mono text-sm sm:grid-cols-3">
                {codes.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </Notice>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title={t('settings.sessions')}
          action={
            <Button size="sm" variant="secondary" icon={<LogOut className="size-4" />} loading={revokeAll.isPending} onClick={() => revokeAll.mutate()}>
              {t('settings.signOutOthers')}
            </Button>
          }
        />
        <CardBody>
          {sessions.isLoading && <LoadingBlock rows={2} />}
          <ErrorNotice error={sessions.error} />
          <ul className="divide-y divide-line">
            {sessions.data?.map((s) => (
              <li key={s.id} className="flex items-center gap-3 py-3">
                {s.platform === 'web' || !s.platform ? <Monitor className="size-5 text-muted" /> : <Smartphone className="size-5 text-muted" />}
                <div className="min-w-0 flex-1">
                  <div className="font-medium">
                    {s.deviceName ?? t('common.unknown')} {s.current && <Badge tone="brand">{t('settings.thisDevice')}</Badge>}
                  </div>
                  <div className="text-sm text-muted">{t('settings.lastUsed', { when: fmt.ago(s.lastUsedAt) })}</div>
                </div>
                {!s.current && (
                  <Button size="sm" variant="ghost" onClick={() => revoke.mutate(s.id)}>
                    {t('settings.signOutDevice')}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>

      <FormDialog
        open={!!contactOpen}
        onClose={() => setContactOpen(null)}
        title={contactOpen === 'sms' ? t('settings.phone') : t('settings.email')}
        submitLabel={challenge ? t('settings.verifyContact') : t('auth.sendCode')}
        onSubmit={async () => {
          if (!challenge) {
            const ch = await withReauth(() => api.post<OtpChallenge>('/v1/auth/contact/request', { channel: contactOpen, destination: dest.trim() }));
            setChallenge(ch);
            return false;
          }
          await withReauth(() => api.post('/v1/auth/contact/verify', { challengeId: challenge.challengeId, code }));
          qc.invalidateQueries({ queryKey: ['me'] });
        }}
      >
        {!challenge ? (
          <Input
            label={contactOpen === 'sms' ? t('auth.phoneLabel') : t('auth.emailLabel')}
            type={contactOpen === 'sms' ? 'tel' : 'email'}
            value={dest}
            onChange={(e) => setDest(e.target.value)}
            autoFocus
          />
        ) : (
          <>
            <p className="text-sm text-muted">{t('auth.codeSentTo', { to: challenge.sentTo })}</p>
            {challenge.devCode && <Notice tone="warn">{t('auth.devCode', { code: challenge.devCode })}</Notice>}
            <Input label={t('auth.codeLabel')} inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} autoFocus />
          </>
        )}
      </FormDialog>

      <FormDialog
        open={!!setup}
        onClose={() => setSetup(null)}
        title={t('settings.mfaSetup')}
        submitLabel={t('settings.mfaConfirm')}
        disabled={totp.length !== 6}
        onSubmit={async () => {
          const r = await api.post<{ enabled: boolean; recoveryCodes: string[] }>('/v1/auth/mfa/totp/confirm', { code: totp });
          setCodes(r.recoveryCodes);
          qc.invalidateQueries({ queryKey: ['mfa'] });
          qc.invalidateQueries({ queryKey: ['me'] });
        }}
      >
        <p className="text-sm text-ink-2">{t('settings.mfaScan')}</p>
        <div className="rounded-xl bg-surface-2 p-4">
          <div className="text-xs font-semibold uppercase text-muted">{t('settings.mfaSecret')}</div>
          <code className="mt-1 block font-mono text-lg tracking-wider break-all select-all">{setup?.secret.replace(/(.{4})/g, '$1 ').trim()}</code>
          <a href={setup?.otpauthUrl} className="mt-2 inline-block text-sm font-semibold text-brand">
            {t('common.open')} <span aria-hidden className="flip-rtl inline-block">→</span>
          </a>
        </div>
        <Input label={t('auth.mfaCode')} inputMode="numeric" maxLength={6} value={totp} onChange={(e) => setTotp(e.target.value.replace(/\D/g, ''))} />
      </FormDialog>
    </div>
  );
}

function ActivityTab() {
  const { t } = useI18n();
  const { fmt } = useSession();
  const list = usePaged<ActivityItem>(['activity'], '/v1/me/activity');
  return (
    <div>
      <p className="mb-4 text-sm text-muted">{t('settings.activityHint')}</p>
      {list.isLoading && <LoadingBlock />}
      <ErrorNotice error={list.error} />
      <List>
        {list.items.map((a) => (
          <ListItem
            key={a.id}
            title={a.action.replace(/[._]/g, ' ')}
            subtitle={Object.entries(a.metadata ?? {})
              .map(([k, v]) => `${k}: ${String(v)}`)
              .join(' · ')}
            trailing={
              <div className="text-end text-sm">
                <div className="text-muted">{fmt.dateTime(a.createdAt)}</div>
                <Badge tone={a.byMe ? 'neutral' : a.actorType === 'system' ? 'info' : 'accent'}>
                  {a.byMe ? t('settings.byMe') : a.actorType === 'system' ? t('settings.bySystem') : t('settings.byOther')}
                </Badge>
              </div>
            }
          />
        ))}
      </List>
      <LoadMore hasMore={list.hasMore} loading={list.loadingMore} onClick={list.loadMore} />
    </div>
  );
}
