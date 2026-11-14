import type { NextRequest } from 'next/server';

export const STATE_COOKIE = 'ls_google';

/** Only same-site paths, never another site. */
export function safeNext(next: string | null | undefined) {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : '/home';
}

/** Absolute address on the public host (behind Render's proxy the server itself listens on another port). */
export function publicUrl(req: NextRequest, path: string) {
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? req.nextUrl.host;
  const proto = req.headers.get('x-forwarded-proto') ?? req.nextUrl.protocol.replace(':', '');
  return new URL(path, `${proto}://${host}`);
}
