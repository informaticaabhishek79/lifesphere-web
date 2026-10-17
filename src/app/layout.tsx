import type { Metadata, Viewport } from 'next';
import { cookies, headers } from 'next/headers';
import '@fontsource-variable/figtree';
import '@fontsource-variable/fraunces';
import '@fontsource-variable/noto-sans-devanagari';
import '@fontsource-variable/noto-sans-bengali';
import '@fontsource-variable/noto-sans-tamil';
import '@fontsource-variable/noto-sans-telugu';
import '@fontsource-variable/noto-sans-arabic';
import './globals.css';
import { Providers } from './providers';
import { dirOf, isLocale, pickLocale } from '@/i18n/locales';
import { loadDictionary } from '@/i18n/load';

export const metadata: Metadata = {
  title: { default: 'LifeSphere', template: '%s · LifeSphere' },
  description: 'Privacy-first life management, family care, community and local help.',
  applicationName: 'LifeSphere',
  robots: { index: false, follow: false },
  icons: { icon: '/icon.svg' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#f4f6f8',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const jar = await cookies();
  const saved = jar.get('ls_locale')?.value;
  // First visit: use the browser's preferred language if we have it.
  const locale = isLocale(saved) ? saved : pickLocale((await headers()).get('accept-language'));
  const dict = await loadDictionary(locale);
  const region = jar.get('ls_region')?.value ?? null;
  const theme = jar.get('ls_theme')?.value;
  const scale = Number(jar.get('ls_scale')?.value);
  const validTheme = theme && ['light', 'dark', 'high_contrast'].includes(theme) ? theme : undefined;
  const validScale = Number.isFinite(scale) && scale >= 1 && scale <= 2 ? scale : 1;
  return (
    <html lang={locale} dir={dirOf(locale)} data-theme={validTheme} style={{ ['--scale' as string]: validScale }} suppressHydrationWarning>
      <body className="min-h-dvh">
        <Providers locale={locale} dict={dict} region={region}>
          {children}
        </Providers>
      </body>
    </html>
  );
}
