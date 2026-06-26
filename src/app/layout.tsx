import type { Metadata, Viewport } from 'next';
import { DM_Serif_Display, Inter, Source_Serif_4 } from 'next/font/google';
import { ClerkProvider } from '@clerk/nextjs';
import 'katex/dist/katex.min.css';
import '@/styles/globals.css';
import '@/styles/university-redesign.css';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import NavigationFeedback from '@/components/layout/NavigationFeedback';
import BirthdayCelebration from '@/components/BirthdayCelebration';
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

const sourceSerif = Source_Serif_4({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-source-serif',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#f7f4ef',
};

export const metadata: Metadata = {
  metadataBase: new URL('https://www.mostafaabdelouahab.me'),
  title: {
    default: 'Abdelouahab Mostafa — Mathematics Researcher',
    template: '%s | Abdelouahab Mostafa',
  },
  description:
    'Personal academic website of Abdelouahab Mostafa, Master student in Fundamental Mathematics at the University of Mila, Algeria. Research interests include analysis, topology, and dynamical systems.',
  keywords: [
    'mathematics',
    'fundamental mathematics',
    'analysis',
    'topology',
    'dynamical systems',
    'University of Mila',
    'Algeria',
    'academic website',
    'research',
  ],
  authors: [{ name: 'Abdelouahab Mostafa' }],
  openGraph: {
    title: 'Abdelouahab Mostafa — Mathematics Researcher',
    description:
      'A clean academic website for mathematics notes, research writing, problems, and teaching-oriented resources.',
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
      className={`${dmSerif.variable} ${inter.variable} ${sourceSerif.variable} bg-[var(--color-bg)]`}
      suppressHydrationWarning
    >
      <head>
        <link
          rel="icon"
          href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='18' fill='%23f7f4ef'/><rect x='10' y='10' width='80' height='80' rx='14' fill='%230f4c5c'/><text x='50' y='64' font-family='Georgia,serif' font-size='34' fill='%23fffdf8' text-anchor='middle'>AM</text></svg>"
          type="image/svg+xml"
        />
      </head>
      <body className="min-h-svh overflow-x-hidden flex flex-col">
        <ClerkProvider>
          <NavigationFeedback />
          <Navbar />
          <main className="flex-1 pt-16">{children}</main>
          <Footer />
          <BirthdayCelebration />
          <SpeedInsights />
        </ClerkProvider>
      </body>
    </html>
  );
}
