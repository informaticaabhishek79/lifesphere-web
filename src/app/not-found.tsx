import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="font-display text-5xl font-semibold text-brand">404</div>
      <p className="max-w-sm text-muted">This page doesn’t exist. यह पेज मौजूद नहीं है।</p>
      <Link href="/" className="rounded-xl bg-brand px-4 py-2.5 font-semibold text-brand-ink">
        LifeSphere
      </Link>
    </div>
  );
}
