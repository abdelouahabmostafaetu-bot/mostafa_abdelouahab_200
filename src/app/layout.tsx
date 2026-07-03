import type { Metadata, Viewport } from 'next';
import { Fraunces, Source_Sans_3, Source_Serif_4 } from 'next/font/google';
import { ClerkProvider } from '@clerk/nextjs';
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
          href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='20' fill='%231f1913'/><text x='50' y='68' font-family='Georgia,serif' font-size='50' font-weight='bold' fill='%23d9a24a' text-anchor='middle'>AM</text></svg>"
          type="image/svg+xml"
        />
      </head>
      <body className="min-h-svh overflow-x-hidden flex flex-col">
        <ClerkProvider>
          <NavigationFeedback />
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
          <BirthdayCelebration />
          <SpeedInsights />
          <Analytics />
        </ClerkProvider>
      </body>
    </html>
  );
}
