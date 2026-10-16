/** Locale- and time-zone-aware formatting. Times are shown in the user's profile time zone. */
export function makeFormat(tag: string, timeZone: string) {
  const safe = (fn: () => string, fallback = '') => {
    try {
      return fn();
    } catch {
      return fallback;
    }
  };
  const d = (v: string | Date) => (typeof v === 'string' ? new Date(v) : v);
  const dayKey = (v: Date) => new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(v);

  const date = (v?: string | Date | null, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }) =>
    v ? safe(() => new Intl.DateTimeFormat(tag, { timeZone, ...opts }).format(d(v))) : '';

  /** Plain calendar dates (YYYY-MM-DD) have no time zone; format them as-is. */
  const day = (v?: string | null, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }) =>
    v ? safe(() => new Intl.DateTimeFormat(tag, { timeZone: 'UTC', ...opts }).format(new Date(`${v.slice(0, 10)}T00:00:00Z`))) : '';

  const time = (v?: string | Date | null) => (v ? safe(() => new Intl.DateTimeFormat(tag, { timeZone, hour: 'numeric', minute: '2-digit' }).format(d(v))) : '');

  const dateTime = (v?: string | Date | null) =>
    v ? safe(() => new Intl.DateTimeFormat(tag, { timeZone, day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(d(v))) : '';

  const relativeDay = (v: string | Date, labels: { today: string; tomorrow: string; yesterday: string }) => {
    const target = dayKey(d(v));
    const now = new Date();
    if (target === dayKey(now)) return labels.today;
    if (target === dayKey(new Date(now.getTime() + 86_400_000))) return labels.tomorrow;
    if (target === dayKey(new Date(now.getTime() - 86_400_000))) return labels.yesterday;
    return date(v, { weekday: 'short', day: 'numeric', month: 'short' });
  };

  const ago = (v?: string | Date | null) => {
    if (!v) return '';
    const diff = (d(v).getTime() - Date.now()) / 1000;
    const rtf = new Intl.RelativeTimeFormat(tag, { numeric: 'auto' });
    const abs = Math.abs(diff);
    if (abs < 60) return rtf.format(Math.round(diff), 'second');
    if (abs < 3600) return rtf.format(Math.round(diff / 60), 'minute');
    if (abs < 86400) return rtf.format(Math.round(diff / 3600), 'hour');
    if (abs < 86400 * 7) return rtf.format(Math.round(diff / 86400), 'day');
    return date(v);
  };

  const money = (amount: string | number, currency = 'INR') =>
    safe(() => new Intl.NumberFormat(tag, { style: 'currency', currency, maximumFractionDigits: 2 }).format(Number(amount)), String(amount));

  const number = (n: number) => safe(() => new Intl.NumberFormat(tag).format(n), String(n));

  return { date, day, time, dateTime, relativeDay, ago, money, number, timeZone, tag, isToday: (v: string | Date) => dayKey(d(v)) === dayKey(new Date()) };
}

export type Format = ReturnType<typeof makeFormat>;

/** `<input type="datetime-local">` value (browser local time) → ISO string. */
export function localInputToIso(v: string): string | undefined {
  if (!v) return undefined;
  const dt = new Date(v);
  return Number.isNaN(dt.getTime()) ? undefined : dt.toISOString();
}

/** ISO string → `<input type="datetime-local">` value in browser local time. */
export function isoToLocalInput(v?: string | null): string {
  if (!v) return '';
  const dt = new Date(v);
  if (Number.isNaN(dt.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
}

export function todayIso() {
  const dt = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
}
