import type { MetadataRoute } from 'next';
import { POLICIES, policyHref } from '@/lib/legal';
import { siteUrl } from '@/lib/site-url';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = await siteUrl();
  const updated = new Date('2026-10-24');
  return [
    { url: `${base}/legal`, lastModified: updated, changeFrequency: 'monthly', priority: 0.8 },
    ...POLICIES.map((p) => ({ url: `${base}${policyHref(p.slug)}`, lastModified: updated, changeFrequency: 'monthly' as const, priority: 0.7 })),
    { url: `${base}/privacy-notice`, lastModified: updated, changeFrequency: 'monthly', priority: 0.5 },
  ];
}
