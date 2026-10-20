'use client';

import { useEffect, useState } from 'react';

/** Chrome/Edge/Samsung Internet hand us this event when the app can be installed. */
interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferred: InstallPromptEvent | null = null;
const listeners = new Set<() => void>();
let started = false;

/** Call once at start-up: registers the service worker and listens for the install offer. */
export function startAppInstall() {
  if (started || typeof window === 'undefined') return;
  started = true;
  if ('serviceWorker' in navigator) void navigator.serviceWorker.register('/sw.js').catch(() => undefined);
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as InstallPromptEvent;
    listeners.forEach((l) => l());
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    listeners.forEach((l) => l());
  });
}

export const isStandalone = () =>
  typeof window !== 'undefined' && (window.matchMedia?.('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true);

/** iPhone/iPad Safari: no install offer; people use Share → Add to Home Screen. */
export const isIos = () =>
  typeof navigator !== 'undefined' && (/iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

export const isPhone = () => typeof window !== 'undefined' && window.matchMedia?.('(max-width: 900px) and (pointer: coarse)').matches;

export type InstallState = 'installed' | 'can_prompt' | 'ios' | 'browser_menu';

export function useInstall() {
  const [state, setState] = useState<InstallState>('browser_menu');
  useEffect(() => {
    const update = () => setState(isStandalone() ? 'installed' : deferred ? 'can_prompt' : isIos() ? 'ios' : 'browser_menu');
    update();
    listeners.add(update);
    return () => void listeners.delete(update);
  }, []);
  const install = async () => {
    if (!deferred) return false;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    deferred = null;
    listeners.forEach((l) => l());
    return outcome === 'accepted';
  };
  return { state, install };
}
