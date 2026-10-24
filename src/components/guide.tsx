'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Lightbulb } from 'lucide-react';
import { GUIDE_TOPICS, guideHref } from '@/lib/guide';
import { Logo } from './brand';
import { cx } from './ui';

/** The logo, rendered on the client like elsewhere in the app. */
export function GuideLogo() {
  return <Logo />;
}

/** Left-hand list of every topic, highlighting the one being read. */
export function GuideNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Guide topics" className="text-sm">
      <Link href="/guide" className={cx('block rounded-lg px-3 py-2 font-semibold hover:bg-surface-2', pathname === '/guide' ? 'bg-brand-soft text-brand' : 'text-ink')}>
        All topics
      </Link>
      <ul className="mt-1 space-y-0.5">
        {GUIDE_TOPICS.map((p) => {
          const active = pathname === guideHref(p.slug);
          return (
            <li key={p.slug}>
              <Link href={guideHref(p.slug)} aria-current={active ? 'page' : undefined} className={cx('block rounded-lg px-3 py-2 hover:bg-surface-2', active ? 'bg-brand-soft font-semibold text-brand' : 'text-ink-2')}>
                {p.title}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** A topic page: title, a plain-language summary, then numbered sections. */
export function GuideArticle({ title, summary, children }: { title: string; summary: React.ReactNode; children: React.ReactNode }) {
  return (
    <article className="legal-prose">
      <h1 className="font-display text-3xl font-semibold text-ink sm:text-4xl">{title}</h1>
      <div className="mt-6 rounded-2xl bg-brand-softer p-5 text-[0.95rem] text-ink not-prose">{summary}</div>
      <div className="mt-8">{children}</div>
    </article>
  );
}

export function GuideSection({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
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

/** A worked example: "Say you want to X — here's how." */
export function Example({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="not-prose my-4 rounded-xl border border-line bg-surface p-4 text-sm">
      <p className="mb-1.5 flex items-center gap-1.5 font-semibold text-ink">
        <Lightbulb className="size-4 shrink-0 text-accent" aria-hidden />
        {title}
      </p>
      <div className="space-y-1.5 text-ink-2 [&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:ps-5 [&_p]:leading-relaxed">{children}</div>
    </div>
  );
}

/** "Topic name" link to another guide topic. */
export function G({ slug, children }: { slug: string; children?: React.ReactNode }) {
  const t = GUIDE_TOPICS.find((x) => x.slug === slug);
  return <Link href={guideHref(slug)}>{children ?? t?.title ?? slug}</Link>;
}
