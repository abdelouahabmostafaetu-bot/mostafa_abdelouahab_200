import type { Metadata, Viewport } from 'next';
import { DM_Serif_Display, Inter } from 'next/font/google';
import { ClerkProvider } from '@clerk/nextjs';
import 'katex/dist/katex.min.css';
import '@/styles/globals.css';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { SpeedInsights } from '@vercel/speed-insights/next';

const dmSerif = DM_Serif_Display({
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  display: 'swap',
  variable: '--font-dm-serif',
});

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0f0e0d',
};

export const metadata: Metadata = {
  metadataBase: new URL('https://www.mostafaabdelouahab.me'),
  title: {
    default: 'Abdelouahab Mostafa — Mathematics Researcher',
    template: '%s | Abdelouahab Mostafa',
  },
  description:
    "Personal academic website of Abdelouahab Mostafa, Master student in Fundamental Mathematics at the University of Mila, Algeria. Research in dynamical systems, analysis, and topology.",
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
      "Personal academic website of Abdelouahab Mostafa, Master student in Fundamental Mathematics.",
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
      className={`${dmSerif.variable} ${inter.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Favicon */}
        <link
          rel="icon"
          href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='20' fill='%23194a50'/><text x='50' y='68' font-family='Georgia,serif' font-size='50' font-weight='bold' fill='%234f98a3' text-anchor='middle'>AM</text></svg>"
          type="image/svg+xml"
        />
      </head>
      <body className="min-h-svh overflow-x-hidden flex flex-col">
        <ClerkProvider>
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
          <SpeedInsights />
        </ClerkProvider>
      </body>
    </html>
  );
}
