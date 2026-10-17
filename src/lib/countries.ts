'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { api } from './api';
import type { CountryInfo } from './types';

/** Every country with calling code and local defaults (public endpoint; cached for the session). */
export function useCountries() {
  return useQuery({ queryKey: ['countries'], queryFn: () => api.get<CountryInfo[]>('/v1/countries'), staleTime: Infinity, gcTime: Infinity });
}

export function flagOf(code: string) {
  return /^[A-Z]{2}$/.test(code) ? String.fromCodePoint(...[...code].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)) : '';
}

export function countryName(code: string | null | undefined, locale: string) {
  if (!code) return '';
  try {
    return new Intl.DisplayNames([locale, 'en'], { type: 'region' }).of(code) ?? code;
  } catch {
    return code;
  }
}

/** Countries sorted by name in the reader's language. */
export function useCountryOptions(locale: string) {
  const { data } = useCountries();
  return useMemo(
    () =>
      (data ?? [])
        .map((c) => ({ ...c, name: countryName(c.code, locale), flag: flagOf(c.code) }))
        .sort((a, b) => a.name.localeCompare(b.name, locale)),
    [data, locale],
  );
}

function cookie(name: string) {
  if (typeof document === 'undefined') return null;
  return document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))?.[1] ?? null;
}

/**
 * Best guess at where the person is, without asking for location: their saved country, then the device
 * time zone, then the region in their browser language (en-GB → GB). India when nothing matches.
 */
export function detectCountry(countries: CountryInfo[] | undefined): string {
  const saved = cookie('ls_region');
  if (saved && /^[A-Z]{2}$/.test(saved)) return saved;
  if (typeof Intl !== 'undefined' && countries?.length) {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const aliases: Record<string, string> = { 'Asia/Calcutta': 'IN', 'America/Los_Angeles': 'US', 'America/Chicago': 'US', 'America/Denver': 'US', 'America/Phoenix': 'US', 'America/Anchorage': 'US', 'America/Vancouver': 'CA', 'America/Edmonton': 'CA', 'America/Winnipeg': 'CA', 'America/Halifax': 'CA', 'Australia/Melbourne': 'AU', 'Australia/Brisbane': 'AU', 'Australia/Perth': 'AU', 'Australia/Adelaide': 'AU', 'Europe/Kiev': 'UA', 'Asia/Saigon': 'VN', 'Asia/Rangoon': 'MM', 'Asia/Katmandu': 'NP' };
    const byTz = countries.find((c) => c.timezone === tz)?.code ?? aliases[tz];
    if (byTz) return byTz;
  }
  if (typeof navigator !== 'undefined') {
    for (const lang of navigator.languages ?? [navigator.language]) {
      const region = lang.split('-')[1]?.toUpperCase();
      if (region && /^[A-Z]{2}$/.test(region) && (!countries || countries.some((c) => c.code === region))) return region;
    }
  }
  return 'IN';
}
