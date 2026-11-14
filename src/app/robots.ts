import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/site-url';

/** Search engines may read the public landing page and policies; the signed-in app itself holds personal data and stays out of search. */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const base = await siteUrl();
  return {
    rules: [{ userAgent: '*', allow: ['/$', '/legal', '/legal/', '/guide', '/guide/', '/privacy-notice'], disallow: ['/'] }],
    sitemap: `${base}/sitemap.xml`,
  };
}
