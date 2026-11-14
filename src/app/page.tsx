import type { Metadata } from 'next';
import Link from 'next/link';
import {
  BellRing,
  Building2,
  CheckCircle2,
  Globe2,
  HeartHandshake,
  HeartPulse,
  Home as HomeIcon,
  Lock,
  Mic,
  ScanLine,
  ShieldCheck,
  SquareCheckBig,
  Timer,
  UserCheck,
  Users,
  Wrench,
} from 'lucide-react';
import clsx from 'clsx';
import { Logo } from '@/components/brand';
import { ButtonLink, Card } from '@/components/ui';
import { LEGAL } from '@/lib/legal';

// cx is a plain re-export of clsx from the ('use client') ui module; calling a client module's
// export directly (rather than rendering it as a component) isn't allowed from a server component,
// so this page imports clsx itself instead.
const cx = clsx;

// Public landing page: indexable, unlike the signed-in app (the parent layout defaults to noindex).
export const metadata: Metadata = {
  title: 'LifeSphere — Privacy-first life, family care and community management',
  description:
    'LifeSphere keeps your tasks, your home, your parent’s daily check-ins, your neighbourhood and your documents organised in one place — with every share a consent-based choice, never silent tracking. Free to start.',
  robots: { index: true, follow: true },
};

const AUDIENCES = [
  { icon: HeartHandshake, title: 'Caregivers with an ageing parent', body: 'Know your parent is okay today, see her medicines were taken, and get one tap to call or help — without a daily check-in phone call.' },
  { icon: UserCheck, title: 'Someone who wants their family to look out for them', body: 'You decide exactly what’s shared and with whom. Nothing is watched without your say-so, and you can take it back any time.' },
  { icon: HomeIcon, title: 'A household running on one income, many schedules', body: 'Shared shopping lists, a home inventory with warranty reminders, and a budget everyone can see — instead of one person’s private mental ledger.' },
  { icon: Users, title: 'Neighbours and local communities', body: 'Report a broken streetlight, find a trustworthy local repair person, or just stay in the loop with people nearby.' },
];

const PROBLEMS = [
  { problem: 'An ageing parent lives far away and you worry every day.', solution: 'Daily check-ins and medicine reminders that quietly alert you — only you — if something’s missed.' },
  { problem: 'Family-tracking apps feel like surveillance, not care.', solution: 'Every share is a named, revocable permission the person being watched grants themselves.' },
  { problem: 'Paper bills, prescriptions and warranty cards pile up, unread.', solution: 'Photograph them into the Smart Inbox and they become real tasks, reminders and records.' },
  { problem: 'A civic complaint or consumer dispute goes nowhere.', solution: 'Structured reporting routed toward the right channel, kept as a case you can track.' },
  { problem: 'An elder living alone has nobody to talk to between visits.', solution: 'An honest, boundaried companion chat — never pretending to be a friend — that tells family if something sounds wrong.' },
  { problem: 'Most apps assume one language, one country, one user.', solution: '10 languages, right-to-left support, and local emergency numbers and currencies for ~200 countries.' },
];

const AREAS = [
  {
    icon: HeartPulse,
    title: 'Family & Elder Care',
    body: 'Daily check-ins, medicine reminders, one-tap Get Help, a weekly care summary, caregiver-proposed reminders the parent approves, and an opt-in companion chat — all built so the person being cared for stays in control.',
  },
  {
    icon: SquareCheckBig,
    title: 'Personal & Home Life',
    body: 'Tasks, reminders and a shared calendar; household-wide shopping lists, a home inventory with renewal reminders, and a budget everyone in the house can see and trust.',
  },
  {
    icon: ScanLine,
    title: 'Documents & Smart Assistants',
    body: 'A document vault with a Smart Inbox that reads photographed bills and prescriptions into real records, a read-only voice assistant, and scoped AI agents for email and files — each limited to exactly what you grant it.',
  },
  {
    icon: Building2,
    title: 'Community & Local Services',
    body: 'Neighbourhood groups and posts, structured civic-issue reporting, a local services directory with a provider portal for small businesses, and a consumer-complaint tracker that keeps your case on record.',
  },
  {
    icon: ShieldCheck,
    title: 'Trust, Privacy & Global Access',
    body: 'Scoped, revocable sharing with a cooling-off period; a full data export and published retention limits; 10 languages with right-to-left support; and an installable, offline-capable app for every connection and every device.',
  },
];

const DEMO = [
  {
    label: 'Family check-in',
    icon: HeartPulse,
    tone: 'brand' as const,
    body: (
      <div className="flex flex-col items-center gap-3 py-2 text-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-brand text-brand-ink shadow-sm">
          <CheckCircle2 className="size-8" aria-hidden />
        </div>
        <p className="font-display text-lg font-semibold text-ink">I&apos;m OK</p>
        <p className="text-sm text-muted">Priya checked in at 9:02 AM &middot; medicines taken</p>
      </div>
    ),
  },
  {
    label: 'Smart Inbox',
    icon: ScanLine,
    tone: 'accent' as const,
    body: (
      <div className="space-y-2.5 py-1">
        {[
          { label: 'Prescription photo', detail: '→ 2 medicine reminders', icon: HeartPulse },
          { label: 'Electricity bill', detail: '→ added to Budget', icon: Timer },
          { label: 'Warranty card', detail: '→ renewal reminder set', icon: Wrench },
        ].map((r) => (
          <div key={r.label} className="flex items-center gap-2.5 rounded-xl bg-surface-2 px-3 py-2 text-left text-sm">
            <r.icon className="size-4 shrink-0 text-accent" aria-hidden />
            <span className="min-w-0 flex-1 truncate text-ink">{r.label}</span>
            <span className="shrink-0 text-xs font-medium text-muted">{r.detail}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    label: 'Voice assistant',
    icon: Mic,
    tone: 'brand' as const,
    body: (
      <div className="space-y-2.5 py-1">
        <div className="ml-auto max-w-[80%] rounded-2xl bg-brand px-3.5 py-2 text-sm text-brand-ink">What do I have today?</div>
        <div className="max-w-[85%] rounded-2xl bg-surface-2 px-3.5 py-2 text-sm text-ink">3 tasks, a check-in at 6 PM, and your water bill is due Friday.</div>
      </div>
    ),
  },
];

function Section({ id, className, children }: { id?: string; className?: string; children: React.ReactNode }) {
  return (
    <section id={id} className={cx('mx-auto max-w-6xl px-5 py-16 sm:px-6 lg:py-20', className)}>
      {children}
    </section>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="text-sm font-semibold tracking-wide text-brand uppercase">{children}</p>;
}

export default function LandingPage() {
  return (
    <div className="min-h-dvh bg-bg">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-line bg-bg/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3.5 sm:px-6">
          <Logo />
          <nav className="hidden items-center gap-6 text-sm font-semibold text-ink-2 sm:flex">
            <a href="#areas" className="hover:text-ink">
              Features
            </a>
            <a href="#privacy" className="hover:text-ink">
              Privacy
            </a>
            <Link href="/guide" className="hover:text-ink">
              Guide
            </Link>
          </nav>
          <div className="flex items-center gap-2.5">
            <ButtonLink href="/sign-in" variant="ghost" size="sm" className="hidden sm:inline-flex">
              Sign in
            </ButtonLink>
            <ButtonLink href="/sign-in" variant="primary" size="sm">
              Start Free Demo
            </ButtonLink>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="relative overflow-hidden bg-[#062f2d] text-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/sign-in-sky.svg" alt="" aria-hidden className="pointer-events-none absolute inset-0 size-full object-cover object-top opacity-80" />
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_55%_at_50%_100%,rgb(243_166_96/0.75),rgb(201_112_63/0.3)_45%,transparent_75%)]" />
        <div className="relative mx-auto max-w-6xl px-5 py-20 sm:px-6 lg:py-28">
          <div className="max-w-2xl [text-shadow:0_1px_14px_rgb(3_30_28/0.55)]">
            <p className="text-sm font-semibold tracking-wide text-white/80 uppercase">Privacy-first, for your whole life</p>
            <h1 className="mt-3 font-display text-[2.4rem] leading-[1.08] font-semibold sm:text-[3.1rem]">One app for your day, your family, your home and your neighbourhood.</h1>
            <p className="mt-5 max-w-xl text-lg text-white/90">
              LifeSphere brings tasks, family check-ins, home management, local community tools and your documents into one place — and keeps every single share a choice the
              person it&apos;s about makes themselves, never a tracking switch someone else flips on for them.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <ButtonLink href="/sign-in" variant="primary" size="xl" className="shadow-lg">
                Start Free Demo
              </ButtonLink>
              <a href="#areas" className="inline-flex h-16 items-center px-2 text-base font-semibold text-white/90 underline-offset-4 hover:underline">
                See how it works &rarr;
              </a>
            </div>
            <p className="mt-5 text-sm text-white/70">Free to use. No credit card. Set up in a few minutes.</p>
          </div>
        </div>
        <div aria-hidden className="relative -mt-2 h-28 sm:h-36">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/sign-in-town.svg" alt="" className="pointer-events-none absolute inset-0 size-full object-cover object-bottom" />
        </div>
      </div>

      {/* What LifeSphere is */}
      <Section>
        <div className="grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
          <div>
            <Eyebrow>What LifeSphere is</Eyebrow>
            <h2 className="mt-2 font-display text-3xl font-semibold text-ink">The dozen apps a family actually needs, replaced by one — and none of them watching you by default.</h2>
            <p className="mt-4 text-[1.05rem] leading-relaxed text-ink-2">
              Most households run on a patchwork: a to-do app, a family WhatsApp group, a paper medicine chart on the fridge, a folder of scanned documents, a civic-complaint
              portal nobody checks. LifeSphere is a single, privacy-first platform that replaces that patchwork — personal organisation, shared home management, consent-based
              family care, community and civic tools, and document automation, all connected, none of it visible to anyone else until you say so.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: Globe2, stat: '10', label: 'languages, with full right-to-left support' },
              { icon: BellRing, stat: '200', label: 'countries with the right emergency number & currency' },
              { icon: Lock, stat: '0', label: 'default visibility — every share is granted, not assumed' },
              { icon: HeartHandshake, stat: 'Free', label: 'to use, with no credit card to start' },
            ].map((s) => (
              <Card key={s.label} className="p-5">
                <s.icon className="size-6 text-brand" aria-hidden />
                <p className="mt-3 font-display text-2xl font-semibold text-ink">{s.stat}</p>
                <p className="mt-1 text-sm text-muted">{s.label}</p>
              </Card>
            ))}
          </div>
        </div>
      </Section>

      {/* Who should use it */}
      <Section className="bg-surface-2/60">
        <Eyebrow>Who it&apos;s for</Eyebrow>
        <h2 className="mt-2 font-display text-3xl font-semibold text-ink">Built for the people most apps design around last.</h2>
        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          {AUDIENCES.map((a) => (
            <Card key={a.title} className="flex gap-4 p-6">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
                <a.icon className="size-5.5" aria-hidden />
              </div>
              <div>
                <h3 className="font-semibold text-ink">{a.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{a.body}</p>
              </div>
            </Card>
          ))}
        </div>
      </Section>

      {/* Problems it solves */}
      <Section>
        <Eyebrow>What it solves</Eyebrow>
        <h2 className="mt-2 font-display text-3xl font-semibold text-ink">Real, everyday problems — not features for their own sake.</h2>
        <div className="mt-8 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
          {PROBLEMS.map((p) => (
            <div key={p.problem} className="grid gap-2 p-5 sm:grid-cols-2 sm:gap-6 sm:p-6">
              <p className="text-[0.98rem] font-medium text-ink-2">{p.problem}</p>
              <p className="flex items-start gap-2 text-[0.98rem] text-ink">
                <CheckCircle2 className="mt-0.5 size-4.5 shrink-0 text-brand" aria-hidden />
                <span>{p.solution}</span>
              </p>
            </div>
          ))}
        </div>
      </Section>

      {/* Five product areas */}
      <Section id="areas" className="bg-surface-2/60">
        <Eyebrow>Five ways LifeSphere helps</Eyebrow>
        <h2 className="mt-2 font-display text-3xl font-semibold text-ink">One app, five connected product areas.</h2>
        <div className="mt-8 grid gap-5 lg:grid-cols-3">
          {AREAS.map((a, i) => (
            <Card key={a.title} className={cx('p-6', i === 3 && 'lg:col-start-1', i === 4 && 'lg:col-span-1')}>
              <div className="flex size-12 items-center justify-center rounded-xl bg-brand text-brand-ink">
                <a.icon className="size-6" aria-hidden />
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold text-ink">{a.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{a.body}</p>
            </Card>
          ))}
        </div>
      </Section>

      {/* Privacy approach */}
      <Section id="privacy">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
          <div>
            <Eyebrow>Why our privacy approach is different</Eyebrow>
            <h2 className="mt-2 font-display text-3xl font-semibold text-ink">Care, not control. The person being helped stays in charge.</h2>
            <p className="mt-4 text-[1.05rem] leading-relaxed text-ink-2">
              Most family-safety apps are built for the watcher: a parent tracking a child, functionally, even when the person on the other end is a grown adult. LifeSphere
              inverts that. Sharing anything — check-ins, a calendar, a location during an emergency — is a named, scoped, revocable permission that the person it&apos;s
              about grants themselves, usually after a cooling-off delay, with a notice they can see and an audit trail they control.
            </p>
            <ul className="mt-6 space-y-3 text-[0.98rem] text-ink-2">
              <li className="flex gap-2.5">
                <ShieldCheck className="mt-0.5 size-5 shrink-0 text-brand" aria-hidden />
                <span>Scoped grants — &quot;see my check-ins&quot; is a different permission from &quot;see my calendar,&quot; never one all-or-nothing switch.</span>
              </li>
              <li className="flex gap-2.5">
                <ShieldCheck className="mt-0.5 size-5 shrink-0 text-brand" aria-hidden />
                <span>A cooling-off period and a notice before any share takes effect — nothing happens silently.</span>
              </li>
              <li className="flex gap-2.5">
                <ShieldCheck className="mt-0.5 size-5 shrink-0 text-brand" aria-hidden />
                <span>Revocable at any time, by the person who granted it — never by the person receiving it.</span>
              </li>
              <li className="flex gap-2.5">
                <ShieldCheck className="mt-0.5 size-5 shrink-0 text-brand" aria-hidden />
                <span>Published retention limits, a full data export, and a named grievance contact — not a boilerplate policy nobody reads.</span>
              </li>
            </ul>
            <Link href="/legal/privacy" className="mt-6 inline-block text-sm font-semibold text-brand hover:underline">
              Read the full Privacy Policy &rarr;
            </Link>
          </div>
          <Card className="self-start p-7">
            <h3 className="font-display text-lg font-semibold text-ink">A typical family-tracking app</h3>
            <ul className="mt-4 space-y-2.5 text-sm text-muted">
              <li>&times; One connection shares everything, always</li>
              <li>&times; The watched person can&apos;t see what&apos;s shared</li>
              <li>&times; No way to take sharing back quietly</li>
            </ul>
            <div className="my-5 border-t border-line" />
            <h3 className="font-display text-lg font-semibold text-ink">LifeSphere</h3>
            <ul className="mt-4 space-y-2.5 text-sm text-ink-2">
              <li className="flex gap-2">
                <CheckCircle2 className="size-4.5 shrink-0 text-brand" aria-hidden /> Grant exactly what you choose, scope by scope
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="size-4.5 shrink-0 text-brand" aria-hidden /> See and review every grant, any time
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="size-4.5 shrink-0 text-brand" aria-hidden /> Revoke a share yourself, with no explanation owed
              </li>
            </ul>
          </Card>
        </div>
      </Section>

      {/* Demo / screenshots */}
      <Section className="bg-surface-2/60">
        <Eyebrow>See it in action</Eyebrow>
        <h2 className="mt-2 font-display text-3xl font-semibold text-ink">A quick look at three everyday moments.</h2>
        <div className="mt-8 grid gap-5 sm:grid-cols-3">
          {DEMO.map((d) => (
            <div key={d.label} className="overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
              <div className="flex items-center gap-2 border-b border-line bg-surface-2 px-4 py-2.5">
                <d.icon className="size-4 text-brand" aria-hidden />
                <span className="text-sm font-semibold text-ink">{d.label}</span>
              </div>
              <div className="p-4">{d.body}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* Final CTA */}
      <Section>
        <div className="overflow-hidden rounded-3xl bg-brand px-6 py-14 text-center text-brand-ink sm:px-14">
          <h2 className="font-display text-3xl font-semibold sm:text-4xl">Ready to bring your family, home and neighbourhood into one place?</h2>
          <p className="mx-auto mt-3 max-w-xl text-brand-ink/90">Free to start, in your language, with every share on your own terms.</p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <ButtonLink href="/sign-in" variant="secondary" size="xl" className="shadow-lg">
              Start Free Demo
            </ButtonLink>
          </div>
        </div>
      </Section>

      {/* Footer */}
      <footer className="border-t border-line bg-surface">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>
            {LEGAL.product} is provided by <strong className="text-ink">{LEGAL.company}</strong>.
          </p>
          <nav className="flex flex-wrap gap-x-5 gap-y-2">
            <Link href="/guide" className="hover:text-ink hover:underline">
              Guide
            </Link>
            <Link href="/legal" className="hover:text-ink hover:underline">
              Terms &amp; Privacy
            </Link>
            <Link href="/legal/grievance" className="hover:text-ink hover:underline">
              Grievance Officer
            </Link>
            <Link href="/sign-in" className="hover:text-ink hover:underline">
              Sign in
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
