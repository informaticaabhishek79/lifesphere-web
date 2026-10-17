import type { Locale } from './locales';

export type Dict = { [k: string]: string | Dict };

/** Loads a translation on demand so each person downloads only their language. English is always bundled. */
export async function loadDictionary(l: Locale): Promise<Dict | null> {
  switch (l) {
    case 'hi':
      return (await import('./hi')).hi as unknown as Dict;
    case 'bn':
      return (await import('./bn')).bn as unknown as Dict;
    case 'mr':
      return (await import('./mr')).mr as unknown as Dict;
    case 'ta':
      return (await import('./ta')).ta as unknown as Dict;
    case 'te':
      return (await import('./te')).te as unknown as Dict;
    case 'es':
      return (await import('./es')).es as unknown as Dict;
    case 'fr':
      return (await import('./fr')).fr as unknown as Dict;
    case 'de':
      return (await import('./de')).de as unknown as Dict;
    case 'ar':
      return (await import('./ar')).ar as unknown as Dict;
    default:
      return null;
  }
}
