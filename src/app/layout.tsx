import type { Metadata, Viewport } from 'next';
import { cookies } from 'next/headers';
import '@fontsource-variable/figtree';
import '@fontsource-variable/fraunces';
import '@fontsource-variable/noto-sans-devanagari';
import './globals.css';
import { Providers } from './providers';

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
  const locale = jar.get('ls_locale')?.value === 'hi' ? 'hi' : 'en';
  const theme = jar.get('ls_theme')?.value;
  const scale = Number(jar.get('ls_scale')?.value);
  const validTheme = theme && ['light', 'dark', 'high_contrast'].includes(theme) ? theme : undefined;
  const validScale = Number.isFinite(scale) && scale >= 1 && scale <= 2 ? scale : 1;
  return (
    <html lang={locale} data-theme={validTheme} style={{ ['--scale' as string]: validScale }} suppressHydrationWarning>
      <body className="min-h-dvh">
        <Providers locale={locale}>{children}</Providers>
      </body>
    </html>
  );
}
