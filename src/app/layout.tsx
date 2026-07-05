import type { Metadata, Viewport } from 'next';
import { Fraunces, Source_Sans_3, Source_Serif_4 } from 'next/font/google';
import 'katex/dist/katex.min.css';
import '@/styles/globals.css';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import NavigationFeedback from '@/components/layout/NavigationFeedback';
import BirthdayCelebration from '@/components/BirthdayCelebration';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Analytics } from '@vercel/analytics/react';

const fraunces = Fraunces({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  display: 'swap',
  variable: '--font-fraunces',
});

const sourceSans = Source_Sans_3({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-source-sans',
});

const sourceSerif = Source_Serif_4({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-source-serif',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#161311',
};

export const metadata: Metadata = {
  metadataBase: new URL('https://www.mostafaabdelouahab.me'),
  title: {
    default: 'Abdelouahab Mostafa — Mathematics Researcher',
    template: '%s | Abdelouahab Mostafa',
  },
  description:
    'Personal academic website of Abdelouahab Mostafa, Master student in Fundamental Mathematics at the University of Mila, Algeria. Research in dynamical systems, analysis, and topology.',
  keywords: [
    'mathematics',
    'dynamical systems',
    'topology',
    'analysis',
    'University of Mila',
    'Algeria',
    'research',
  ],
  authors: [{ name: 'Abdelouahab Mostafa' }],
  openGraph: {
    title: 'Abdelouahab Mostafa — Mathematics Researcher',
    description:
      'Personal academic website of Abdelouahab Mostafa, Master student in Fundamental Mathematics.',
    url: 'https://www.mostafaabdelouahab.me',
    siteName: 'Abdelouahab Mostafa',
    locale: 'en_US',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${sourceSans.variable} ${sourceSerif.variable} bg-[var(--color-bg)]`}
      suppressHydrationWarning
    >
      <head>
        {/* Favicon */}
        <link
          rel="icon"
          href="data:image/jpeg;base64,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"
          type="image/jpeg"
        />
      </head>
      <body className="min-h-svh overflow-x-hidden flex flex-col">
        <NavigationFeedback />
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
        <BirthdayCelebration />
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
