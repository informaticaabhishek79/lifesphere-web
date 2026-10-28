'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Bell, BookOpen, Bot, Boxes, CalendarDays, CheckSquare, ChevronDown, ClipboardList, FolderOpen, Globe, Hammer, HeartHandshake, HeartPulse, Home, Inbox, Landmark, LifeBuoy, LogOut, Mail, Menu, MessagesSquare, Mic, PiggyBank, Receipt, Settings, Share2, Shield, ShieldCheck, ShoppingCart, Store, TimerReset, UserRound, Users, X } from 'lucide-react';
import { api } from '@/lib/api';
import { useSession } from '@/lib/session';
import type { Feature } from '@/lib/types';
import { LOCALES, useI18n, type Locale } from '@/i18n';
import { Logo } from './brand';
import { InboxWatcher } from './inbox-watcher';
import { InstallBanner } from './install-app';
import { Avatar, cx } from './ui';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  feature?: Feature;
}

function useNav() {
  const { t } = useI18n();
  const { featureOn, isStaff } = useSession();
  const sections: { title?: string; items: NavItem[] }[] = [
    { items: [{ href: '/', label: t('nav.home'), icon: Home }] },
    {
      title: t('nav.sectionLife'),
      items: [
        { href: '/tasks', label: t('nav.tasks'), icon: CheckSquare, feature: 'lifeos' },
        { href: '/reminders', label: t('nav.reminders'), icon: TimerReset, feature: 'lifeos' },
        { href: '/calendar', label: t('nav.calendar'), icon: CalendarDays, feature: 'lifeos' },
      ],
    },
    {
      title: t('nav.sectionHome'),
      items: [
        { href: '/households', label: t('nav.households'), icon: Users, feature: 'household' },
        { href: '/lists', label: t('nav.lists'), icon: ShoppingCart, feature: 'household' },
        { href: '/inventory', label: t('nav.inventory'), icon: Boxes, feature: 'household' },
        { href: '/budgets', label: t('nav.budgets'), icon: PiggyBank, feature: 'household' },
      ],
    },
    {
      title: t('nav.sectionFamily'),
      items: [
        { href: '/care', label: t('nav.family'), icon: HeartHandshake, feature: 'familycare' },
        { href: '/contacts', label: t('nav.contacts'), icon: UserRound, feature: 'familycare' },
        { href: '/sharing', label: t('nav.sharing'), icon: Share2, feature: 'familycare' },
        { href: '/check-ins', label: t('nav.checkins'), icon: HeartPulse, feature: 'familycare' },
        { href: '/help', label: t('nav.help'), icon: LifeBuoy, feature: 'familycare' },
      ],
    },
    {
      title: t('nav.sectionCommunity'),
      items: [
        { href: '/community', label: t('nav.community'), icon: MessagesSquare, feature: 'community' },
        { href: '/civic', label: t('nav.civic'), icon: Landmark, feature: 'community' },
      ],
    },
    {
      title: t('nav.sectionHelp'),
      items: [
        { href: '/services', label: t('nav.services'), icon: Hammer, feature: 'services' },
        { href: '/service-requests', label: t('nav.serviceRequests'), icon: ClipboardList, feature: 'services' },
        { href: '/consumer', label: t('nav.consumer'), icon: Receipt, feature: 'consumer' },
        { href: '/assistant', label: t('nav.assistant'), icon: Bot, feature: 'assistant' },
        { href: '/knowledge', label: t('nav.knowledge'), icon: BookOpen },
        { href: '/provider-portal', label: t('nav.providerPortal'), icon: Store, feature: 'services' },
      ],
    },
    {
      title: t('nav.sectionAgents'),
      items: [
        { href: '/voice', label: t('nav.voice'), icon: Mic, feature: 'assistant' },
        { href: '/agents', label: t('nav.agents'), icon: Bot, feature: 'agents' },
        { href: '/email', label: t('nav.email'), icon: Mail, feature: 'agents' },
        { href: '/documents', label: t('nav.documents'), icon: FolderOpen, feature: 'documents' },
        { href: '/inbox', label: t('nav.inbox'), icon: Inbox, feature: 'documents' },
      ],
    },
    {
      title: t('nav.sectionYou'),
      items: [
        { href: '/notifications', label: t('nav.notifications'), icon: Bell },
        { href: '/settings', label: t('nav.settings'), icon: Settings },
        { href: '/privacy', label: t('nav.privacy'), icon: ShieldCheck },
        ...(isStaff ? [{ href: '/admin', label: t('nav.admin'), icon: Shield }] : []),
      ],
    },
  ];
  return sections
    .map((s) => ({ ...s, items: s.items.filter((i) => !i.feature || featureOn(i.feature)) }))
    .filter((s) => s.items.length > 0);
}

function isActive(pathname: string, href: string) {
  return href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const sections = useNav();
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="space-y-5">
      {sections.map((s, i) => (
        <div key={i}>
          {s.title && <div className="mb-1.5 px-3 text-[0.7rem] font-bold uppercase tracking-[0.14em] text-muted">{s.title}</div>}
          <ul className="space-y-0.5">
            {s.items.map((item) => {
              const active = isActive(pathname, item.href);
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? 'page' : undefined}
                    className={cx(
                      'flex items-center gap-3 rounded-xl px-3 py-2 text-[0.93rem] font-medium transition-colors',
                      active ? 'bg-brand text-brand-ink' : 'text-ink-2 hover:bg-bg-2 hover:text-ink',
                      item.href === '/help' && !active && 'text-danger',
                    )}
                  >
                    <Icon className="size-[1.15rem] shrink-0" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function useUnread() {
  return useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: () => api.get<{ unreadCount: number }>('/v1/notifications', { limit: 1 }),
    refetchInterval: 60_000,
    select: (d) => d.unreadCount,
  });
}

function useIntegrations() {
  return useQuery({
    queryKey: ['health'],
    queryFn: () => api.get<{ integrations: Record<string, string> }>('/v1/health/ready'),
    staleTime: 10 * 60_000,
    retry: false,
  });
}

function LanguageSwitch() {
  const { t, locale, setLocale } = useI18n();
  const qc = useQueryClient();
  const current = LOCALES.find((l) => l.code === locale);
  return (
    <label className="relative flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-semibold text-ink-2 focus-within:ring-2 focus-within:ring-brand/40 hover:bg-bg-2">
      <Globe className="size-4 shrink-0" aria-hidden />
      <span aria-hidden className="sm:hidden">{locale.toUpperCase()}</span>
      <span aria-hidden className="hidden max-w-[8rem] truncate sm:inline">{current?.label}</span>
      <ChevronDown className="size-3.5 shrink-0 opacity-70" aria-hidden />
      {/* The native select sits invisibly on top, so the platform's own picker opens on every device. */}
      <select
        aria-label={t('common.language')}
        value={locale}
        onChange={(e) => {
          const next = e.target.value as Locale;
          void setLocale(next);
          // Remember on the account too, so notifications use the same language.
          api.patch('/v1/me/profile', { locale: next }).then(() => qc.invalidateQueries({ queryKey: ['me'] })).catch(() => {});
        }}
        className="absolute inset-0 cursor-pointer opacity-0"
      >
        {LOCALES.map((l) => (
          <option key={l.code} value={l.code}>
            {l.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function UserMenu() {
  const { me } = useSession();
  const { t } = useI18n();
  const router = useRouter();
  const qc = useQueryClient();
  const signOut = async () => {
    try {
      await api.post('/v1/auth/logout');
    } catch {
      /* cookie is cleared either way */
    }
    qc.clear();
    router.replace('/sign-in');
    router.refresh();
  };
  return (
    <div className="flex items-center gap-3 rounded-xl border border-line bg-surface px-3 py-2.5">
      <Avatar name={me.profile.displayName} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold">{me.profile.displayName}</div>
        <div className="truncate text-xs text-muted"><bdi dir="ltr">{me.phoneMasked ?? me.emailMasked}</bdi></div>
      </div>
      <button type="button" onClick={signOut} className="rounded-lg p-1.5 text-muted hover:bg-bg-2 hover:text-ink" aria-label={t('common.signOut')} title={t('common.signOut')}>
        <LogOut className="size-4" />
      </button>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  const { me, fmt, featureOn } = useSession();
  const pathname = usePathname();
  const [drawer, setDrawer] = useState(false);
  const { data: unread = 0 } = useUnread();
  const { data: health } = useIntegrations();
  // Channels people would notice. Phone-app push is left out until there is a phone app to receive it.
  // SMS is left out of this banner too: it's deliberately left in mock mode until Twilio is upgraded,
  // so a persistent "test mode" warning about it on every page isn't useful signal.
  const simulatedList = health ? (['email', 'webPush', 'ai'] as const).filter((k) => health.integrations[k] === 'simulated' || (k === 'ai' && health.integrations.ai === 'mock')) : [];
  const simulated = simulatedList.length > 0;

  useEffect(() => {
    setDrawer(false);
  }, [pathname]);

  const bottom = [
    { href: '/', label: t('nav.home'), icon: Home },
    ...(featureOn('lifeos') ? [{ href: '/tasks', label: t('nav.tasks'), icon: CheckSquare }] : []),
    ...(featureOn('familycare') ? [{ href: me.preferences.homeMode === 'caregiver' ? '/care' : '/check-ins', label: t('nav.family'), icon: HeartPulse }] : []),
    { href: '/notifications', label: t('nav.notifications'), icon: Bell, badge: unread },
  ];

  // Guided setup: no menus, just the steps.
  if (pathname.startsWith('/get-started')) {
    return (
      <div className="min-h-dvh">
        <header className="flex h-15 items-center justify-between gap-2 border-b border-line px-4 sm:px-6">
          <Link href="/" aria-label="LifeSphere home">
            <Logo />
          </Link>
          <LanguageSwitch />
        </header>
        <main id="main" className="px-4 pt-8 pb-16 sm:px-6">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[17rem_1fr]">
      {featureOn('documents') && <InboxWatcher userId={me.id} />}
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:start-2 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2">
        {t('common.skipToContent')}
      </a>

      {/* Sidebar */}
      <aside className="sticky top-0 hidden h-dvh flex-col border-e border-line bg-surface-2 lg:flex">
        <div className="px-5 pt-5 pb-4">
          <Link href="/" aria-label="LifeSphere home">
            <Logo />
          </Link>
        </div>
        <div className="flex-1 overflow-y-auto px-3 pb-4 scrollbar-thin">
          <NavList />
        </div>
        <div className="border-t border-line p-3">
          <UserMenu />
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-30 border-b border-line bg-bg/90 backdrop-blur">
          <div className="flex h-15 items-center gap-1 px-3 sm:gap-2 sm:px-6">
            <button type="button" className="rounded-lg p-2 text-ink-2 hover:bg-bg-2 lg:hidden" onClick={() => setDrawer(true)} aria-label={t('common.menu')}>
              <Menu className="size-5" />
            </button>
            <Link href="/" className="hidden sm:block lg:hidden" aria-label="LifeSphere home">
              <Logo withWord={false} />
            </Link>
            <div className="flex-1" />
            <LanguageSwitch />
            {featureOn('assistant') && (
              <Link href="/voice?listen=1" className="rounded-lg p-2 text-ink-2 hover:bg-bg-2" aria-label={t('nav.voice')} title={t('nav.voice')}>
                <Mic className="size-5" />
              </Link>
            )}
            <Link href="/notifications" className="relative rounded-lg p-2 text-ink-2 hover:bg-bg-2" aria-label={`${t('nav.notifications')}${unread ? ` (${t('shell.unread', { count: unread })})` : ''}`}>
              <Bell className="size-5" />
              {unread > 0 && (
                <span className="absolute top-1 end-1 flex min-w-[1.1rem] items-center justify-center rounded-full bg-accent px-1 text-[0.65rem] font-bold text-white">{unread > 99 ? '99+' : unread}</span>
              )}
            </Link>
            {featureOn('familycare') && (
              <Link href="/help" className="ms-1 inline-flex h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-xl bg-danger px-3 text-sm sm:px-4 font-bold text-white shadow-sm hover:bg-danger-hover">
                <LifeBuoy className="size-4" />
                {t('shell.getHelp')}
              </Link>
            )}
          </div>
          {simulated && (
            <div className="border-t border-warn/20 bg-warn-soft px-4 py-1.5 text-center text-xs font-medium text-warn sm:px-6">{t('shell.simulatedBanner', { list: simulatedList.map((k) => t(`shell.channel.${k}`)).join(', ') })}</div>
          )}
          {me.status === 'pending_deletion' && me.deletionRequestedAt && (
            <div className="border-t border-danger/20 bg-danger-soft px-4 py-2 text-center text-sm font-medium text-danger">
              {t('shell.pendingDeletion', { date: fmt.date(new Date(new Date(me.deletionRequestedAt).getTime() + 7 * 86400000)) })}
            </div>
          )}
        </header>

        <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 pt-6 pb-28 sm:px-6 lg:px-10 lg:pt-8 lg:pb-12">
          {pathname === '/' && <InstallBanner />}
          {children}
        </main>
      </div>

      {/* Mobile drawer */}
      {drawer && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDrawer(false)} />
          <div className="rise absolute inset-y-0 start-0 flex w-[85%] max-w-xs flex-col bg-surface-2 shadow-xl">
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <Logo />
              <button type="button" onClick={() => setDrawer(false)} className="rounded-lg p-2 hover:bg-bg-2" aria-label={t('common.close')}>
                <X className="size-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-3 pb-4">
              <NavList onNavigate={() => setDrawer(false)} />
            </div>
            <div className="border-t border-line p-3">
              <UserMenu />
            </div>
          </div>
        </div>
      )}

      {/* Mobile bottom navigation */}
      <nav aria-label="Quick" className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        <ul className="grid grid-cols-5">
          {bottom.map((b) => {
            const Icon = b.icon;
            const active = isActive(pathname, b.href);
            return (
              <li key={b.href}>
                <Link href={b.href} aria-current={active ? 'page' : undefined} className={cx('relative flex flex-col items-center gap-0.5 py-2 text-[0.7rem] font-semibold', active ? 'text-brand' : 'text-muted')}>
                  <Icon className="size-5" />
                  {b.label}
                  {'badge' in b && (b.badge ?? 0) > 0 && <span className="absolute top-1 end-[30%] size-2 rounded-full bg-accent" />}
                </Link>
              </li>
            );
          })}
          <li>
            <button type="button" onClick={() => setDrawer(true)} className="flex w-full flex-col items-center gap-0.5 py-2 text-[0.7rem] font-semibold text-muted">
              <Menu className="size-5" />
              {t('common.more')}
            </button>
          </li>
        </ul>
      </nav>
    </div>
  );
}

export function ShellFallback() {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Logo />
        <div className="h-1 w-32 overflow-hidden rounded-full bg-bg-2">
          <div className="skeleton h-full w-full" />
        </div>
      </div>
    </div>
  );
}
