'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShieldAlert } from 'lucide-react';
import { useSession } from '@/lib/session';
import { useI18n } from '@/i18n';
import { ButtonLink, cx, EmptyState, Notice } from '@/components/ui';

const SECTIONS: { href: string; label: string; roles: string[] }[] = [
  { href: '/admin', label: 'Overview', roles: [] },
  { href: '/admin/users', label: 'Users', roles: ['support'] },
  { href: '/admin/moderation', label: 'Moderation', roles: ['moderator'] },
  { href: '/admin/providers', label: 'Providers', roles: ['provider_reviewer'] },
  { href: '/admin/privacy', label: 'Privacy requests', roles: ['privacy_officer', 'support'] },
  { href: '/admin/catalogue', label: 'Catalogue', roles: ['content_admin'] },
  { href: '/admin/knowledge', label: 'Knowledge', roles: ['content_admin'] },
  { href: '/admin/assistant', label: 'Assistant quality', roles: ['content_admin'] },
  { href: '/admin/notifications', label: 'Delivery failures', roles: ['support'] },
  { href: '/admin/staff', label: 'Staff', roles: ['super_admin'] },
  { href: '/admin/config', label: 'Config & plans', roles: ['super_admin'] },
  { href: '/admin/audit', label: 'Audit log', roles: ['super_admin'] },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { me, isStaff, hasRole } = useSession();
  const { t } = useI18n();
  const pathname = usePathname();
  if (!isStaff) return <EmptyState icon={<ShieldAlert className="size-6" />} title={t('common.notFound')} />;
  const visible = SECTIONS.filter((s) => s.roles.length === 0 || hasRole(...s.roles));
  return (
    <div>
      <div className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-accent">{t('nav.admin')}</div>
      {!me.session.mfaVerified && (
        <Notice tone="warn" className="mb-4" title="Two-step verification required" action={<ButtonLink href="/settings#security" size="sm" variant="secondary">Set up</ButtonLink>}>
          Staff tools only work on a session signed in with an authenticator code. Turn on two-step verification, then sign out and sign in again.
        </Notice>
      )}
      <nav aria-label="Staff sections" className="mb-6 flex gap-1 overflow-x-auto rounded-xl bg-bg-2 p-1 scrollbar-thin">
        {visible.map((s) => {
          const active = s.href === '/admin' ? pathname === '/admin' : pathname.startsWith(s.href);
          return (
            <Link key={s.href} href={s.href} aria-current={active ? 'page' : undefined} className={cx('shrink-0 rounded-lg px-3 py-1.5 text-sm font-semibold', active ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink')}>
              {s.label}
            </Link>
          );
        })}
      </nav>
      <Notice tone="info" className="mb-5">
        Staff cannot see users’ private content (tasks, lists, check-ins, cases, calendars or assistant chats). Every action here is recorded in the audit log.
      </Notice>
      {children}
    </div>
  );
}
