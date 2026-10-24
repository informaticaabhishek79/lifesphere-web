import Link from 'next/link';
import type { Metadata } from 'next';
import { LegalLogo, LegalNav } from '@/components/legal';
import { LEGAL } from '@/lib/legal';

// The policies are public: anyone, including search engines and app-store reviewers, may read and index them.
export const metadata: Metadata = {
  title: { default: 'Policies', template: '%s · LifeSphere' },
  description: 'LifeSphere Terms of Service, Privacy Policy and other policies, by Deemona Global Solutions.',
  robots: { index: true, follow: true },
};

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    // The policies are published in English, the language they are legally binding in.
    <div lang="en" dir="ltr" className="min-h-dvh bg-bg">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4">
          <Link href="/" aria-label="LifeSphere home">
            <LegalLogo />
          </Link>
          <Link href="/sign-in" className="text-sm font-semibold text-brand hover:underline">
            Open LifeSphere
          </Link>
        </div>
      </header>
      <div className="mx-auto grid max-w-6xl gap-8 px-5 py-8 lg:grid-cols-[15rem_1fr] lg:gap-12 lg:py-12">
        <aside className="lg:sticky lg:top-8 lg:self-start">
          <details className="rounded-2xl border border-line bg-surface p-2 lg:hidden">
            <summary className="cursor-pointer px-3 py-2 text-sm font-semibold text-ink">All policies</summary>
            <div className="mt-1">
              <LegalNav />
            </div>
          </details>
          <div className="hidden lg:block">
            <LegalNav />
          </div>
        </aside>
        <main className="min-w-0 max-w-3xl">{children}</main>
      </div>
      <footer className="border-t border-line bg-surface">
        <div className="mx-auto max-w-6xl px-5 py-6 text-sm text-muted">
          <p>
            {LEGAL.product} is provided by <strong className="text-ink">{LEGAL.company}</strong>, {LEGAL.address}.
          </p>
          <p className="mt-1">
            New to LifeSphere? Read{' '}
            <Link href="/guide" className="text-brand underline">
              how to use it
            </Link>
            .
          </p>
          <p className="mt-1">
            Grievance Officer: {LEGAL.grievanceOfficer.name},{' '}
            <a href={LEGAL.grievanceOfficer.phoneHref} className="text-brand underline">
              {LEGAL.grievanceOfficer.phone}
            </a>
            . In an emergency, call {LEGAL.emergencyNumber}.
          </p>
        </div>
      </footer>
    </div>
  );
}
