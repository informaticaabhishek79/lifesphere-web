import Link from 'next/link';
import type { Metadata } from 'next';
import { GuideLogo, GuideNav } from '@/components/guide';
import { LEGAL } from '@/lib/legal';

// Public and indexable, like the policies under /legal.
export const metadata: Metadata = {
  title: { default: 'How to Use LifeSphere', template: '%s · LifeSphere Guide' },
  description: 'A complete guide to every LifeSphere feature, with examples: tasks, family care, community, local services, documents and more.',
  robots: { index: true, follow: true },
};

export default function GuideLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-bg">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4">
          <Link href="/" aria-label="LifeSphere home">
            <GuideLogo />
          </Link>
          <Link href="/sign-in" className="text-sm font-semibold text-brand hover:underline">
            Open LifeSphere
          </Link>
        </div>
      </header>
      <div className="mx-auto grid max-w-6xl gap-8 px-5 py-8 lg:grid-cols-[16rem_1fr] lg:gap-12 lg:py-12">
        <aside className="lg:sticky lg:top-8 lg:self-start">
          <details className="rounded-2xl border border-line bg-surface p-2 lg:hidden">
            <summary className="cursor-pointer px-3 py-2 text-sm font-semibold text-ink">All topics</summary>
            <div className="mt-1">
              <GuideNav />
            </div>
          </details>
          <div className="hidden lg:block">
            <GuideNav />
          </div>
        </aside>
        <main className="min-w-0 max-w-3xl">{children}</main>
      </div>
      <footer className="border-t border-line bg-surface">
        <div className="mx-auto max-w-6xl px-5 py-6 text-sm text-muted">
          <p>
            {LEGAL.product} is provided by <strong className="text-ink">{LEGAL.company}</strong>. See the{' '}
            <Link href="/legal" className="text-brand underline">
              Terms, Privacy Policy and other policies
            </Link>
            .
          </p>
        </div>
      </footer>
    </div>
  );
}
