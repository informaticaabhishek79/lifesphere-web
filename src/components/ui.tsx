'use client';

import clsx from 'clsx';
import Link from 'next/link';
import { forwardRef } from 'react';
import { AlertTriangle, CheckCircle2, Info, Loader2, ShieldAlert } from 'lucide-react';
import { ApiError } from '@/lib/api';
import { useI18n } from '@/i18n';

export const cx = clsx;

// ------------------------------------------------------------------ Button
type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'soft' | 'link';
type Size = 'sm' | 'md' | 'lg' | 'xl';

const variants: Record<Variant, string> = {
  primary: 'bg-brand text-brand-ink hover:bg-brand-hover border border-transparent shadow-sm',
  secondary: 'bg-surface text-ink border border-line-strong hover:bg-surface-2',
  ghost: 'bg-transparent text-ink-2 hover:bg-bg-2 border border-transparent',
  danger: 'bg-danger text-white hover:bg-danger-hover border border-transparent shadow-sm',
  soft: 'bg-brand-soft text-brand hover:bg-brand-softer border border-transparent',
  link: 'bg-transparent text-brand underline-offset-4 hover:underline border-0 px-0 h-auto',
};
const sizes: Record<Size, string> = {
  sm: 'h-9 px-3 text-sm gap-1.5 rounded-lg',
  md: 'h-11 px-4 text-[0.95rem] gap-2 rounded-xl',
  lg: 'h-13 px-5 text-base gap-2 rounded-xl',
  xl: 'h-16 px-6 text-lg gap-3 rounded-2xl',
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, icon, className, children, disabled, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cx(
        'inline-flex items-center justify-center font-semibold whitespace-nowrap transition-colors disabled:opacity-55 disabled:cursor-not-allowed select-none',
        variants[variant],
        variant !== 'link' && sizes[size],
        className,
      )}
      {...rest}
    >
      {loading ? <Loader2 className="size-[1.1em] animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  );
});

export function ButtonLink({
  href,
  variant = 'primary',
  size = 'md',
  icon,
  className,
  children,
  ...rest
}: { href: string; variant?: Variant; size?: Size; icon?: React.ReactNode; className?: string; children?: React.ReactNode } & Omit<
  React.AnchorHTMLAttributes<HTMLAnchorElement>,
  'href'
>) {
  return (
    <Link
      href={href}
      className={cx('inline-flex items-center justify-center font-semibold whitespace-nowrap transition-colors', variants[variant], variant !== 'link' && sizes[size], className)}
      {...rest}
    >
      {icon}
      {children}
    </Link>
  );
}

export function IconButton({ label, className, children, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cx('inline-flex size-10 items-center justify-center rounded-xl text-ink-2 hover:bg-bg-2 transition-colors', className)}
      {...rest}
    >
      {children}
    </button>
  );
}

// ------------------------------------------------------------------ Layout pieces
export function PageHeader({
  title,
  description,
  actions,
  back,
  eyebrow,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  back?: { href: string; label: string };
  eyebrow?: React.ReactNode;
}) {
  return (
    <header className="mb-6 rise">
      {back && (
        <Link href={back.href} className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-ink">
          <span aria-hidden className="flip-rtl inline-block">←</span> {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          {eyebrow && <div className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-accent">{eyebrow}</div>}
          <h1 className="font-display text-[1.9rem] leading-tight font-semibold text-ink sm:text-[2.2rem]">{title}</h1>
          {description && <p className="mt-1.5 max-w-2xl text-[0.98rem] text-muted">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}

export function Card({ className, children, as: As = 'section', ...rest }: React.HTMLAttributes<HTMLElement> & { as?: 'section' | 'div' | 'article' | 'li' }) {
  return (
    <As className={cx('card', className)} {...rest}>
      {children}
    </As>
  );
}

export function CardHeader({ title, action, description, icon }: { title: React.ReactNode; action?: React.ReactNode; description?: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3">
      <div className="flex min-w-0 items-start gap-3">
        {icon && <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">{icon}</div>}
        <div className="min-w-0">
          <h2 className="text-[1.05rem] font-semibold text-ink">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function CardBody({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cx('px-5 pb-5', className)}>{children}</div>;
}

export function Section({ title, description, action, children, className }: { title?: React.ReactNode; description?: React.ReactNode; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cx('mb-8', className)}>
      {(title || action) && (
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            {title && <h2 className="text-lg font-semibold text-ink">{title}</h2>}
            {description && <p className="text-sm text-muted">{description}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

// ------------------------------------------------------------------ Feedback
type Tone = 'neutral' | 'brand' | 'ok' | 'warn' | 'danger' | 'info' | 'accent';
const tones: Record<Tone, string> = {
  neutral: 'bg-bg-2 text-ink-2',
  brand: 'bg-brand-soft text-brand',
  ok: 'bg-ok-soft text-ok',
  warn: 'bg-warn-soft text-warn',
  danger: 'bg-danger-soft text-danger',
  info: 'bg-info-soft text-info',
  accent: 'bg-accent-soft text-accent',
};

export function Badge({ tone = 'neutral', children, className, title }: { tone?: Tone; children: React.ReactNode; className?: string; title?: string }) {
  return (
    <span title={title} className={cx('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap', tones[tone], className)}>
      {children}
    </span>
  );
}

export function Notice({ tone = 'info', title, children, action, className }: { tone?: 'info' | 'warn' | 'danger' | 'ok' | 'brand'; title?: React.ReactNode; children?: React.ReactNode; action?: React.ReactNode; className?: string }) {
  const Icon = tone === 'danger' ? ShieldAlert : tone === 'warn' ? AlertTriangle : tone === 'ok' ? CheckCircle2 : Info;
  return (
    <div role={tone === 'danger' ? 'alert' : 'status'} className={cx('flex gap-3 rounded-xl px-4 py-3 text-sm', tones[tone], className)}>
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">
        {title && <div className="font-semibold">{title}</div>}
        {children && <div className={cx(title && 'mt-0.5', 'opacity-95')}>{children}</div>}
      </div>
      {action}
    </div>
  );
}

export function ErrorNotice({ error, onRetry, className }: { error: unknown; onRetry?: () => void; className?: string }) {
  const { t } = useI18n();
  if (!error) return null;
  const msg = errorMessage(error, t);
  return (
    <Notice
      tone="danger"
      className={className}
      title={error instanceof ApiError && error.status > 0 && error.status < 500 ? undefined : t('common.somethingWrong')}
      action={
        onRetry && (
          <button type="button" onClick={onRetry} className="text-sm font-semibold underline">
            {t('common.retry')}
          </button>
        )
      }
    >
      {msg}
    </Notice>
  );
}

export function errorMessage(error: unknown, t: (k: string) => string): string {
  if (error instanceof ApiError) {
    const translated = t(`errors.${error.code}`);
    if (translated && translated !== error.code) return translated;
    if (error.status === 404) return t('common.notFound');
    if (error.status === 429) return t('errors.rate_limited');
    return error.detail ?? t('common.somethingWrong');
  }
  if (error instanceof Error) return error.message;
  return t('common.somethingWrong');
}

export function Spinner({ className, label }: { className?: string; label?: string }) {
  return (
    <span role="status" className={cx('inline-flex items-center gap-2 text-muted', className)}>
      <Loader2 className="size-5 animate-spin" aria-hidden />
      {label && <span className="text-sm">{label}</span>}
    </span>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx('skeleton', className)} aria-hidden />;
}

export function LoadingBlock({ rows = 3 }: { rows?: number }) {
  const { t } = useI18n();
  return (
    <div className="space-y-3" aria-busy="true" aria-label={t('common.loading')}>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-16 w-full" />
      ))}
    </div>
  );
}

export function EmptyState({ icon, title, body, action, className }: { icon?: React.ReactNode; title: React.ReactNode; body?: React.ReactNode; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cx('flex flex-col items-center rounded-2xl border border-dashed border-line-strong bg-surface-2 px-6 py-10 text-center', className)}>
      {icon && <div className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-brand-soft text-brand">{icon}</div>}
      <div className="text-base font-semibold text-ink">{title}</div>
      {body && <p className="mt-1 max-w-md text-sm text-muted">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Avatar({ name, size = 'md', className }: { name?: string | null; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const initials = (name ?? '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');
  const palette = ['bg-brand-soft text-brand', 'bg-accent-soft text-accent', 'bg-info-soft text-info', 'bg-ok-soft text-ok', 'bg-warn-soft text-warn'];
  const idx = [...(name ?? '')].reduce((a, c) => a + c.charCodeAt(0), 0) % palette.length;
  const s = size === 'sm' ? 'size-8 text-xs' : size === 'lg' ? 'size-14 text-lg' : 'size-10 text-sm';
  return (
    <span aria-hidden className={cx('inline-flex shrink-0 items-center justify-center rounded-full font-bold', palette[idx], s, className)}>
      {initials || '?'}
    </span>
  );
}

// ------------------------------------------------------------------ Lists
export function List({ children, className }: { children: React.ReactNode; className?: string }) {
  return <ul className={cx('card divide-y divide-line overflow-hidden', className)}>{children}</ul>;
}

export function ListItem({
  href,
  onClick,
  leading,
  title,
  subtitle,
  meta,
  trailing,
  className,
}: {
  href?: string;
  onClick?: () => void;
  leading?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  meta?: React.ReactNode;
  trailing?: React.ReactNode;
  className?: string;
}) {
  const inner = (
    <>
      {leading && <div className="shrink-0">{leading}</div>}
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium text-ink">{title}</div>
        {subtitle && <div className="mt-0.5 line-clamp-2 text-sm text-muted">{subtitle}</div>}
        {meta && <div className="mt-1.5 flex flex-wrap items-center gap-1.5">{meta}</div>}
      </div>
      {trailing && <div className="flex shrink-0 items-center gap-2">{trailing}</div>}
    </>
  );
  const cls = cx('flex items-center gap-3 px-4 py-3.5', (href || onClick) && 'hover:bg-surface-2 transition-colors', className);
  return (
    <li>
      {href ? (
        <Link href={href} className={cls}>
          {inner}
        </Link>
      ) : onClick ? (
        <button type="button" onClick={onClick} className={cx(cls, 'w-full text-start')}>
          {inner}
        </button>
      ) : (
        <div className={cls}>{inner}</div>
      )}
    </li>
  );
}

export function Tabs<T extends string>({ tabs, value, onChange, className }: { tabs: { value: T; label: React.ReactNode; count?: number }[]; value: T; onChange: (v: T) => void; className?: string }) {
  return (
    <div role="tablist" className={cx('mb-5 flex gap-1 overflow-x-auto rounded-xl bg-bg-2 p-1 scrollbar-thin', className)}>
      {tabs.map((tab) => (
        <button
          key={tab.value}
          role="tab"
          type="button"
          aria-selected={value === tab.value}
          onClick={() => onChange(tab.value)}
          className={cx(
            'flex shrink-0 items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors',
            value === tab.value ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink',
          )}
        >
          {tab.label}
          {tab.count !== undefined && tab.count > 0 && <span className="rounded-full bg-brand px-1.5 text-[0.7rem] text-brand-ink">{tab.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function KeyValue({ items, className }: { items: { label: React.ReactNode; value: React.ReactNode }[]; className?: string }) {
  return (
    <dl className={cx('grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2', className)}>
      {items
        .filter((i) => i.value !== undefined && i.value !== null && i.value !== '')
        .map((i, idx) => (
          <div key={idx} className="min-w-0">
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted">{i.label}</dt>
            <dd className="mt-0.5 break-words text-ink">{i.value}</dd>
          </div>
        ))}
    </dl>
  );
}

export function LoadMore({ hasMore, loading, onClick }: { hasMore: boolean; loading: boolean; onClick: () => void }) {
  const { t } = useI18n();
  if (!hasMore) return null;
  return (
    <div className="mt-4 flex justify-center">
      <Button variant="secondary" onClick={onClick} loading={loading}>
        {t('common.loadMore')}
      </Button>
    </div>
  );
}

export function Grid({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cx('grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3', className)}>{children}</div>;
}

export function Stat({ label, value, tone = 'neutral', href }: { label: React.ReactNode; value: React.ReactNode; tone?: Tone; href?: string }) {
  const body = (
    <>
      <div className="text-sm text-muted">{label}</div>
      <div className={cx('mt-1 text-2xl font-bold tabular-nums', tone === 'danger' ? 'text-danger' : tone === 'warn' ? 'text-warn' : tone === 'ok' ? 'text-ok' : 'text-ink')}>{value}</div>
    </>
  );
  return href ? (
    <Link href={href} className="card block px-4 py-3 hover:border-line-strong">
      {body}
    </Link>
  ) : (
    <div className="card px-4 py-3">{body}</div>
  );
}
