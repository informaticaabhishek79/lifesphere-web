'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { usePathname, useRouter } from 'next/navigation';
import { createContext, useContext, useEffect, useMemo } from 'react';
import { api, setUnauthenticatedHandler } from './api';
import { makeFormat, type Format } from './format';
import type { Feature, Me } from './types';
import { useI18n, type Locale } from '@/i18n';

interface SessionValue {
  me: Me;
  fmt: Format;
  isStaff: boolean;
  hasRole: (...roles: string[]) => boolean;
  featureOn: (f: Feature) => boolean;
  refresh: () => Promise<unknown>;
}

const SessionContext = createContext<SessionValue | null>(null);

export function useMeQuery() {
  return useQuery({ queryKey: ['me'], queryFn: () => api.get<Me>('/v1/me'), staleTime: 60_000, retry: false });
}

/** Applies the user's theme, text size and motion preferences to the page, and remembers them for the next load. */
export function applyAppearance(me: Pick<Me, 'preferences' | 'profile'>) {
  const root = document.documentElement;
  const prefs = me.preferences;
  const theme = prefs.accessibility.highContrast ? 'high_contrast' : prefs.theme;
  const scale = Math.max(prefs.accessibility.textScale || 1, me.profile.seniorMode ? 1.2 : 1);
  if (theme === 'system') delete root.dataset.theme;
  else root.dataset.theme = theme;
  root.style.setProperty('--scale', String(scale));
  root.dataset.reduceMotion = String(prefs.accessibility.reduceMotion);
  root.dataset.senior = String(me.profile.seniorMode);
  const year = 31536000;
  document.cookie = `ls_theme=${theme}; path=/; max-age=${year}; samesite=lax`;
  document.cookie = `ls_scale=${scale}; path=/; max-age=${year}; samesite=lax`;
}

export function SessionProvider({ children, fallback }: { children: React.ReactNode; fallback: React.ReactNode }) {
  const { data: me, refetch, isError, isFetching } = useMeQuery();
  const { tag, locale, setLocale, t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const qc = useQueryClient();

  useEffect(() => {
    setUnauthenticatedHandler(() => {
      qc.clear();
      router.replace(`/sign-in?next=${encodeURIComponent(pathname)}&expired=1`);
    });
  }, [qc, router, pathname]);

  useEffect(() => {
    if (!me) return;
    applyAppearance(me);
    const profileLocale: Locale = me.profile.locale?.startsWith('hi') ? 'hi' : 'en';
    if (profileLocale !== locale) setLocale(profileLocale);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me]);

  const value = useMemo<SessionValue | null>(() => {
    if (!me) return null;
    return {
      me,
      fmt: makeFormat(tag, me.profile.timezone || 'Asia/Kolkata'),
      isStaff: me.staffRoles.length > 0,
      hasRole: (...roles) => me.staffRoles.includes('super_admin') || roles.some((r) => me.staffRoles.includes(r as never)),
      featureOn: (f) => !me.preferences.disabledFeatures.includes(f),
      refresh: () => refetch(),
    };
  }, [me, tag, refetch]);

  // API down or unreachable: say so instead of showing the loading screen forever.
  if (!value && isError) {
    return (
      <div className="grid min-h-dvh place-items-center bg-bg p-6 text-center">
        <div className="max-w-sm space-y-4">
          <p className="text-lg font-semibold text-ink">{t('errors.api_unreachable')}</p>
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="rounded-xl bg-brand px-5 py-2.5 font-semibold text-brand-ink disabled:opacity-60"
          >
            {t('common.retry')}
          </button>
        </div>
      </div>
    );
  }
  if (!value) return <>{fallback}</>;
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const v = useContext(SessionContext);
  if (!v) throw new Error('useSession outside SessionProvider');
  return v;
}

export const useFmt = () => useSession().fmt;
