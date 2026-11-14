import { NextRequest, NextResponse } from 'next/server';
import { API_URL, setSessionCookies, type TokenPair } from '@/lib/server/session';
import { publicUrl, safeNext, STATE_COOKIE } from '../shared';

export const dynamic = 'force-dynamic';

type Result =
  | ({ status: 'authenticated'; user: { id: string; isNew: boolean } } & TokenPair)
  | { status: 'mfa_required'; mfaToken: string }
  | { status: 'signup_required'; email: string; name: string | null };

/** "Continue with Google", step 2: Google sends the person back here with a code. */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  let saved: { stateToken?: string; next?: string; tz?: string; locale?: string } = {};
  try {
    saved = JSON.parse(req.cookies.get(STATE_COOKIE)?.value ?? '{}');
  } catch {}
  const next = safeNext(saved.next);
  const back = (query: string, hash = '') => {
    const res = NextResponse.redirect(publicUrl(req, `/sign-in?${query}${next !== '/home' ? `&next=${encodeURIComponent(next)}` : ''}${hash}`));
    res.cookies.set(STATE_COOKIE, '', { path: '/auth/google', maxAge: 0 });
    return res;
  };
  // The person pressed Cancel at Google, or the cookie expired.
  if (q.get('error') || !q.get('code') || !q.get('state') || !saved.stateToken) return back(q.get('error') === 'access_denied' ? 'google=cancelled' : 'google=failed');

  const r = await fetch(`${API_URL}/v1/auth/google/verify`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'user-agent': req.headers.get('user-agent') ?? '',
      ...(req.headers.get('x-forwarded-for') ? { 'x-forwarded-for': req.headers.get('x-forwarded-for')! } : {}),
    },
    body: JSON.stringify({
      code: q.get('code'),
      state: q.get('state'),
      stateToken: saved.stateToken,
      platform: 'web',
      deviceName: deviceName(req.headers.get('user-agent') ?? ''),
      timezone: saved.tz || undefined,
      locale: saved.locale || undefined,
      country: req.cookies.get('ls_region')?.value,
    }),
    cache: 'no-store',
  }).catch(() => null);
  if (!r) return back('google=failed');
  const body = (await r.json().catch(() => ({}))) as Result & { code?: string };
  if (!r.ok) return back(`google=${body.code === 'account_disabled' ? 'disabled' : 'failed'}`);

  if (body.status === 'signup_required') return back('google=signup');
  if (body.status === 'mfa_required') return back('google=mfa', `#mfa=${encodeURIComponent(body.mfaToken)}`);

  const dest = body.user.isNew && next === '/home' ? '/get-started' : next;
  const res = NextResponse.redirect(publicUrl(req, dest));
  res.cookies.set(STATE_COOKIE, '', { path: '/auth/google', maxAge: 0 });
  setSessionCookies(req, res, body);
  return res;
}

function deviceName(ua: string) {
  const browser = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'Browser';
  const os = /Windows/.test(ua) ? 'Windows' : /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS' : /Mac OS/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : '';
  return `${browser}${os ? ` on ${os}` : ''}`;
}
