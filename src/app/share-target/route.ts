import { NextRequest, NextResponse } from 'next/server';
import { ACCESS_COOKIE, API_URL, REFRESH_COOKIE, accessTokenExpiring, refreshSession, setSessionCookies, type TokenPair } from '@/lib/server/session';
import { publicUrl } from '../auth/google/shared';

export const dynamic = 'force-dynamic';

const MAX_FILES = 10;
const MAX_BYTES = 20 * 1024 * 1024;

interface Status {
  setUp: boolean;
  rootFolderId: string | null;
  folders: { hint: string; folderId: string | null }[];
}

/**
 * Android "Share → LifeSphere" (installed app). Shared files — or shared text, saved as a note — go into the
 * Smart inbox "Not sure" folder, where they are read like any other inbox file.
 */
export async function POST(req: NextRequest) {
  const done = (query: string, pair?: TokenPair | null) => {
    const res = NextResponse.redirect(publicUrl(req, `/inbox?${query}`), 303);
    if (pair) setSessionCookies(req, res, pair);
    return res;
  };
  let access = req.cookies.get(ACCESS_COOKIE)?.value;
  const refresh = req.cookies.get(REFRESH_COOKIE)?.value;
  if (!refresh) return NextResponse.redirect(publicUrl(req, '/sign-in?next=%2Finbox'), 303);
  let rotated: TokenPair | null = null;
  if (accessTokenExpiring(access)) {
    rotated = await refreshSession(refresh, req.headers.get('x-forwarded-for'));
    if (!rotated) return NextResponse.redirect(publicUrl(req, '/sign-in?next=%2Finbox'), 303);
    access = rotated.accessToken;
  }
  const call = (path: string, init: RequestInit = {}) =>
    fetch(`${API_URL}${path}`, { ...init, headers: { ...(init.headers ?? {}), authorization: `Bearer ${access}` }, cache: 'no-store' });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return done('shared=0', rotated);
  }
  const files = form.getAll('files').filter((f): f is File => typeof f === 'object' && 'arrayBuffer' in f && f.size > 0).slice(0, MAX_FILES);
  const text = [form.get('title'), form.get('text'), form.get('url')].filter((v): v is string => typeof v === 'string' && !!v.trim()).join('\n').trim();
  if (!files.length && text) files.push(new File([text.slice(0, 50_000)], `Shared note ${new Date().toISOString().slice(0, 10)}.txt`, { type: 'text/plain' }));
  if (!files.length) return done('shared=0', rotated);

  let status = (await call('/v1/inbox').then((r) => (r.ok ? r.json() : null)).catch(() => null)) as Status | null;
  if (status && !status.setUp) {
    // Sharing into LifeSphere is a clear wish to use the inbox: create its folders (AI reading stays off until chosen).
    status = (await call('/v1/inbox/setup', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }).then((r) => (r.ok ? r.json() : null)).catch(() => null)) as Status | null;
  }
  const target = status?.folders.find((f) => f.hint === 'mixed')?.folderId ?? status?.rootFolderId;
  if (!target) return done('shared=0', rotated);

  let ok = 0;
  for (const f of files) {
    if (f.size > MAX_BYTES) continue;
    const body = new FormData();
    body.append('file', f, f.name || 'shared-file');
    const r = await call(`/v1/documents/folders/${target}/files`, { method: 'POST', body }).catch(() => null);
    if (r?.ok) ok++;
  }
  return done(`shared=${ok}${ok < files.length ? `&missed=${files.length - ok}` : ''}`, rotated);
}
