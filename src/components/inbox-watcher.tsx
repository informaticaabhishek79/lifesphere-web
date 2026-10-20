'use client';

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { folderSyncSupported, syncOnce, syncState } from '@/lib/inbox-sync';
import type { InboxStatus } from '@/lib/types';

const EVERY_MS = 20_000;

/** Folder id per subfolder name, plus where loose files go. */
export function inboxTargets(s: InboxStatus) {
  const map: Record<string, string> = {};
  for (const f of s.folders) if (f.folderId) map[f.name.toLowerCase()] = f.folderId;
  const fallback = s.folders.find((f) => f.hint === 'mixed')?.folderId ?? s.rootFolderId!;
  return { map, fallback };
}

/**
 * Mounted once in the app shell: while LifeSphere is open and a computer folder is connected, checks it every
 * 20 seconds and uploads new files into the smart inbox. Does nothing on browsers without folder access.
 */
export function InboxWatcher({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const status = useRef<InboxStatus | null>(null);

  useEffect(() => {
    if (!folderSyncSupported()) return;
    let stopped = false;
    const tick = async () => {
      if (stopped || document.visibilityState === 'hidden') return;
      const st = await syncState(userId);
      if (!st.connected || st.permission !== 'granted') return;
      if (!status.current) status.current = await api.get<InboxStatus>('/v1/inbox').catch(() => null);
      const s = status.current;
      if (!s?.enabled || !s.rootFolderId) return;
      const { map, fallback } = inboxTargets(s);
      const r = await syncOnce(userId, map, fallback).catch(() => ({ uploaded: 0 }));
      if (r.uploaded) {
        qc.invalidateQueries({ queryKey: ['inbox'] });
        qc.invalidateQueries({ queryKey: ['documents'] });
      }
      window.dispatchEvent(new CustomEvent('lifesphere:inbox-synced', { detail: r }));
    };
    const first = setTimeout(tick, 3_000);
    const id = setInterval(tick, EVERY_MS);
    const onFocus = () => void tick();
    const onChange = () => {
      status.current = null;
    };
    window.addEventListener('focus', onFocus);
    window.addEventListener('lifesphere:inbox-changed', onChange);
    return () => {
      stopped = true;
      clearTimeout(first);
      clearInterval(id);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('lifesphere:inbox-changed', onChange);
    };
  }, [userId, qc]);

  return null;
}
