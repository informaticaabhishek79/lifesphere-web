import 'server-only';
import type { NextRequest, NextResponse } from 'next/server';

/**
 * Tokens never reach browser JavaScript. The web server keeps them in httpOnly cookies and attaches
 * the access token when it forwards a request to the API.
 */
export const ACCESS_COOKIE = 'ls_at';
export const REFRESH_COOKIE = 'ls_rt';

/** API_URL, or on Render the private-network host:port of the API service (API_HOSTPORT). */
export const API_URL = (process.env.API_URL ?? (process.env.API_HOSTPORT ? `http://${process.env.API_HOSTPORT}` : 'http://localhost:4000')).replace(/\/$/, '');

export interface TokenPair {
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
  sessionId: string;
}

function secure(req: NextRequest) {
  if (process.env.COOKIE_SECURE) return process.env.COOKIE_SECURE === 'true';
  return req.nextUrl.protocol === 'https:' || req.headers.get('x-forwarded-proto') === 'https';
}

export function setSessionCookies(req: NextRequest, res: NextResponse, pair: TokenPair) {
  const base = { httpOnly: true, sameSite: 'lax' as const, secure: secure(req), path: '/' };
  res.cookies.set(ACCESS_COOKIE, pair.accessToken, { ...base, expires: new Date(pair.accessTokenExpiresAt) });
  res.cookies.set(REFRESH_COOKIE, pair.refreshToken, { ...base, expires: new Date(pair.refreshTokenExpiresAt) });
}

export function clearSessionCookies(res: NextResponse) {
  res.cookies.set(ACCESS_COOKIE, '', { path: '/', maxAge: 0 });
  res.cookies.set(REFRESH_COOKIE, '', { path: '/', maxAge: 0 });
}

/**
 * Refresh tokens rotate on every use and a reused token signs the user out everywhere. Several
 * requests from the same browser can arrive together with the same expiring cookie, so refreshes
 * are de-duplicated: the first caller performs the refresh, later callers within a short window
 * receive the same new pair. (Single web-server instance; with several instances use sticky sessions.)
 */
const inflight = new Map<string, { promise: Promise<TokenPair | null>; at: number }>();
const REUSE_WINDOW_MS = 60_000;

export function refreshSession(refreshToken: string, forwardedFor?: string | null): Promise<TokenPair | null> {
  const now = Date.now();
  for (const [k, v] of inflight) if (now - v.at > REUSE_WINDOW_MS) inflight.delete(k);
  const existing = inflight.get(refreshToken);
  if (existing) return existing.promise;
  const promise = (async () => {
    const r = await fetch(`${API_URL}/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(forwardedFor ? { 'x-forwarded-for': forwardedFor } : {}) },
      body: JSON.stringify({ refreshToken }),
      cache: 'no-store',
    });
    if (!r.ok) return null;
    return (await r.json()) as TokenPair;
  })().catch(() => null);
  inflight.set(refreshToken, { promise, at: now });
  return promise;
}

/** True when the JWT expires within `skewSec` seconds (or cannot be read). Signature is checked by the API. */
export function accessTokenExpiring(token: string | undefined, skewSec = 30) {
  if (!token) return true;
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8')) as { exp?: number };
    return !payload.exp || payload.exp * 1000 - Date.now() < skewSec * 1000;
  } catch {
    return true;
  }
}
