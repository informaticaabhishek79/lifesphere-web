import Link from 'next/link';
import type { Metadata } from 'next';
import { ChevronRight } from 'lucide-react';
import { GUIDE_TOPICS, guideHref } from '@/lib/guide';

export const metadata: Metadata = { title: 'How to Use LifeSphere' };

export default function GuideIndex() {
  return (
    <div>
      <h1 className="font-display text-3xl font-semibold text-ink sm:text-4xl">How to Use LifeSphere</h1>
      <p className="mt-2 max-w-2xl text-muted">
        LifeSphere is a personal organiser, family-care and neighbourhood app, all in one place and private by default. This guide walks through every feature with real examples. Pick a topic, or read top to bottom if you're just getting started.
      </p>
      <ul className="mt-8 grid list-none gap-3 p-0 sm:grid-cols-2">
        {GUIDE_TOPICS.map((p, i) => (
          <li key={p.slug}>
            <Link href={guideHref(p.slug)} className="group flex h-full items-start gap-3 rounded-2xl border border-line bg-surface p-5 no-underline transition-colors hover:border-brand">
              <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-bold text-brand">{i + 1}</span>
              <span className="flex-1">
                <span className="block font-semibold text-ink group-hover:text-brand">{p.title}</span>
                <span className="mt-1 block text-sm font-normal text-muted">{p.summary}</span>
              </span>
              <ChevronRight className="mt-0.5 size-5 shrink-0 text-muted group-hover:text-brand" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
      <div className="mt-10 rounded-2xl border border-line bg-surface p-5">
        <p className="font-semibold text-ink">Not finding what you need?</p>
        <p className="mt-1 text-sm text-ink-2">
          Inside the app, open <strong>Guides</strong> for short plain-language articles on consumer rights, civic services and safety, or ask the <strong>Assistant</strong> a question directly. For an account problem or a complaint, see{' '}
          <Link href="/legal/contact" className="font-semibold text-brand underline">
            Contact Us
          </Link>{' '}
          or the{' '}
          <Link href="/legal/grievance" className="font-semibold text-brand underline">
            Grievance Officer
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
