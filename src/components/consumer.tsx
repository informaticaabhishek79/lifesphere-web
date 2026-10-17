'use client';

import { ExternalLink, Phone } from 'lucide-react';
import { useSession } from '@/lib/session';
import type { OfficialChannel } from '@/lib/types';
import { useI18n } from '@/i18n';
import { Badge, Card, CardBody } from './ui';

export const CASE_CATEGORIES = ['ecommerce', 'electronics', 'telecom', 'banking_service', 'insurance_service', 'utilities', 'travel', 'real_estate', 'healthcare_service', 'education', 'other'];

export function ChannelCard({ c }: { c: OfficialChannel }) {
  const { t, e } = useI18n();
  const { fmt } = useSession();
  return (
    <Card>
      <CardBody className="space-y-2 pt-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold">{c.name}</span>
          <Badge tone="info">{e('channelKind', c.kind)}</Badge>
          {c.jurisdiction && <Badge>{c.jurisdiction}</Badge>}
        </div>
        {c.description && <p className="text-sm text-ink-2">{c.description}</p>}
        <div className="flex flex-wrap gap-3 text-sm">
          {c.url && (
            <a href={c.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-brand">
              <ExternalLink className="size-4" /> {t('consumer.website')}
            </a>
          )}
          {c.phone && (
            <a href={`tel:${c.phone}`} className="inline-flex items-center gap-1 font-semibold text-brand">
              <Phone className="size-4" /> <bdi dir="ltr">{c.phone}</bdi>
            </a>
          )}
        </div>
        {c.lastReviewedOn && <p className="text-xs text-muted">{t('consumer.checkedOn', { date: fmt.day(c.lastReviewedOn) })}</p>}
      </CardBody>
    </Card>
  );
}

