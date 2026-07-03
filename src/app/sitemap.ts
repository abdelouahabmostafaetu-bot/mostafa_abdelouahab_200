import type { MetadataRoute } from 'next';

// Canonical production origin (matches metadataBase in layout.tsx).
const SITE_URL = 'https://www.mostafaabdelouahab.me';

type ChangeFreq = MetadataRoute.Sitemap[number]['changeFrequency'];

// Public, indexable routes only. Private areas (admin, dashboard, auth, api)
// are intentionally excluded and also blocked in robots.ts.
const ROUTES: Array<{ path: string; priority: number; changeFrequency: ChangeFreq }> = [
  { path: '', priority: 1.0, changeFrequency: 'weekly' },
  { path: '/blog', priority: 0.8, changeFrequency: 'weekly' },
  { path: '/cv', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/notes', priority: 0.7, changeFrequency: 'weekly' },
  { path: '/problems', priority: 0.7, changeFrequency: 'weekly' },
  { path: '/library', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/problems-with-coffee', priority: 0.6, changeFrequency: 'weekly' },
  { path: '/contact', priority: 0.5, changeFrequency: 'yearly' },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return ROUTES.map((r) => ({
    url: SITE_URL + r.path,
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));
}
