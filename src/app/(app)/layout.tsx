'use client';

import { SessionProvider } from '@/lib/session';
import { AppShell, ShellFallback } from '@/components/shell';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider fallback={<ShellFallback />}>
      <AppShell>{children}</AppShell>
    </SessionProvider>
  );
}
