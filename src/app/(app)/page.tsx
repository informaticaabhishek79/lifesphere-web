'use client';

import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlarmClock,
  CalendarDays,
  Check,
  CheckSquare,
  ClipboardList,
  HeartPulse,
  LifeBuoy,
  MessagesSquare,
  Plus,
  Receipt,
  Search,
  ShoppingCart,
  Users,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useSession } from '@/lib/session';
import type { Dashboard } from '@/lib/types';
import { useI18n } from '@/i18n';
import { Badge, Button, Card, CardBody, CardHeader, cx, EmptyState, ErrorNotice, LoadingBlock, Notice } from '@/components/ui';
import { PriorityBadge, StatusBadge } from '@/components/status';
import { useToast } from '@/components/dialog';

const QUICK: Record<string, { href: string; icon: React.ComponentType<{ className?: string }>; tone?: 'danger' }> = {
  add_task: { href: '/tasks?new=1', icon: Plus },
  add_reminder: { href: '/reminders?new=1', icon: AlarmClock },
  add_grocery: { href: '/lists', icon: ShoppingCart },
  check_in: { href: '/check-ins', icon: HeartPulse },
  get_help: { href: '/help', icon: LifeBuoy, tone: 'danger' },
  find_service: { href: '/services', icon: Search },
  new_case: { href: '/consumer?new=1', icon: Receipt },
};

export default function DashboardPage() {
  const { t } = useI18n();
  const { me, fmt } = useSession();
  const qc = useQueryClient();
  const toast = useToast();
  const q = useQuery({ queryKey: ['dashboard'], queryFn: () => api.get<Dashboard>('/v1/me/dashboard'), refetchInterval: 120_000 });

  const checkIn = useMutation({
    mutationFn: () => api.post<{ status: string }>('/v1/check-ins/now', {}),
    onSuccess: (r) => {
      toast(r.status === 'no_open_check_in' ? t('checkins.nothingOpen') : t('dashboard.checkedIn'));
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['checkins'] });
    },
    onError: (e) => toast((e as Error).message, 'danger'),
  });

  const hour = Number(new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hourCycle: 'h23', timeZone: fmt.timeZone }).format(new Date()));
  const greetingKey = hour < 12 ? 'dashboard.greetingMorning' : hour < 17 ? 'dashboard.greetingAfternoon' : 'dashboard.greetingEvening';
  const d = q.data;
  const senior = me.profile.seniorMode;

  return (
    <div>
      <header className="mb-7 rise">
        <p className="text-sm font-semibold text-accent">{fmt.date(new Date(), { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        <h1 className="font-display mt-1 text-[2.1rem] leading-tight font-semibold sm:text-[2.6rem]">{t(greetingKey, { name: me.profile.displayName })}</h1>
        {d?.todayTasks && (
          <p className="mt-1.5 text-muted">{t('dashboard.todaySummary', { tasks: d.todayTasks.length, overdue: d.overdueTaskCount ?? 0 })}</p>
        )}
      </header>

      {q.isLoading && <LoadingBlock rows={4} />}
      {q.error && <ErrorNotice error={q.error} onRetry={() => q.refetch()} />}

      {d && (
        <div className="space-y-6">
          {/* Quick actions */}
          {d.quickActions && d.quickActions.length > 0 && (
            <section aria-label={t('dashboard.quickActions')}>
              <div className={cx('grid gap-2.5', senior ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-2 sm:grid-cols-4 xl:grid-cols-7')}>
                {d.quickActions.map((a) => {
                  const cfg = QUICK[a.key];
                  if (!cfg) return null;
                  const Icon = cfg.icon;
                  if (a.key === 'check_in') {
                    return (
                      <button
                        key={a.key}
                        type="button"
                        onClick={() => checkIn.mutate()}
                        disabled={checkIn.isPending}
                        className="card flex items-center gap-3 px-4 py-3.5 text-start font-semibold text-ok hover:border-ok/40 disabled:opacity-60"
                      >
                        <span className="flex size-9 items-center justify-center rounded-xl bg-ok-soft">
                          <Check className="size-5" />
                        </span>
                        <span className="text-sm leading-tight">{t(`dashboard.quick.${a.key}`)}</span>
                      </button>
                    );
                  }
                  return (
                    <Link
                      key={a.key}
                      href={cfg.href}
                      className={cx('card flex items-center gap-3 px-4 py-3.5 font-semibold hover:border-line-strong', cfg.tone === 'danger' ? 'text-danger' : 'text-ink')}
                    >
                      <span className={cx('flex size-9 items-center justify-center rounded-xl', cfg.tone === 'danger' ? 'bg-danger-soft' : 'bg-brand-soft text-brand')}>
                        <Icon className="size-5" />
                      </span>
                      <span className="text-sm leading-tight">{t(`dashboard.quick.${a.key}`)}</span>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {(d.pendingGrantsToReview ?? 0) > 0 && (
            <Notice tone="warn" action={<Link href="/sharing" className="font-semibold underline">{t('common.view')}</Link>}>
              {t('dashboard.pendingGrants', { count: d.pendingGrantsToReview! })}
            </Notice>
          )}

          <div className={cx('grid gap-5', senior ? 'grid-cols-1' : 'lg:grid-cols-2')}>
            {d.todayTasks && (
              <Card>
                <CardHeader
                  icon={<CheckSquare className="size-5" />}
                  title={t('dashboard.todayTasks')}
                  description={(d.overdueTaskCount ?? 0) > 0 ? <span className="font-semibold text-danger">{t('dashboard.overdueCount', { count: d.overdueTaskCount! })}</span> : undefined}
                  action={<Link href="/tasks" className="text-sm font-semibold text-brand">{t('common.view')}</Link>}
                />
                <CardBody>
                  {d.todayTasks.length === 0 ? (
                    <p className="rounded-xl bg-surface-2 px-4 py-6 text-center text-sm text-muted">{t('dashboard.noTasksToday')}</p>
                  ) : (
                    <ul className="divide-y divide-line">
                      {d.todayTasks.map((task) => (
                        <li key={task.id}>
                          <Link href={`/tasks/${task.id}`} className="flex items-center gap-3 py-2.5 hover:text-brand">
                            <span className="size-4 shrink-0 rounded-md border-2 border-line-strong" aria-hidden />
                            <span className="min-w-0 flex-1 truncate font-medium">{task.title}</span>
                            <PriorityBadge value={task.priority} />
                            {task.dueAt && <span className="text-sm text-muted tabular-nums">{fmt.time(task.dueAt)}</span>}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardBody>
              </Card>
            )}

            {d.myCheckIns && (
              <Card>
                <CardHeader icon={<HeartPulse className="size-5" />} title={t('dashboard.myCheckIns')} action={<Link href="/check-ins" className="text-sm font-semibold text-brand">{t('common.view')}</Link>} />
                <CardBody className="space-y-4">
                  {d.myCheckIns.length > 0 && (
                    <ul className="space-y-2">
                      {d.myCheckIns.map((c) => (
                        <li key={c.id} className="flex items-center justify-between gap-3 rounded-xl bg-surface-2 px-3 py-2.5">
                          <span className="font-medium tabular-nums">{fmt.time(c.dueAt)}</span>
                          <StatusBadge group="checkInState" value={c.state} />
                        </li>
                      ))}
                    </ul>
                  )}
                  {d.myCheckIns.length > 0 ? (
                    <Button size={senior ? 'xl' : 'lg'} variant="primary" className="w-full bg-ok hover:bg-ok/90" icon={<Check className="size-5" />} loading={checkIn.isPending} onClick={() => checkIn.mutate()}>
                      {t('dashboard.checkInNow')}
                    </Button>
                  ) : (
                    (d.peopleICheckOn?.length ?? 0) === 0 && (
                      <Link href="/check-ins" className="block rounded-xl bg-surface-2 px-4 py-3 text-sm text-ink-2 hover:text-brand">
                        {t('dashboard.setUpCheckIns')} <span aria-hidden className="flip-rtl inline-block">→</span>
                      </Link>
                    )
                  )}
                  {d.peopleICheckOn && d.peopleICheckOn.length > 0 && (
                    <div>
                      <div className="mb-2 text-sm font-semibold text-muted">{t('dashboard.peopleICheckOn')}</div>
                      <ul className="space-y-2">
                        {d.peopleICheckOn.map((p) => (
                          <li key={p.eventId}>
                            <Link href={`/check-ins/events/${p.eventId}`} className="flex items-center justify-between gap-3 rounded-xl border border-line px-3 py-2.5 hover:bg-surface-2">
                              <span className="font-medium">{p.displayName}</span>
                              <span className="flex items-center gap-2 text-sm text-muted">
                                {fmt.time(p.dueAt)} <StatusBadge group="checkInState" value={p.state} />
                              </span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardBody>
              </Card>
            )}

            {d.upcomingReminders && (
              <Card>
                <CardHeader icon={<AlarmClock className="size-5" />} title={t('dashboard.upcomingReminders')} action={<Link href="/reminders" className="text-sm font-semibold text-brand">{t('common.view')}</Link>} />
                <CardBody>
                  {d.upcomingReminders.length === 0 ? (
                    <p className="text-sm text-muted">{t('dashboard.noReminders')}</p>
                  ) : (
                    <ul className="divide-y divide-line">
                      {d.upcomingReminders.map((r) => (
                        <li key={r.id} className="flex items-center justify-between gap-3 py-2.5">
                          <span className="min-w-0 truncate font-medium">{r.title}</span>
                          <span className="shrink-0 text-sm text-muted">
                            {fmt.relativeDay(r.fireAt, { today: t('common.today'), tomorrow: t('common.tomorrow'), yesterday: t('common.yesterday') })} · {fmt.time(r.fireAt)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardBody>
              </Card>
            )}

            {d.familyActivity && d.familyActivity.length > 0 && (
              <Card>
                <CardHeader icon={<CalendarDays className="size-5" />} title={t('dashboard.familyActivity')} action={<Link href="/calendar" className="text-sm font-semibold text-brand">{t('common.view')}</Link>} />
                <CardBody>
                  <ul className="divide-y divide-line">
                    {d.familyActivity.map((ev) => (
                      <li key={ev.id} className="flex items-center justify-between gap-3 py-2.5">
                        <span className="min-w-0">
                          <span className="block truncate font-medium">{ev.title}</span>
                          <span className="text-xs text-muted">{t(`enums.eventKind.${ev.kind}`)}</span>
                        </span>
                        <span className="shrink-0 text-sm text-muted">
                          {fmt.relativeDay(ev.startsAt, { today: t('common.today'), tomorrow: t('common.tomorrow'), yesterday: t('common.yesterday') })} · {fmt.time(ev.startsAt)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardBody>
              </Card>
            )}

            {d.pendingTaskAssignments && d.pendingTaskAssignments.length > 0 && (
              <Card>
                <CardHeader icon={<Users className="size-5" />} title={t('dashboard.pendingAssignments')} action={<Link href="/tasks?tab=offered" className="text-sm font-semibold text-brand">{t('common.view')}</Link>} />
                <CardBody>
                  <ul className="divide-y divide-line">
                    {d.pendingTaskAssignments.map((a) => (
                      <li key={a.id} className="py-2.5 font-medium">
                        <Link href="/tasks?tab=offered" className="hover:text-brand">
                          {a.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </CardBody>
              </Card>
            )}

            {d.pendingServiceRequests && d.pendingServiceRequests.length > 0 && (
              <Card>
                <CardHeader icon={<ClipboardList className="size-5" />} title={t('dashboard.pendingServiceRequests')} action={<Link href="/service-requests" className="text-sm font-semibold text-brand">{t('common.view')}</Link>} />
                <CardBody>
                  <ul className="divide-y divide-line">
                    {d.pendingServiceRequests.map((r) => (
                      <li key={r.id}>
                        <Link href={`/service-requests/${r.id}`} className="flex items-center justify-between gap-3 py-2.5 hover:text-brand">
                          <span className="min-w-0 truncate font-medium">{r.title}</span>
                          <StatusBadge group="serviceRequestStatus" value={r.status} />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </CardBody>
              </Card>
            )}

            {d.communityUpdates && d.communityUpdates.length > 0 && (
              <Card>
                <CardHeader icon={<MessagesSquare className="size-5" />} title={t('dashboard.communityUpdates')} action={<Link href="/community" className="text-sm font-semibold text-brand">{t('common.view')}</Link>} />
                <CardBody>
                  <ul className="divide-y divide-line">
                    {d.communityUpdates.map((p) => (
                      <li key={p.id}>
                        <Link href={`/community/posts/${p.id}`} className="block py-2.5 hover:text-brand">
                          <span className="block truncate font-medium">{p.title ?? t(`enums.postKind.${p.kind}`)}</span>
                          <span className="text-xs text-muted">
                            {p.groupName} · {fmt.ago(p.createdAt)}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </CardBody>
              </Card>
            )}

            {d.recentConsumerCases && d.recentConsumerCases.length > 0 && (
              <Card>
                <CardHeader icon={<Receipt className="size-5" />} title={t('dashboard.consumerCases')} action={<Link href="/consumer" className="text-sm font-semibold text-brand">{t('common.view')}</Link>} />
                <CardBody>
                  <ul className="divide-y divide-line">
                    {d.recentConsumerCases.map((c) => (
                      <li key={c.id}>
                        <Link href={`/consumer/cases/${c.id}`} className="flex items-center justify-between gap-3 py-2.5 hover:text-brand">
                          <span className="min-w-0 truncate font-medium">{c.title}</span>
                          <StatusBadge group="caseStatus" value={c.status} />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </CardBody>
              </Card>
            )}
          </div>

          {d.todayTasks && d.todayTasks.length === 0 && !d.myCheckIns && !d.upcomingReminders && (
            <EmptyState title={t('dashboard.allClear')} body={t('dashboard.noTasksToday')} />
          )}

          <div className="flex justify-end">
            <Link href="/settings#widgets" className="text-sm font-semibold text-muted hover:text-ink">
              {t('dashboard.customise')} <span aria-hidden className="flip-rtl inline-block">→</span>
            </Link>
          </div>
        </div>
      )}
      {d && d.unreadNotifications > 0 && (
        <div className="sr-only" aria-live="polite">
          <Badge>{t('shell.unread', { count: d.unreadNotifications })}</Badge>
        </div>
      )}
    </div>
  );
}
