'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LEGAL, POLICIES, policyHref } from '@/lib/legal';
import { Logo } from './brand';
import { cx } from './ui';

/** The logo, rendered on the client like elsewhere in the app. */
export function LegalLogo() {
  return <Logo />;
}

/** Left-hand list of every policy, highlighting the one being read. */
export function LegalNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Policies" className="text-sm">
      <Link href="/legal" className={cx('block rounded-lg px-3 py-2 font-semibold hover:bg-surface-2', pathname === '/legal' ? 'bg-brand-soft text-brand' : 'text-ink')}>
        All policies
      </Link>
      <ul className="mt-1 space-y-0.5">
        {POLICIES.map((p) => {
          const active = pathname === policyHref(p.slug);
          return (
            <li key={p.slug}>
              <Link href={policyHref(p.slug)} aria-current={active ? 'page' : undefined} className={cx('block rounded-lg px-3 py-2 hover:bg-surface-2', active ? 'bg-brand-soft font-semibold text-brand' : 'text-ink-2')}>
                {p.title}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** The grievance officer's details, shown on several pages. */
export function GrievanceCard() {
  const g = LEGAL.grievanceOfficer;
  return (
    <div className="rounded-2xl border border-line bg-surface p-5 not-prose">
      <p className="text-xs font-semibold tracking-wide text-muted uppercase">{g.designation}</p>
      <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[8rem_1fr]">
        <dt className="text-muted">Name</dt>
        <dd className="font-semibold text-ink">{g.name}</dd>
        <dt className="text-muted">Company</dt>
        <dd className="text-ink">{LEGAL.company}</dd>
        <dt className="text-muted">Address</dt>
        <dd className="text-ink">{LEGAL.address}</dd>
        <dt className="text-muted">Phone</dt>
        <dd>
          <a href={g.phoneHref} className="font-semibold text-brand underline">
            {g.phone}
          </a>
        </dd>
        {g.email && (
          <>
            <dt className="text-muted">Email</dt>
            <dd>
              <a href={`mailto:${g.email}`} className="font-semibold text-brand underline">
                {g.email}
              </a>
            </dd>
          </>
        )}
        <dt className="text-muted">Hours</dt>
        <dd className="text-ink">{LEGAL.hours}</dd>
      </dl>
    </div>
  );
}

/** A policy page: title, dates, a plain-language summary, then numbered sections. */
export function Policy({ title, summary, children }: { title: string; summary: React.ReactNode; children: React.ReactNode }) {
  return (
    <article className="legal-prose">
      <h1 className="font-display text-3xl font-semibold text-ink sm:text-4xl">{title}</h1>
      <p className="mt-2 text-sm text-muted">
        Last updated {LEGAL.updated} · Applies to {LEGAL.product}, provided by {LEGAL.company}
      </p>
      <div className="mt-6 rounded-2xl bg-brand-softer p-5 text-[0.95rem] text-ink not-prose">
        <p className="mb-1 text-xs font-semibold tracking-wide text-brand uppercase">In short</p>
        {summary}
      </div>
      <div className="mt-8">{children}</div>
    </article>
  );
}

export function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2>
        <a href={`#${id}`} className="no-underline hover:underline">
          {title}
        </a>
      </h2>
      {children}
    </section>
  );
}

/** "Policy name" link to another policy. */
export function P({ slug, children }: { slug: string; children?: React.ReactNode }) {
  const p = POLICIES.find((x) => x.slug === slug);
  return <Link href={policyHref(slug)}>{children ?? p?.title ?? slug}</Link>;
}
