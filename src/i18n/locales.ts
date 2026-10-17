/** Languages the app is translated into. English is the fallback for any missing text. */
export type Locale = 'en' | 'hi' | 'bn' | 'mr' | 'ta' | 'te' | 'es' | 'fr' | 'de' | 'ar';

export const LOCALES: { code: Locale; label: string; english: string; dir: 'ltr' | 'rtl' }[] = [
  { code: 'en', label: 'English', english: 'English', dir: 'ltr' },
  { code: 'hi', label: 'हिन्दी', english: 'Hindi', dir: 'ltr' },
  { code: 'bn', label: 'বাংলা', english: 'Bengali', dir: 'ltr' },
  { code: 'mr', label: 'मराठी', english: 'Marathi', dir: 'ltr' },
  { code: 'ta', label: 'தமிழ்', english: 'Tamil', dir: 'ltr' },
  { code: 'te', label: 'తెలుగు', english: 'Telugu', dir: 'ltr' },
  { code: 'es', label: 'Español', english: 'Spanish', dir: 'ltr' },
  { code: 'fr', label: 'Français', english: 'French', dir: 'ltr' },
  { code: 'de', label: 'Deutsch', english: 'German', dir: 'ltr' },
  { code: 'ar', label: 'العربية', english: 'Arabic', dir: 'rtl' },
];

export function isLocale(v: unknown): v is Locale {
  return typeof v === 'string' && LOCALES.some((l) => l.code === v);
}

export function dirOf(l: Locale): 'ltr' | 'rtl' {
  return LOCALES.find((x) => x.code === l)?.dir ?? 'ltr';
}

/** Base language of a tag like "hi-IN" if we support it. */
export function baseLocale(tag: string | null | undefined): Locale | null {
  const base = tag?.split(/[-_]/)[0]?.toLowerCase();
  return isLocale(base) ? base : null;
}

/** First supported language in an Accept-Language header or navigator.languages list. */
export function pickLocale(preferences: string | readonly string[] | null | undefined): Locale {
  const list = typeof preferences === 'string' ? preferences.split(',').map((p) => p.split(';')[0].trim()) : (preferences ?? []);
  for (const p of list) {
    const l = baseLocale(p);
    if (l) return l;
  }
  return 'en';
}

/** A BCP 47 tag for formatting dates and money: language + the person's country, e.g. "en-GB", "ar-AE". */
export function formatTag(locale: Locale, country?: string | null): string {
  if (country && /^[A-Z]{2}$/.test(country)) {
    const tag = `${locale}-${country}`;
    try {
      new Intl.DateTimeFormat(tag);
      return tag;
    } catch {
      /* fall through */
    }
  }
  return locale;
}
