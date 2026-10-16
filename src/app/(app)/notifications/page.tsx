'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { Bell, BellRing, CheckCheck, Monitor, Smartphone, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useAction, usePaged } from '@/lib/hooks';
import { linkFor } from '@/lib/links';
import { useSession } from '@/lib/session';
import type { DeviceInfo, NotificationItem, NotificationPref } from '@/lib/types';
import { useI18n } from '@/i18n';
import { Badge, Button, Card, CardBody, CardHeader, cx, EmptyState, ErrorNotice, IconButton, LoadingBlock, LoadMore, Notice, PageHeader, Tabs } from '@/components/ui';
import { Checkbox } from '@/components/form';

type Tab = 'inbox' | 'settings' | 'devices';

function Inner() {
  const { t } = useI18n();
  const params = useSearchParams();
  const [tab, setTab] = useState<Tab>((params.get('tab') as Tab) ?? 'inbox');
  return (
    <div>
      <PageHeader title={t('notifications.title')} />
      <Tabs<Tab>
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'inbox', label: t('notifications.title') },
          { value: 'settings', label: t('notifications.preferences') },
          { value: 'devices', label: t('notifications.devices') },
        ]}
      />
      {tab === 'inbox' && <Inbox />}
      {tab === 'settings' && <Prefs />}
      {tab === 'devices' && <Devices />}
    </div>
  );
}

export default function NotificationsPage() {
  return (
    <Suspense>
      <Inner />
    </Suspense>
  );
}

function Inbox() {
  const { t, e } = useI18n();
  const { fmt } = useSession();
  const router = useRouter();
  const qc = useQueryClient();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const list = usePaged<NotificationItem, { unreadCount: number }>(['notifications', 'inbox'], '/v1/notifications', { unreadOnly: unreadOnly ? 'true' : undefined });
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['notifications'] });
    qc.invalidateQueries({ queryKey: ['dashboard'] });
  };
  const markAll = useAction(() => api.post('/v1/notifications/read', {}), { onSuccess: refresh });
  const remove = useAction((id: string) => api.del(`/v1/notifications/${id}`), { onSuccess: refresh });
  const open = async (n: NotificationItem) => {
    if (!n.readAt) await api.post('/v1/notifications/read', { ids: [n.id] }).catch(() => {});
    refresh();
    const href = linkFor(n.data);
    if (href) router.push(href);
  };
  const unread = list.first?.unreadCount ?? 0;
  return (
    <div className="max-w-3xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Checkbox label={t('notifications.unreadOnly')} checked={unreadOnly} onChange={setUnreadOnly} />
        {unread > 0 && (
          <Button size="sm" variant="secondary" icon={<CheckCheck className="size-4" />} loading={markAll.isPending} onClick={() => markAll.mutate()}>
            {t('notifications.markAllRead')}
          </Button>
        )}
      </div>
      {list.isLoading && <LoadingBlock />}
      <ErrorNotice error={list.error} onRetry={list.refetch} />
      {!list.isLoading && list.items.length === 0 && <EmptyState icon={<Bell className="size-6" />} title={t('notifications.empty')} />}
      <ul className="space-y-2">
        {list.items.map((n) => (
          <li key={n.id} className={cx('card flex items-start gap-3 px-4 py-3.5', !n.readAt && 'border-brand/40 bg-brand-softer')}>
            <span className={cx('mt-1.5 size-2.5 shrink-0 rounded-full', n.readAt ? 'bg-transparent' : n.category === 'help' ? 'bg-danger' : 'bg-accent')} aria-hidden />
            <button type="button" className="min-w-0 flex-1 text-left" onClick={() => open(n)}>
              <div className="flex flex-wrap items-center gap-2">
                <span className={cx('font-semibold', n.category === 'help' && 'text-danger')}>{n.title}</span>
                <Badge tone={n.category === 'help' || n.category === 'security' ? 'danger' : 'neutral'}>{e('notificationCategory', n.category)}</Badge>
              </div>
              {n.body && <p className="mt-0.5 text-sm text-ink-2">{n.body}</p>}
              <p className="mt-1 text-xs text-muted">{fmt.ago(n.createdAt)}</p>
            </button>
            <IconButton label={t('common.delete')} onClick={() => remove.mutate(n.id)}>
              <Trash2 className="size-4" />
            </IconButton>
          </li>
        ))}
      </ul>
      <LoadMore hasMore={list.hasMore} loading={list.loadingMore} onClick={list.loadMore} />
    </div>
  );
}

function Prefs() {
  const { t, e } = useI18n();
  const q = useQuery({ queryKey: ['notification-prefs'], queryFn: () => api.get<NotificationPref[]>('/v1/notifications/preferences') });
  const qc = useQueryClient();
  const save = useAction((items: Partial<NotificationPref>[]) => api.put<NotificationPref[]>('/v1/notifications/preferences', { items }), {
    onSuccess: (r) => qc.setQueryData(['notification-prefs'], r),
  });
  const cols: { key: keyof NotificationPref; label: string }[] = [
    { key: 'inApp', label: t('notifications.inApp') },
    { key: 'push', label: t('notifications.push') },
    { key: 'sms', label: t('notifications.sms') },
    { key: 'email', label: t('notifications.email') },
    { key: 'bypassQuietHours', label: t('notifications.bypassQuiet') },
  ];
  return (
    <Card className="max-w-4xl">
      <CardHeader title={t('notifications.preferences')} description={t('notifications.preferencesHint')} />
      <CardBody>
        {q.isLoading && <LoadingBlock />}
        <ErrorNotice error={q.error} />
        {q.data && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                  <th className="py-2 pr-3 font-semibold">{t('common.category')}</th>
                  {cols.map((c) => (
                    <th key={c.key} className="px-2 py-2 text-center font-semibold">
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {q.data.map((p) => (
                  <tr key={p.category}>
                    <td className="py-2.5 pr-3 font-medium">{e('notificationCategory', p.category)}</td>
                    {cols.map((c) => (
                      <td key={c.key} className="px-2 py-2.5 text-center">
                        <input
                          type="checkbox"
                          aria-label={`${e('notificationCategory', p.category)} — ${c.label}`}
                          className="size-5 accent-[var(--brand)]"
                          checked={Boolean(p[c.key])}
                          onChange={(ev) => save.mutate([{ category: p.category, [c.key]: ev.target.checked }])}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function urlB64ToUint8Array(b64: string) {
  const padding = '='.repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

function Devices() {
  const { t, e } = useI18n();
  const { fmt } = useSession();
  const qc = useQueryClient();
  const devices = useQuery({ queryKey: ['devices'], queryFn: () => api.get<DeviceInfo[]>('/v1/notifications/devices') });
  const key = useQuery({ queryKey: ['webpush-key'], queryFn: () => api.get<{ publicKey: string | null }>('/v1/notifications/webpush/public-key') });
  const remove = useAction((id: string) => api.del(`/v1/notifications/devices/${id}`), { invalidate: [['devices']] });
  const [perm, setPerm] = useState<NotificationPermission | 'unsupported'>('default');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  useEffect(() => {
    setPerm(typeof Notification === 'undefined' || !('serviceWorker' in navigator) ? 'unsupported' : Notification.permission);
  }, []);
  const enable = async () => {
    setBusy(true);
    setError(null);
    try {
      const permission = await Notification.requestPermission();
      setPerm(permission);
      if (permission !== 'granted' || !key.data?.publicKey) return;
      const reg = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;
      const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64ToUint8Array(key.data.publicKey) }));
      await api.post('/v1/notifications/devices', { platform: 'web', token: JSON.stringify(sub), label: navigator.userAgent.includes('Mobile') ? 'Mobile browser' : 'Desktop browser' });
      qc.invalidateQueries({ queryKey: ['devices'] });
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="max-w-3xl space-y-4">
      <Card>
        <CardHeader icon={<BellRing className="size-5" />} title={t('notifications.enableBrowserPush')} />
        <CardBody className="space-y-3">
          {!key.data?.publicKey ? (
            <Notice tone="info">{t('notifications.browserPushUnavailable')}</Notice>
          ) : perm === 'denied' ? (
            <Notice tone="warn">{t('notifications.browserPushBlocked')}</Notice>
          ) : perm === 'unsupported' ? null : (
            <Button onClick={enable} loading={busy}>
              {t('notifications.enableBrowserPush')}
            </Button>
          )}
          <ErrorNotice error={error} />
        </CardBody>
      </Card>
      {devices.isLoading && <LoadingBlock rows={2} />}
      <ul className="card divide-y divide-line">
        {devices.data?.map((d) => (
          <li key={d.id} className="flex items-center gap-3 px-4 py-3">
            {d.platform === 'web' ? <Monitor className="size-5 text-muted" /> : <Smartphone className="size-5 text-muted" />}
            <div className="flex-1">
              <div className="font-medium">{d.label ?? e('platform', d.platform)}</div>
              <div className="text-sm text-muted">{fmt.ago(d.lastSeenAt ?? d.createdAt)}</div>
            </div>
            <IconButton label={t('common.remove')} onClick={() => remove.mutate(d.id)}>
              <Trash2 className="size-4" />
            </IconButton>
          </li>
        ))}
        {devices.data?.length === 0 && <li className="px-4 py-6 text-center text-sm text-muted">{t('common.emptyList')}</li>}
      </ul>
    </div>
  );
}
