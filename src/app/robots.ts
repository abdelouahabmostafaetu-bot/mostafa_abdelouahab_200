import type { MetadataRoute } from 'next';

const SITE_URL = 'https://www.mostafaabdelouahab.me';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin',
          '/admin-ai',
          '/dashboard',
          '/api',
          '/sign-in',
          '/sign-up',
          '/chat',
        ],
      },
    ],
    sitemap: SITE_URL + '/sitemap.xml',
    host: SITE_URL,
  };
}
