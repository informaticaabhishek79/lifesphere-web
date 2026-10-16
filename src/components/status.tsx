'use client';

import { Badge } from './ui';
import { useI18n } from '@/i18n';

type Tone = 'neutral' | 'brand' | 'ok' | 'warn' | 'danger' | 'info' | 'accent';

const TONES: Record<string, Tone> = {
  // generic
  pending: 'warn',
  open: 'warn',
  active: 'ok',
  completed: 'ok',
  resolved: 'ok',
  accepted: 'ok',
  published: 'ok',
  passed: 'ok',
  delivered: 'ok',
  sent: 'brand',
  scheduled: 'info',
  queued: 'neutral',
  sending: 'info',
  in_progress: 'info',
  in_review: 'info',
  received: 'info',
  draft: 'neutral',
  cancelled: 'neutral',
  closed: 'neutral',
  archived: 'neutral',
  expired: 'neutral',
  dismissed: 'neutral',
  left: 'neutral',
  declined: 'danger',
  rejected: 'danger',
  failed: 'danger',
  removed: 'danger',
  banned: 'danger',
  suspended: 'danger',
  disabled: 'danger',
  disputed: 'danger',
  simulated: 'accent',
  suppressed: 'neutral',
  hidden: 'warn',
  // check-ins
  reminded: 'warn',
  missed: 'danger',
  escalated: 'danger',
  acknowledged: 'ok',
  // grants
  pending_cooloff: 'warn',
  revoked: 'neutral',
  // help
  // consumer
  ready_to_submit: 'brand',
  submitted_by_user: 'info',
  awaiting_response: 'warn',
  info_required: 'danger',
  reported_by_user: 'info',
  // providers
  pending_review: 'warn',
  requested: 'warn',
  proposed: 'warn',
  actioned: 'ok',
  upheld: 'neutral',
  overturned: 'ok',
  pending_deletion: 'danger',
};

export function StatusBadge({ group, value, className }: { group: string; value: string | null | undefined; className?: string }) {
  const { e } = useI18n();
  if (!value) return null;
  return (
    <Badge tone={TONES[value] ?? 'neutral'} className={className}>
      {e(group, value)}
    </Badge>
  );
}

export function PriorityBadge({ value }: { value: string }) {
  const { e } = useI18n();
  if (value === 'normal') return null;
  const tone: Tone = value === 'urgent' ? 'danger' : value === 'high' ? 'accent' : 'neutral';
  return <Badge tone={tone}>{e('taskPriority', value)}</Badge>;
}
