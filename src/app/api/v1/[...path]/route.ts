import { NextRequest, NextResponse } from 'next/server';
import {
  ACCESS_COOKIE,
  API_URL,
  REFRESH_COOKIE,
  TokenPair,
  accessTokenExpiring,
  clearSessionCookies,
  refreshSession,
  setSessionCookies,
} from '@/lib/server/session';

export const dynamic = 'force-dynamic';

/** Endpoints that issue tokens: the web server keeps the tokens and returns the rest of the body. */
const TOKEN_ISSUERS = new Set(['auth/otp/verify', 'auth/mfa/verify']);
/** Signed-out endpoints: never try to refresh for these. */
const PUBLIC = new Set(['auth/otp/request', 'auth/otp/verify', 'auth/mfa/verify', 'health/live', 'health/ready', 'privacy/notice']);

const FORWARD_REQUEST_HEADERS = ['content-type', 'accept', 'accept-language', 'idempotency-key', 'user-agent', 'x-request-id'];
const FORWARD_RESPONSE_HEADERS = [
  'content-type',
  'content-disposition',
  // Downloads from cloud storage redirect to a short-lived signed URL.
  'location',
  // No content-length: fetch() hands us the body already decompressed, so the upstream length (of the compressed
  // body, when a proxy such as Render's gzips it) would be wrong and the browser would cut the response short.
  'cache-control',
  'idempotent-replay',
  'retry-after',
  'x-request-id',
  'ratelimit-limit',
  'ratelimit-remaining',
  'ratelimit-reset',
];

async function handle(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const route = path.join('/');
  if (route === 'auth/refresh') {
    // Refresh is handled here automatically; the browser never sees refresh tokens.
    return NextResponse.json({ code: 'not_found', detail: 'Not found', status: 404 }, { status: 404 });
  }
  const target = `${API_URL}/v1/${path.map(encodeURIComponent).join('/')}${req.nextUrl.search}`;
  const method = req.method.toUpperCase();
  const body = method === 'GET' || method === 'HEAD' ? undefined : await req.arrayBuffer();
  const forwardedFor = req.headers.get('x-forwarded-for');

  const headers = new Headers();
  for (const h of FORWARD_REQUEST_HEADERS) {
    const v = req.headers.get(h);
    if (v) headers.set(h, v);
  }
  if (forwardedFor) headers.set('x-forwarded-for', forwardedFor);

  let accessToken = req.cookies.get(ACCESS_COOKIE)?.value;
  const refreshToken = req.cookies.get(REFRESH_COOKIE)?.value;
  let rotated: TokenPair | null = null;
  let refreshFailed = false;
  const isPublic = PUBLIC.has(route);

  if (!isPublic && refreshToken && accessTokenExpiring(accessToken)) {
    rotated = await refreshSession(refreshToken, forwardedFor);
    if (rotated) accessToken = rotated.accessToken;
    else refreshFailed = true;
  }

  const send = (token?: string) => {
    const h = new Headers(headers);
    if (token && !isPublic) h.set('authorization', `Bearer ${token}`);
    return fetch(target, { method, headers: h, body, cache: 'no-store', redirect: 'manual' });
  };

  let upstream: Response;
  try {
    upstream = await send(accessToken);
    if (upstream.status === 401 && !isPublic && refreshToken && !rotated && !refreshFailed) {
      rotated = await refreshSession(refreshToken, forwardedFor);
      if (rotated) upstream = await send(rotated.accessToken);
      else refreshFailed = true;
    }
  } catch {
    return NextResponse.json(
      { status: 502, code: 'api_unreachable', title: 'Service unavailable', detail: 'LifeSphere is not reachable right now. Please try again shortly.' },
      { status: 502, headers: { 'content-type': 'application/problem+json' } },
    );
  }

  const outHeaders = new Headers();
  for (const h of FORWARD_RESPONSE_HEADERS) {
    const v = upstream.headers.get(h);
    if (v) outHeaders.set(h, v);
  }

  let res: NextResponse;
  if (TOKEN_ISSUERS.has(route) && upstream.ok) {
    const json = (await upstream.json()) as Record<string, unknown>;
    const pair = json.accessToken ? (json as unknown as TokenPair) : null;
    const { accessToken: _a, refreshToken: _r, accessTokenExpiresAt: _ae, refreshTokenExpiresAt: _re, ...rest } = json;
    res = NextResponse.json(rest, { status: upstream.status, headers: outHeaders });
    if (pair) setSessionCookies(req, res, pair);
    return res;
  }

  const status = upstream.status;
  res = new NextResponse(status === 204 || status === 304 ? null : upstream.body, { status, headers: outHeaders });
  if (rotated) setSessionCookies(req, res, rotated);
  // `logout-all` signs out the other devices and keeps this one, so only `logout` clears cookies here.
  if ((route === 'auth/logout' && upstream.ok) || refreshFailed || (status === 401 && !isPublic && !rotated)) {
    clearSessionCookies(res);
  }
  return res;
}

export { handle as GET, handle as POST, handle as PUT, handle as PATCH, handle as DELETE };
