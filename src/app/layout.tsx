import type { Metadata, Viewport } from 'next';
import { DM_Serif_Display, Inter, Source_Serif_4 } from 'next/font/google';
import { ClerkProvider } from '@clerk/nextjs';
import 'katex/dist/katex.min.css';
import '@/styles/globals.css';
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
  themeColor: '#f7f5ef',
};

export const metadata: Metadata = {
  metadataBase: new URL('https://www.mostafaabdelouahab.me'),
  title: {
    default: 'Abdelouahab Mostafa — Mathematics Student',
    template: '%s | Abdelouahab Mostafa',
  },
  description:
    'Personal academic website of Abdelouahab Mostafa, Master student in Fundamental Mathematics at the University of Mila, Algeria.',
  keywords: [
    'mathematics',
    'analysis',
    'topology',
    'dynamical systems',
    'University of Mila',
    'Algeria',
    'academic website',
  ],
  authors: [{ name: 'Abdelouahab Mostafa' }],
  openGraph: {
    title: 'Abdelouahab Mostafa — Mathematics Student',
    description:
      'Notes, writing, and resources from a mathematics student at the University of Mila.',
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
      className={`${dmSerif.variable} ${inter.variable} ${sourceSerif.variable}`}
      suppressHydrationWarning
    >
      <head>
        <link
          rel="icon"
          href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='18' fill='%23244f8f'/><text x='50' y='64' font-family='Georgia,serif' font-size='42' font-weight='700' fill='%23fffdf8' text-anchor='middle'>AM</text></svg>"
          type="image/svg+xml"
        />
      </head>
      <body className="flex min-h-svh flex-col">
        <ClerkProvider>
          <NavigationFeedback />
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
          <BirthdayCelebration />
          <SpeedInsights />
        </ClerkProvider>
      </body>
    </html>
  );
}
