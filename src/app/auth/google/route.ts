import { NextRequest, NextResponse } from 'next/server';
import { API_URL } from '@/lib/server/session';
import { publicUrl, safeNext, STATE_COOKIE } from './shared';

export const dynamic = 'force-dynamic';

/**
 * "Continue with Google", step 1. Asks the API for Google's sign-in address and a signed state, keeps the state in
 * a short-lived httpOnly cookie, and sends the browser to Google.
 * Query: next (where to go afterwards), tz and locale (for a new account's profile), new=1 with age=1 and policy=<version> for a new account.
 */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const next = safeNext(q.get('next'));
  const isNew = q.get('new') === '1';
  const r = await fetch(`${API_URL}/v1/auth/google/start`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(isNew ? { ageConfirmed: q.get('age') === '1', acceptedPolicyVersion: q.get('policy') ?? undefined } : {}),
    cache: 'no-store',
  }).catch(() => null);
  if (!r?.ok) return NextResponse.redirect(publicUrl(req, `/sign-in?google=unavailable`));
  const { url, stateToken } = (await r.json()) as { url: string; stateToken: string };
  const res = NextResponse.redirect(url);
  res.cookies.set(STATE_COOKIE, JSON.stringify({ stateToken, next, tz: q.get('tz')?.slice(0, 64), locale: q.get('locale')?.slice(0, 10) }), {
    httpOnly: true,
    sameSite: 'lax',
    secure: req.headers.get('x-forwarded-proto') === 'https' || req.nextUrl.protocol === 'https:',
    path: '/auth/google',
    maxAge: 600,
  });
  return res;
}
