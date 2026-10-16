import { NextRequest, NextResponse } from 'next/server';

/** Pages anyone can open. Everything else needs a session cookie (the API still checks every request). */
const PUBLIC_PREFIXES = ['/sign-in', '/invite', '/about', '/privacy-notice'];

export function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
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
  matcher: ['/((?!api/|_next/|favicon|icon|manifest|robots|fonts/|.*\\.(?:png|jpg|svg|ico|webmanifest)$).*)'],
};
