import type { Metadata } from 'next';

// Public and indexable, like the policies under /legal.
export const metadata: Metadata = { title: 'Privacy notice and data inventory', robots: { index: true, follow: true } };

export default function PrivacyNoticeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
