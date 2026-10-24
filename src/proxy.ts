import { NextRequest, NextResponse } from 'next/server';

/** Pages anyone can open. Everything else needs a session cookie (the API still checks every request). */
const PUBLIC_PREFIXES = ['/sign-in', '/invite', '/about', '/privacy-notice', '/auth', '/offline'];

/** Set on an old deployment (e.g. Render after moving to MilesWeb) to send everyone to the new address. */
const CANONICAL = process.env.CANONICAL_URL ? new URL(process.env.CANONICAL_URL) : null;

export function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  if (CANONICAL) {
    const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
    if (host && host !== CANONICAL.host) return NextResponse.redirect(new URL(pathname + search, CANONICAL), 308);
  }
  const signedIn = Boolean(req.cookies.get('ls_rt')?.value);
  const isPublic = PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (!signedIn && !isPublic) {
    const url = req.nextUrl.clone();
    url.pathname = '/sign-in';
    url.search = pathname === '/' ? '' : `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }
  if (signedIn && pathname === '/sign-in') {
    const url = req.nextUrl.clone();
    url.pathname = '/';
    url.search = '';
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api/|_next/|favicon|icon|manifest|robots|fonts/|sw\\.js|.*\\.(?:png|jpg|svg|ico|webmanifest)$).*)'],
};
