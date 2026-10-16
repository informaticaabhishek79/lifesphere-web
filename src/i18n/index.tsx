'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { en } from './en';
import { hi } from './hi';

export type Locale = 'en' | 'hi';
export const LOCALES: { code: Locale; label: string; tag: string }[] = [
  { code: 'en', label: 'English', tag: 'en-IN' },
  { code: 'hi', label: 'हिन्दी', tag: 'hi-IN' },
];

type Dict = { [k: string]: string | Dict };
const DICTS: Record<Locale, Dict> = { en: en as unknown as Dict, hi: hi as unknown as Dict };

function lookup(dict: Dict, key: string): string | undefined {
  let cur: string | Dict | undefined = dict;
  for (const part of key.split('.')) {
    if (cur === undefined || typeof cur === 'string') return undefined;
    cur = cur[part];
  }
  return typeof cur === 'string' ? cur : undefined;
}

export type TFunction = (key: string, vars?: Record<string, string | number>) => string;

function makeT(locale: Locale): TFunction {
  return (key, vars) => {
    let s = lookup(DICTS[locale], key) ?? lookup(DICTS.en, key);
    if (s === undefined) {
      if (process.env.NODE_ENV !== 'production') console.warn(`[i18n] missing key: ${key}`);
      s = key.split('.').pop() ?? key;
    }
    if (vars) s = s.replace(/\{(\w+)\}/g, (_, k: string) => (vars[k] !== undefined ? String(vars[k]) : `{${k}}`));
    return s;
  };
}

interface I18nValue {
  locale: Locale;
  tag: string;
  t: TFunction;
  /** Translate an enum value, e.g. e('taskStatus', 'pending'). Falls back to a readable version of the value. */
  e: (group: string, value: string | null | undefined) => string;
  setLocale: (l: Locale) => void;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ initial, children }: { initial: Locale; children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(initial);
  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    document.documentElement.lang = l;
    document.cookie = `ls_locale=${l}; path=/; max-age=31536000; samesite=lax`;
  }, []);
  const value = useMemo<I18nValue>(() => {
    const t = makeT(locale);
    const e = (group: string, raw: string | null | undefined) => {
      if (raw === null || raw === undefined || raw === '') return '';
      const value = String(raw);
      const key = `enums.${group}.${value.replace(/\./g, '_')}`;
      const found = lookup(DICTS[locale], key) ?? lookup(DICTS.en, key);
      return found ?? humanize(value);
    };
    return { locale, tag: LOCALES.find((x) => x.code === locale)!.tag, t, e, setLocale };
  }, [locale, setLocale]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const v = useContext(I18nContext);
  if (!v) throw new Error('useI18n outside I18nProvider');
  return v;
}

export function humanize(v: string) {
  const s = v.replace(/[._]/g, ' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}
