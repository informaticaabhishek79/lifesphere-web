'use client';

import Link from 'next/link';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlarmClock, CalendarDays, Check, CheckSquare, HeartPulse, LifeBuoy, Mic, Phone, Pill, Settings2, ShieldCheck } from 'lucide-react';
import { api } from '@/lib/api';
import { useSession } from '@/lib/session';
import { useI18n } from '@/i18n';
import { CareItemRow, FamilyOverview, isOpen, useCareToday, useConfirmItem } from './care';
import { PendingSuggestions } from './care-suggestions';
import { useToast } from './dialog';
import { Button, ButtonLink, Card, cx, ErrorNotice, LoadingBlock, Notice } from './ui';

function Greeting({ big }: { big?: boolean }) {
  const { t } = useI18n();
  const { me, fmt } = useSession();
  const hour = Number(new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hourCycle: 'h23', timeZone: fmt.timeZone }).format(new Date()));
  const key = hour < 12 ? 'dashboard.greetingMorning' : hour < 17 ? 'dashboard.greetingAfternoon' : 'dashboard.greetingEvening';
  return (
    <header className="mb-6 rise">
      <p className={cx('font-semibold text-accent', big ? 'text-lg' : 'text-sm')}>{fmt.date(new Date(), { weekday: 'long', day: 'numeric', month: 'long' })}</p>
      <h1 className={cx('font-display mt-1 leading-tight font-semibold', big ? 'text-[2.4rem] sm:text-[3rem]' : 'text-[2.1rem] sm:text-[2.6rem]')}>{t(key, { name: me.profile.displayName })}</h1>
    </header>
  );
}

/** Home for someone looking after a parent or relative: how each of them is doing today comes first. */
export function CaregiverHome() {
  const { t } = useI18n();
  const { featureOn } = useSession();
  const links = [
    featureOn('lifeos') && { href: '/tasks', label: t('nav.tasks'), icon: CheckSquare },
    featureOn('lifeos') && { href: '/reminders', label: t('nav.reminders'), icon: AlarmClock },
    featureOn('lifeos') && { href: '/calendar', label: t('nav.calendar'), icon: CalendarDays },
    featureOn('assistant') && { href: '/voice', label: t('nav.voice'), icon: Mic },
  ].filter(Boolean) as { href: string; label: string; icon: React.ComponentType<{ className?: string }> }[];
  return (
    <div>
      <Greeting />
      <p className="-mt-4 mb-6 text-muted">{t('care.caregiverIntro')}</p>
      <FamilyOverview />
      {links.length > 0 && (
        <section className="mt-8" aria-label={t('care.yourOwn')}>
          <h2 className="mb-3 text-sm font-semibold text-muted">{t('care.yourOwn')}</h2>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className="card flex items-center gap-3 px-4 py-3.5 font-semibold hover:border-line-strong">
                <span className="flex size-9 items-center justify-center rounded-xl bg-brand-soft text-brand">
                  <l.icon className="size-5" />
                </span>
                <span className="text-sm">{l.label}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
      <ModeFooter />
    </div>
  );
}

/** Home for the person being looked after: big buttons, today's check-in and medicines, help one tap away. */
export function ParentHome() {
  const { t } = useI18n();
  const { fmt, featureOn } = useSession();
  const q = useCareToday();
  const qc = useQueryClient();
  const toast = useToast();
  const confirm = useConfirmItem();
  const imOk = useMutation({
    mutationFn: () => api.post<{ status: string }>('/v1/check-ins/now', {}),
    onSuccess: (r) => {
      toast(r.status === 'no_open_check_in' ? t('checkins.nothingOpen') : t('care.okToast'));
      qc.invalidateQueries({ queryKey: ['care'] });
    },
    onError: (e) => toast((e as Error).message, 'danger'),
  });

  if (q.isLoading) return <LoadingBlock rows={4} />;
  if (q.error) return <ErrorNotice error={q.error} onRetry={() => q.refetch()} />;
  const d = q.data!;
  const checkIns = d.today.filter((i) => i.purpose === 'wellbeing');
  const meds = d.today.filter((i) => i.purpose === 'medicine');
  const openCheckIn = checkIns.find(isOpen);
  const doneCheckIn = [...checkIns].reverse().find((i) => i.state === 'completed');
  const nextCheckIn = checkIns.find((i) => i.upcoming);
  const names = d.circle.map((c) => c.displayName).filter(Boolean) as string[];
  const day = (iso: string) => fmt.relativeDay(iso, { today: t('common.today'), tomorrow: t('common.tomorrow'), yesterday: t('common.yesterday') });
  const nextWellbeing = d.schedules.filter((x) => x.purpose === 'wellbeing' && x.nextDueAt).sort((a, b) => a.nextDueAt!.localeCompare(b.nextDueAt!))[0];
  const medSchedules = d.schedules.filter((x) => x.purpose === 'medicine');
  const medNames = [...new Set(medSchedules.map((m) => m.label))].map((label) => ({ label, times: medSchedules.filter((m) => m.label === label).map((m) => m.timeLocal).filter(Boolean) as string[] }));

  return (
    <div className="mx-auto max-w-2xl">
      <Greeting big />

      <PendingSuggestions />

      {d.openHelp && (
        <Notice tone="danger" className="mb-5" action={<Link href={`/help/requests/${d.openHelp.id}`} className="font-semibold underline">{t('common.view')}</Link>}>
          {t('care.helpOpen', { time: fmt.time(d.openHelp.createdAt) })}
        </Notice>
      )}

      {/* Are you OK? */}
      <section aria-label={t('care.checkInTitle')} className="mb-6">
        {openCheckIn ? (
          <button
            type="button"
            onClick={() => imOk.mutate()}
            disabled={imOk.isPending}
            className="flex w-full items-center justify-center gap-4 rounded-3xl bg-ok px-6 py-8 text-2xl font-bold text-white shadow-lg transition hover:brightness-105 active:scale-[0.99] disabled:opacity-70"
          >
            <span className="flex size-14 items-center justify-center rounded-full bg-white/20">
              <Check className="size-9" />
            </span>
            {t('care.imOk')}
          </button>
        ) : (
          <Card className="flex items-center gap-4 p-5">
            <span className={cx('flex size-12 shrink-0 items-center justify-center rounded-2xl', doneCheckIn ? 'bg-ok-soft text-ok' : 'bg-brand-soft text-brand')}>
              {doneCheckIn ? <Check className="size-7" /> : <HeartPulse className="size-7" />}
            </span>
            <div className="text-lg">
              {doneCheckIn ? (
                <span className="font-semibold">{t('care.checkedInAt', { time: fmt.time(doneCheckIn.completedAt!) })}</span>
              ) : nextCheckIn ? (
                <span className="font-semibold">{t('care.nextCheckIn', { time: fmt.time(nextCheckIn.dueAt) })}</span>
              ) : nextWellbeing ? (
                <span className="font-semibold">{t('care.nextCheckInDay', { day: day(nextWellbeing.nextDueAt!), time: fmt.time(nextWellbeing.nextDueAt!) })}</span>
              ) : d.activeSchedules ? (
                <span className="font-semibold">{t('care.noCheckInToday')}</span>
              ) : (
                <Link href="/get-started?as=cared_for" className="font-semibold text-brand">
                  {t('care.setUpCheckIn')} <span aria-hidden className="flip-rtl inline-block">→</span>
                </Link>
              )}
              {names.length > 0 && !doneCheckIn && <p className="text-sm text-muted">{t('care.whoIsTold', { names: names.join(', ') })}</p>}
            </div>
          </Card>
        )}
      </section>

      {/* Medicines */}
      <section aria-labelledby="meds-h" className="mb-6">
        <h2 id="meds-h" className="mb-3 flex items-center gap-2 text-xl font-semibold">
          <Pill className="size-6 text-accent" /> {t('care.medicinesToday')}
        </h2>
        {meds.length === 0 && medNames.length > 0 ? (
          <Card className="space-y-2 p-5">
            <p className="text-ink-2">{t('care.medsDoneToday')}</p>
            <ul className="space-y-1">
              {medNames.map((m) => (
                <li key={m.label} className="flex items-center justify-between gap-3 text-lg">
                  <span className="font-medium">{m.label}</span>
                  <span className="text-muted tabular-nums">{m.times.join(' · ')}</span>
                </li>
              ))}
            </ul>
          </Card>
        ) : meds.length === 0 ? (
          <Card className="p-5 text-ink-2">
            {t('care.noMedicines')}
          </Card>
        ) : (
          <ul className="space-y-2.5">
            {meds.map((m) => (
              <CareItemRow
                key={`${m.scheduleId}-${m.dueAt}`}
                item={m}
                large
                action={
                  isOpen(m) ? (
                    <Button size="lg" className="bg-ok hover:bg-ok/90" icon={<Check className="size-5" />} loading={confirm.isPending && confirm.variables?.id === m.id} onClick={() => confirm.mutate(m)}>
                      {t('care.taken')}
                    </Button>
                  ) : undefined
                }
              />
            ))}
          </ul>
        )}
        <Link href="/get-started?as=cared_for&step=medicines" className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-brand">
          + {t('care.addMedicine')}
        </Link>
      </section>

      {/* Help and calls */}
      <section aria-label={t('nav.help')} className="mb-6 grid gap-3 sm:grid-cols-2">
        {featureOn('familycare') && (
          <ButtonLink href="/help" size="xl" variant="danger" className="w-full" icon={<LifeBuoy className="size-6" />}>
            {t('care.getHelp')}
          </ButtonLink>
        )}
        {d.callTargets
          .filter((c) => c.kind === 'contact')
          .map((c) => (
            <a key={c.number} href={`tel:${c.number}`} className="inline-flex h-16 items-center justify-center gap-3 rounded-2xl border border-line-strong bg-surface px-6 text-lg font-semibold hover:bg-surface-2">
              <Phone className="size-6 text-brand" /> {t('care.call', { name: c.label })}
            </a>
          ))}
        {featureOn('assistant') && (
          <ButtonLink href="/voice?listen=1" size="xl" variant="secondary" className="w-full" icon={<Mic className="size-6 text-brand" />}>
            {t('care.askAnything')}
          </ButtonLink>
        )}
      </section>

      {(d.reminders.length > 0 || d.appointments.length > 0) && (
        <section aria-labelledby="soon-h" className="mb-6">
          <h2 id="soon-h" className="mb-3 text-xl font-semibold">
            {t('care.comingUp')}
          </h2>
          <ul className="space-y-2">
            {d.appointments.map((a) => (
              <li key={a.id} className="card flex items-center gap-3 px-4 py-3">
                <CalendarDays className="size-6 shrink-0 text-brand" />
                <span className="min-w-0 flex-1 text-lg font-medium">{a.title}</span>
                <span className="shrink-0 text-muted">
                  {fmt.relativeDay(a.startsAt, { today: t('common.today'), tomorrow: t('common.tomorrow'), yesterday: t('common.yesterday') })} · {fmt.time(a.startsAt)}
                </span>
              </li>
            ))}
            {d.reminders.map((r) => (
              <li key={r.id} className="card flex items-center gap-3 px-4 py-3">
                <AlarmClock className="size-6 shrink-0 text-accent" />
                <span className="min-w-0 flex-1 text-lg font-medium">{r.title}</span>
                <span className="shrink-0 text-muted">
                  {fmt.relativeDay(r.fireAt, { today: t('common.today'), tomorrow: t('common.tomorrow'), yesterday: t('common.yesterday') })} · {fmt.time(r.fireAt)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="circle-h" className="mb-6">
        <h2 id="circle-h" className="mb-3 flex items-center gap-2 text-xl font-semibold">
          <ShieldCheck className="size-6 text-brand" /> {t('care.lookingOut')}
        </h2>
        {d.circle.length === 0 ? (
          <Card className="p-5 text-ink-2">
            {t('care.nobodyYet')}{' '}
            <Link href="/get-started?as=cared_for" className="font-semibold text-brand">
              {t('care.addSomeone')}
            </Link>
          </Card>
        ) : (
          <ul className="space-y-2">
            {d.circle.map((c) => (
              <li key={c.userId} className="card px-4 py-3">
                <div className="text-lg font-semibold">{c.displayName}</div>
                <div className="text-sm text-muted">{c.scopes.map((s) => t(`care.scopeMine.${s.scope.replace('.', '_')}`)).join(' · ')}</div>
              </li>
            ))}
          </ul>
        )}
        <Link href="/sharing" className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
          <Settings2 className="size-4" /> {t('care.changeSharing')}
        </Link>
      </section>
      <ModeFooter />
    </div>
  );
}

function ModeFooter() {
  const { t } = useI18n();
  return (
    <div className="mt-8 flex justify-end">
      <Link href="/get-started" className="text-sm font-semibold text-muted hover:text-ink">
        {t('care.changeHome')} <span aria-hidden className="flip-rtl inline-block">→</span>
      </Link>
    </div>
  );
}

/** Shown on the full home until the person says what they use LifeSphere for. */
export function ChooseHomeBanner() {
  const { t } = useI18n();
  return (
    <Card className="mb-6 overflow-hidden border-brand/30 bg-brand-soft/50 p-5">
      <div className="flex flex-wrap items-center gap-4">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-brand text-brand-ink">
          <HeartPulse className="size-6" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="font-display text-lg font-semibold">{t('care.bannerTitle')}</div>
          <p className="text-sm text-ink-2">{t('care.bannerBody')}</p>
        </div>
        <ButtonLink href="/get-started">{t('care.bannerAction')}</ButtonLink>
      </div>
    </Card>
  );
}
