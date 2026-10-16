import type { components } from './api-schema';

/** Request body types generated from the API's OpenAPI document (`npm run api:types`). */
export type Schemas = components['schemas'];
export type Body<K extends keyof Schemas> = Schemas[K];

export interface Problem {
  status: number;
  code: string;
  title?: string;
  detail?: string;
  errors?: { field: string; message: string }[];
  [k: string]: unknown;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly detail?: string;
  readonly problem: Problem;
  constructor(problem: Problem) {
    super(problem.detail ?? problem.title ?? problem.code);
    this.status = problem.status;
    this.code = problem.code;
    this.detail = problem.detail;
    this.problem = problem;
  }
  fieldErrors(): Record<string, string> {
    const out: Record<string, string> = {};
    for (const e of this.problem.errors ?? []) if (!out[e.field]) out[e.field] = e.message;
    return out;
  }
}

type Query = Record<string, string | number | boolean | undefined | null | (string | number)[]>;

export interface RequestOptions {
  query?: Query;
  body?: unknown;
  /** Sent as Idempotency-Key so a retry or double tap never acts twice. */
  idempotencyKey?: string;
  signal?: AbortSignal;
  form?: FormData;
}

let onUnauthenticated: (() => void) | null = null;
export function setUnauthenticatedHandler(fn: () => void) {
  onUnauthenticated = fn;
}

export function qs(query?: Query) {
  if (!query) return '';
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null || v === '') continue;
    if (Array.isArray(v)) v.forEach((x) => p.append(k, String(x)));
    else p.set(k, String(v));
  }
  const s = p.toString();
  return s ? `?${s}` : '';
}

export async function request<T>(method: string, path: string, opts: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { accept: 'application/json' };
  let body: BodyInit | undefined;
  if (opts.form) body = opts.form;
  else if (opts.body !== undefined) {
    headers['content-type'] = 'application/json';
    body = JSON.stringify(opts.body);
  }
  if (opts.idempotencyKey) headers['idempotency-key'] = opts.idempotencyKey;

  let res: Response;
  try {
    res = await fetch(`/api${path}${qs(opts.query)}`, { method, headers, body, signal: opts.signal, credentials: 'same-origin' });
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw e;
    throw new ApiError({ status: 0, code: 'network_error', detail: 'You appear to be offline. Check your connection and try again.' });
  }
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  const data = text ? safeJson(text) : null;
  if (!res.ok) {
    const problem: Problem =
      data && typeof data === 'object' ? { status: res.status, code: 'error', ...(data as object) } : { status: res.status, code: 'error', detail: text || res.statusText };
    if (res.status === 401 && !path.startsWith('/v1/auth/otp') && !path.startsWith('/v1/auth/mfa/verify')) onUnauthenticated?.();
    throw new ApiError(problem);
  }
  return data as T;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export const api = {
  get: <T>(path: string, query?: Query, signal?: AbortSignal) => request<T>('GET', path, { query, signal }),
  post: <T>(path: string, body?: unknown, opts: Omit<RequestOptions, 'body'> = {}) => request<T>('POST', path, { ...opts, body }),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, { body }),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, { body }),
  del: <T = void>(path: string, query?: Query) => request<T>('DELETE', path, { query }),
  upload: <T>(path: string, form: FormData) => request<T>('POST', path, { form }),
};

export function newIdempotencyKey() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** URL for a file the API serves (attachments, exports). Goes through the web server so the session cookie applies. */
export const fileUrl = (path: string) => `/api${path}`;
