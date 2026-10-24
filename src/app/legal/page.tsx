import Link from 'next/link';
import type { Metadata } from 'next';
import { ChevronRight } from 'lucide-react';
import { GrievanceCard } from '@/components/legal';
import { LEGAL, POLICIES, policyHref } from '@/lib/legal';

export const metadata: Metadata = { title: 'All policies' };

export default function LegalIndex() {
  return (
    <div>
      <h1 className="font-display text-3xl font-semibold text-ink sm:text-4xl">Policies</h1>
      <p className="mt-2 text-muted">
        Everything that governs your use of {LEGAL.product}, in plain language. Last updated {LEGAL.updated}.
      </p>
      <ul className="mt-8 grid gap-3 sm:grid-cols-2">
        {POLICIES.map((p) => (
          <li key={p.slug}>
            <Link href={policyHref(p.slug)} className="group flex h-full items-start justify-between gap-3 rounded-2xl border border-line bg-surface p-5 no-underline transition-colors hover:border-brand">
              <span>
                <span className="block font-semibold text-ink group-hover:text-brand">{p.title}</span>
                <span className="mt-1 block text-sm font-normal text-muted">{p.summary}</span>
              </span>
              <ChevronRight className="mt-0.5 size-5 shrink-0 text-muted group-hover:text-brand" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
      <div className="legal-prose">
        <h2>Detailed data inventory</h2>
        <p>
          For a field-by-field list of every piece of personal data LifeSphere holds — why, who can see it, how long it is kept and what happens when you withdraw consent — see the{' '}
          <Link href="/privacy-notice">privacy notice and data inventory</Link>.
        </p>
        <h2>Questions or complaints</h2>
        <GrievanceCard />
      </div>
    </div>
  );
}
