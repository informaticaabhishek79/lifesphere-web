import clsx from 'clsx';

// Logo has no client-only behavior (no hooks, no handlers) and is rendered from plain server
// components too (e.g. the public landing page), so it imports clsx directly rather than the
// ('use client') ui module's cx re-export — calling a client module's export directly from
// server code throws, even for a trivial helper like this one.
const cx = clsx;

/** LifeSphere mark: a sphere held by two arcs — personal life inside, people around it. */
export function Logo({ className, withWord = true }: { className?: string; withWord?: boolean }) {
  return (
    <span className={cx('inline-flex items-center gap-2.5', className)}>
      <svg viewBox="0 0 40 40" className="size-9 shrink-0" aria-hidden>
        <circle cx="20" cy="20" r="18" fill="var(--brand)" />
        <circle cx="20" cy="20" r="8.5" fill="var(--bg)" />
        <path d="M7 24c3 7 10 10 16 9" stroke="var(--accent)" strokeWidth="3.2" fill="none" strokeLinecap="round" />
        <path d="M33 16c-3-7-10-10-16-9" stroke="var(--brand-soft)" strokeWidth="3.2" fill="none" strokeLinecap="round" />
        <circle cx="20" cy="20" r="3.4" fill="var(--accent)" />
      </svg>
      {withWord && <span className="font-display text-[1.35rem] font-semibold tracking-tight text-ink">LifeSphere</span>}
    </span>
  );
}
