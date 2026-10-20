'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Download, Share, Smartphone, X } from 'lucide-react';
import { useI18n } from '@/i18n';
import { isPhone, useInstall } from '@/lib/install';
import { Button, Card, CardHeader, IconButton } from './ui';

function Steps({ state }: { state: 'ios' | 'browser_menu' }) {
  const { t } = useI18n();
  return (
    <ol className="space-y-1.5 text-sm">
      {(state === 'ios' ? ['ios1', 'ios2', 'ios3'] : ['menu1', 'menu2']).map((k, i) => (
        <li key={k} className="flex gap-2">
          <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand">{i + 1}</span>
          <span>
            {t(`install.${k}`)}
            {k === 'ios1' && <Share className="ms-1 inline size-4 align-text-bottom" aria-hidden />}
          </span>
        </li>
      ))}
    </ol>
  );
}

/** Settings: install LifeSphere as an app on this device. */
export function InstallAppCard() {
  const { t } = useI18n();
  const { state, install } = useInstall();
  return (
    <Card className="p-5">
      <CardHeader icon={<Smartphone className="size-5" />} title={t('install.title')} description={t('install.body')} />
      <div className="mt-4">
        {state === 'installed' ? (
          <p className="flex items-center gap-2 font-medium text-ok">
            <CheckCircle2 className="size-5" aria-hidden /> {t('install.installed')}
          </p>
        ) : state === 'can_prompt' ? (
          <Button icon={<Download className="size-4" />} onClick={() => void install()}>
            {t('install.button')}
          </Button>
        ) : (
          <Steps state={state} />
        )}
      </div>
    </Card>
  );
}

const DISMISS_KEY = 'ls_install_dismissed';

/** Home screen on phones: a one-time, dismissible suggestion to install. */
export function InstallBanner() {
  const { t } = useI18n();
  const { state, install } = useInstall();
  const [show, setShow] = useState(false);
  useEffect(() => {
    let dismissed = false;
    try {
      dismissed = !!localStorage.getItem(DISMISS_KEY);
    } catch {}
    setShow(!dismissed && isPhone());
  }, []);
  if (!show || state === 'installed' || state === 'browser_menu') return null;
  const close = () => {
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {}
    setShow(false);
  };
  return (
    <Card className="relative mb-4 p-4">
      <IconButton label={t('install.later')} className="absolute end-2 top-2" onClick={close}>
        <X className="size-4" />
      </IconButton>
      <div className="flex items-start gap-3 pe-8">
        <Smartphone className="mt-0.5 size-5 shrink-0 text-brand" aria-hidden />
        <div className="min-w-0 space-y-2">
          <div className="font-semibold">{t('install.bannerTitle')}</div>
          <p className="text-sm text-muted">{t('install.bannerBody')}</p>
          {state === 'can_prompt' ? (
            <Button size="sm" icon={<Download className="size-4" />} onClick={() => void install().then((ok) => ok && close())}>
              {t('install.button')}
            </Button>
          ) : (
            <Steps state="ios" />
          )}
        </div>
      </div>
    </Card>
  );
}
