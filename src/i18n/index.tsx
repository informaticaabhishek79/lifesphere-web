'use client';

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { en } from './en';
import { type Dict, loadDictionary } from './load';
import { dirOf, formatTag, LOCALES, type Locale } from './locales';

export { LOCALES, baseLocale, dirOf, formatTag, isLocale, pickLocale, type Locale } from './locales';

const EN = en as unknown as Dict;

function lookup(dict: Dict | null, key: string): string | undefined {
  let cur: string | Dict | undefined | null = dict;
  for (const part of key.split('.')) {
    if (cur === undefined || cur === null || typeof cur === 'string') return undefined;
    cur = cur[part];
  }
  return typeof cur === 'string' ? cur : undefined;
}

export type TFunction = (key: string, vars?: Record<string, string | number>) => string;

function makeT(dict: Dict | null): TFunction {
  return (key, vars) => {
    let s = lookup(dict, key) ?? lookup(EN, key);
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
  /** Language + country for Intl formatting, e.g. "en-GB". */
  tag: string;
  dir: 'ltr' | 'rtl';
  t: TFunction;
  /** Translate an enum value, e.g. e('taskStatus', 'pending'). Falls back to a readable version of the value. */
  e: (group: string, value: string | null | undefined) => string;
  setLocale: (l: Locale) => Promise<void>;
  /** The person's country (from their profile); affects number/date formats only. */
  setRegion: (country: string | null) => void;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ initial, initialDict, initialRegion, children }: { initial: Locale; initialDict: Dict | null; initialRegion?: string | null; children: React.ReactNode }) {
  const [state, setState] = useState<{ locale: Locale; dict: Dict | null }>({ locale: initial, dict: initialDict });
  const [region, setRegion] = useState<string | null>(initialRegion ?? null);
  const pending = useRef<Locale | null>(null);

  const setLocale = useCallback(async (l: Locale) => {
    pending.current = l;
    const dict = await loadDictionary(l);
    if (pending.current !== l) return; // a later choice won
    setState({ locale: l, dict });
    const root = document.documentElement;
    root.lang = l;
    root.dir = dirOf(l);
    document.cookie = `ls_locale=${l}; path=/; max-age=31536000; samesite=lax`;
  }, []);

  const value = useMemo<I18nValue>(() => {
    const t = makeT(state.dict);
    const e = (group: string, raw: string | null | undefined) => {
      if (raw === null || raw === undefined || raw === '') return '';
      const v = String(raw);
      const key = `enums.${group}.${v.replace(/\./g, '_')}`;
      return lookup(state.dict, key) ?? lookup(EN, key) ?? humanize(v);
    };
    return { locale: state.locale, tag: formatTag(state.locale, region), dir: dirOf(state.locale), t, e, setLocale, setRegion };
  }, [state, region, setLocale]);
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

export const LANGUAGE_OPTIONS = LOCALES.map((l) => ({ value: l.code, label: l.label === l.english ? l.label : `${l.label} · ${l.english}` }));
