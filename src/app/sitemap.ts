import type { MetadataRoute } from 'next';
import { POLICIES, policyHref } from '@/lib/legal';
import { GUIDE_TOPICS, guideHref } from '@/lib/guide';
import { siteUrl } from '@/lib/site-url';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = await siteUrl();
  const updated = new Date('2026-11-14');
  return [
    { url: `${base}/`, lastModified: updated, changeFrequency: 'monthly', priority: 1 },
    { url: `${base}/legal`, lastModified: updated, changeFrequency: 'monthly', priority: 0.8 },
    ...POLICIES.map((p) => ({ url: `${base}${policyHref(p.slug)}`, lastModified: updated, changeFrequency: 'monthly' as const, priority: 0.7 })),
    { url: `${base}/guide`, lastModified: updated, changeFrequency: 'monthly', priority: 0.8 },
    ...GUIDE_TOPICS.map((p) => ({ url: `${base}${guideHref(p.slug)}`, lastModified: updated, changeFrequency: 'monthly' as const, priority: 0.7 })),
    { url: `${base}/privacy-notice`, lastModified: updated, changeFrequency: 'monthly', priority: 0.5 },
  ];
}
