'use client';

import { useCallback } from 'react';
import { api } from '@/lib/api';
import { useI18n } from '@/i18n';
import { InviteAccept } from '@/components/invite-accept';

export default function HouseholdInvitePage() {
  const { t } = useI18n();
  const preview = useCallback(async () => <p className="text-ink-2">{t('invite.householdBody')}</p>, [t]);
  return <InviteAccept kind="household" title={t('invite.householdTitle')} preview={preview} accept={(token) => api.post('/v1/households/invitations/accept', { token })} successHref="/households" />;
}
