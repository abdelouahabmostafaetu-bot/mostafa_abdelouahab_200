import type { Metadata, Viewport } from 'next';
import '@/styles/globals.css';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { SpeedInsights } from '@vercel/speed-insights/next';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0f0e0d',
};

export const metadata: Metadata = {
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
    url: 'https://your-site.vercel.app',
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
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Newsreader:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        {/* Favicon */}
        <link
          rel="icon"
          href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='20' fill='%23194a50'/><text x='50' y='68' font-family='Georgia,serif' font-size='50' font-weight='bold' fill='%234f98a3' text-anchor='middle'>AM</text></svg>"
          type="image/svg+xml"
        />
      </head>
      <body className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow">{children}</main>
        <Footer />
        <SpeedInsights />
      </body>
    </html>
  );
}
