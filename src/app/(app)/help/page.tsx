'use client';

import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { BellRing, Hammer, LifeBuoy, MapPin, Phone, Settings2 } from 'lucide-react';
import { api, newIdempotencyKey } from '@/lib/api';
import { useServiceCategories, useContacts } from '@/lib/data';
import { useSession } from '@/lib/session';
import type { HelpPreferences, HelpResult, IncomingHelp } from '@/lib/types';
import { useI18n } from '@/i18n';
import { Badge, Button, Card, CardBody, CardHeader, cx, ErrorNotice, LoadingBlock, Notice, PageHeader, Section } from '@/components/ui';
import { Checkbox, Input, Select, Switch, Textarea } from '@/components/form';
import { Dialog, FormDialog } from '@/components/dialog';
import { StatusBadge } from '@/components/status';

type Kind = 'notify_contacts' | 'call' | 'service_request';

interface MyHelp {
  id: string;
  kind: Kind;
  message: string | null;
  status: string;
  createdAt: string;
}

export default function HelpPage() {
  const { t, e, locale } = useI18n();
  const { fmt, me } = useSession();
  const router = useRouter();
  const qc = useQueryClient();
  const prefs = useQuery({ queryKey: ['help', 'prefs'], queryFn: () => api.get<HelpPreferences>('/v1/help/preferences') });
  const mine = useQuery({ queryKey: ['help', 'mine'], queryFn: () => api.get<MyHelp[]>('/v1/help/requests') });
  const incoming = useQuery({ queryKey: ['help', 'incoming'], queryFn: () => api.get<IncomingHelp[]>('/v1/help/requests/incoming'), refetchInterval: 30_000 });
  const categories = useServiceCategories();
  const [kind, setKind] = useState<Kind | null>(null);
  const [message, setMessage] = useState('');
  const [shareLocation, setShareLocation] = useState(false);
  const [categoryId, setCategoryId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [result, setResult] = useState<HelpResult | null>(null);
  const [prefsOpen, setPrefsOpen] = useState(false);
  // One key per help attempt, so a double tap or a retry after a network error never sends twice.
  const idemKey = useRef<string>(newIdempotencyKey());

  useEffect(() => {
    if (prefs.data) {
      setShareLocation(prefs.data.shareLocationByDefault);
      setMessage(prefs.data.defaultMessage ?? '');
    }
  }, [prefs.data]);

  const getLocation = () =>
    new Promise<{ lat: number; lng: number } | null>((resolve) => {
      if (!('geolocation' in navigator)) return resolve(null);
      navigator.geolocation.getCurrentPosition(
        (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 60_000 },
      );
    });

  const send = async () => {
    if (!kind) return;
    setBusy(true);
    setError(null);
    try {
      const loc = shareLocation && kind !== 'call' ? await getLocation() : null;
      const r = await api.post<HelpResult>(
        '/v1/help/requests',
        {
          kind,
          message: message.trim() || undefined,
          shareLocation: !!loc,
          lat: loc?.lat,
          lng: loc?.lng,
          serviceCategoryId: kind === 'service_request' ? categoryId : undefined,
        },
        { idempotencyKey: idemKey.current },
      );
      setResult(r);
      setKind(null);
      idemKey.current = newIdempotencyKey();
      qc.invalidateQueries({ queryKey: ['help'] });
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  const options: { kind: Kind; icon: React.ComponentType<{ className?: string }>; tone: string }[] = [
    { kind: 'notify_contacts', icon: BellRing, tone: 'bg-danger text-white hover:bg-danger-hover' },
    { kind: 'call', icon: Phone, tone: 'bg-surface text-danger border-2 border-danger hover:bg-danger-soft' },
    { kind: 'service_request', icon: Hammer, tone: 'bg-surface text-ink border-2 border-line-strong hover:bg-surface-2' },
  ];
  const recipients = prefs.data?.alertRecipients ?? [];

  return (
    <div className="max-w-3xl">
      <PageHeader
        title={t('help.title')}
        description={t('help.intro')}
        actions={
          <Button variant="secondary" icon={<Settings2 className="size-4" />} onClick={() => setPrefsOpen(true)}>
            {t('help.settings')}
          </Button>
        }
      />
      <Notice tone="danger" className="mb-5" title={t('help.emergencyTitle', { number: prefs.data?.emergencyNumber ?? me.profile.countryDefaults?.emergency ?? '112' })}>
        <span>{locale === 'en' && prefs.data?.disclaimer ? prefs.data.disclaimer : t('help.disclaimer')}</span>{' '}
        <a href={`tel:${prefs.data?.emergencyNumber ?? me.profile.countryDefaults?.emergency ?? '112'}`} className="font-bold underline">
          {t('help.callNow', { number: prefs.data?.emergencyNumber ?? me.profile.countryDefaults?.emergency ?? '112' })}
        </a>
      </Notice>

      {(incoming.data?.filter((h) => h.status === 'open' || h.status === 'acknowledged').length ?? 0) > 0 && (
        <Section title={t('help.someoneNeedsHelp')}>
          <div className="space-y-2">
            {incoming.data!
              .filter((h) => h.status === 'open' || h.status === 'acknowledged')
              .map((h) => (
                <Link key={h.id} href={`/help/requests/${h.id}`} className="card flex items-center gap-3 border-danger/50 bg-danger-soft px-4 py-3">
                  <LifeBuoy className="size-6 text-danger" />
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-danger">{t('help.needsHelp', { name: h.displayName })}</div>
                    <div className="text-sm text-ink-2">
                      {h.message ?? e('helpKind', h.kind)} · {fmt.ago(h.createdAt)}
                    </div>
                  </div>
                  <StatusBadge group="helpStatus" value={h.status} />
                </Link>
              ))}
          </div>
        </Section>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        {options.map((o) => (
          <button
            key={o.kind}
            type="button"
            onClick={() => {
              setError(null);
              setKind(o.kind);
            }}
            className={cx('flex min-h-[9rem] flex-col items-center justify-center gap-3 rounded-2xl px-4 py-6 text-center text-lg font-bold shadow-sm transition-colors', o.tone)}
          >
            <o.icon className="size-9" />
            {e('helpKind', o.kind)}
          </button>
        ))}
      </div>
      <p className="mt-3 text-sm text-muted">
        {recipients.length ? t('help.willAlert', { names: recipients.map((r) => r.displayName).join(', ') }) : t('help.noRecipients')}{' '}
        <Link href="/sharing" className="font-semibold text-brand">
          {t('nav.sharing')}
        </Link>
      </p>

      <Section title={t('help.history')} className="mt-8">
        {mine.isLoading && <LoadingBlock rows={2} />}
        {mine.data?.length === 0 && <p className="text-sm text-muted">{t('help.noHistory')}</p>}
        <ul className="card divide-y divide-line">
          {mine.data?.map((h) => (
            <li key={h.id}>
              <Link href={`/help/requests/${h.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2">
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{e('helpKind', h.kind)}</span>
                  <span className="text-sm text-muted">{fmt.dateTime(h.createdAt)}</span>
                </span>
                <StatusBadge group="helpStatus" value={h.status} />
              </Link>
            </li>
          ))}
          {(incoming.data ?? [])
            .filter((h) => h.status === 'resolved' || h.status === 'cancelled')
            .map((h) => (
              <li key={h.id}>
                <Link href={`/help/requests/${h.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2">
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{t('help.needsHelp', { name: h.displayName })}</span>
                    <span className="text-sm text-muted">{fmt.dateTime(h.createdAt)}</span>
                  </span>
                  <StatusBadge group="helpStatus" value={h.status} />
                </Link>
              </li>
            ))}
        </ul>
      </Section>

      {/* Confirm and send */}
      <Dialog
        open={!!kind}
        onClose={() => setKind(null)}
        title={kind ? e('helpKind', kind) : ''}
        footer={
          <>
            <Button variant="ghost" onClick={() => setKind(null)}>
              {t('common.cancel')}
            </Button>
            <Button variant="danger" size="lg" loading={busy} disabled={kind === 'service_request' && !categoryId} onClick={send}>
              {kind === 'call' ? t('help.showNumbers') : t('help.sendNow')}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {kind === 'notify_contacts' && <p className="text-ink-2">{recipients.length ? t('help.willAlert', { names: recipients.map((r) => r.displayName).join(', ') }) : t('help.noRecipients')}</p>}
          {kind === 'service_request' && (
            <Select label={t('help.whatService')} value={categoryId} onChange={(ev) => setCategoryId(ev.target.value)} placeholder={t('common.selectPlaceholder')} options={(categories.data ?? []).filter((c) => c.active).map((c) => ({ value: c.id, label: c.name }))} />
          )}
          {kind !== 'call' && (
            <>
              <Textarea label={t('help.message')} optional value={message} onChange={(ev) => setMessage(ev.target.value)} maxLength={300} rows={2} placeholder={t('help.messagePlaceholder')} />
              <Checkbox label={t('help.shareLocation')} hint={t('help.shareLocationHint')} checked={shareLocation} onChange={setShareLocation} />
            </>
          )}
          <ErrorNotice error={error} />
        </div>
      </Dialog>

      {/* Result */}
      <Dialog open={!!result} onClose={() => setResult(null)} title={t('help.sentTitle')} footer={<Button onClick={() => (result ? router.push(`/help/requests/${result.helpRequest.id}`) : null)}>{t('help.track')}</Button>}>
        {result && (
          <div className="space-y-4">
            {result.callTargets.length > 0 && (
              <div className="space-y-2">
                {result.callTargets.map((c) => (
                  <a key={c.number} href={`tel:${c.number}`} className={cx('flex items-center justify-between rounded-xl px-4 py-3 text-lg font-bold', c.kind === 'emergency' ? 'bg-danger text-white' : 'bg-brand-soft text-brand')}>
                    <span className="flex items-center gap-2">
                      <Phone className="size-5" /> {c.label}
                    </span>
                    <span className="tabular-nums" dir="ltr">{c.number}</span>
                  </a>
                ))}
              </div>
            )}
            <ul className="space-y-1.5">
              {result.actions.map((a, i) => (
                <li key={i} className="flex items-start justify-between gap-3 rounded-lg bg-surface-2 px-3 py-2 text-sm">
                  <span>{a.detail}</span>
                  <Badge tone={a.status === 'simulated' ? 'accent' : a.status === 'failed' ? 'danger' : 'neutral'}>{a.status}</Badge>
                </li>
              ))}
            </ul>
            {result.helpRequest.location && (
              <p className="flex items-center gap-1.5 text-sm text-muted">
                <MapPin className="size-4" /> {t('help.locationShared', { until: fmt.dateTime(result.helpRequest.location.visibleUntil) })}
              </p>
            )}
            <p className="text-xs text-muted">{result.disclaimer}</p>
          </div>
        )}
      </Dialog>

      {prefs.data && <PrefsDialog open={prefsOpen} onClose={() => setPrefsOpen(false)} prefs={prefs.data} meId={me.id} />}
    </div>
  );
}

function PrefsDialog({ open, onClose, prefs, meId }: { open: boolean; onClose: () => void; prefs: HelpPreferences; meId: string }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const contacts = useContacts();
  const [f, setF] = useState({
    emergencyNumber: prefs.emergencyNumber,
    primaryCallContactId: prefs.primaryCallContactId ?? '',
    notifyContacts: prefs.notifyContacts,
    shareLocationByDefault: prefs.shareLocationByDefault,
    defaultMessage: prefs.defaultMessage ?? '',
  });
  void meId;
  return (
    <FormDialog
      open={open}
      onClose={onClose}
      title={t('help.settings')}
      onSubmit={async () => {
        await api.put('/v1/help/preferences', {
          emergencyNumber: f.emergencyNumber.trim(),
          primaryCallContactId: f.primaryCallContactId || null,
          notifyContacts: f.notifyContacts,
          shareLocationByDefault: f.shareLocationByDefault,
          defaultMessage: f.defaultMessage.trim() || null,
        });
        qc.invalidateQueries({ queryKey: ['help'] });
      }}
    >
      <Input label={t('help.emergencyNumber')} hint={t('help.emergencyNumberHint')} inputMode="tel" value={f.emergencyNumber} onChange={(e) => setF({ ...f, emergencyNumber: e.target.value })} />
      <Select label={t('help.callFirst')} hint={t('help.callFirstHint')} value={f.primaryCallContactId} onChange={(e) => setF({ ...f, primaryCallContactId: e.target.value })} placeholder={t('common.none')} options={(contacts.data ?? []).map((c) => ({ value: c.contactUserId, label: c.displayName }))} />
      <Textarea label={t('help.defaultMessage')} optional value={f.defaultMessage} onChange={(e) => setF({ ...f, defaultMessage: e.target.value })} maxLength={200} rows={2} />
      <Switch label={t('help.notifyContacts')} checked={f.notifyContacts} onChange={(v) => setF({ ...f, notifyContacts: v })} />
      <Switch label={t('help.shareByDefault')} hint={t('help.shareByDefaultHint')} checked={f.shareLocationByDefault} onChange={(v) => setF({ ...f, shareLocationByDefault: v })} />
      <Card className="shadow-none">
        <CardHeader title={t('help.whoGetsAlerts')} />
        <CardBody>
          <p className="text-sm text-muted">{prefs.alertRecipients.length ? prefs.alertRecipients.map((r) => r.displayName).join(', ') : t('help.noRecipients')}</p>
        </CardBody>
      </Card>
    </FormDialog>
  );
}
