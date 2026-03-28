import type { Metadata } from 'next';
import './globals.css';

const BASE_URL = 'https://expense-splitter-kishanj1093-1933s-projects.vercel.app';

export const metadata: Metadata = {
  title: 'SplitEase by Kishan — Smart Expense Splitting',
  description: 'Split expenses with friends using a debt simplification algorithm. Real-time sync, Web Push Notifications, PWA. Built with Next.js 14 + PostgreSQL.',
  manifest: '/manifest.json',
  verification: { google: 'R4KoHYqevfVR0bVuWc2AGTtUMwhF-iCkMcSY1-rITDI' },
  metadataBase: new URL(BASE_URL),
  openGraph: {
    title: 'SplitEase by Kishan — Smart Expense Splitting',
    description: 'Debt simplification algorithm reduces group settlements to the mathematical minimum. Next.js 14 + PostgreSQL + Web Push + PWA.',
    url: BASE_URL,
    siteName: 'SplitEase by Kishan',
    images: [{
      url: `${BASE_URL}/api/og`,
      width: 1200,
      height: 630,
      alt: 'SplitEase by Kishan',
    }],
    locale: 'en_IN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SplitEase by Kishan — Smart Expense Splitting',
    description: 'Split expenses with friends. Debt simplification algorithm. Next.js 14 + PostgreSQL + PWA.',
    images: [`${BASE_URL}/api/og`],
  },
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'SplitEase' },
};

export const viewport = { width: 'device-width', initialScale: 1, maximumScale: 1, themeColor: '#22c55e' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icon-192.svg" />
        <meta property="og:image" content={`${BASE_URL}/api/og`} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta name="twitter:image" content={`${BASE_URL}/api/og`} />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#22c55e" />
      </head>
      <body>
        {children}
        <script dangerouslySetInnerHTML={{ __html: `if('serviceWorker' in navigator){window.addEventListener('load',()=>{navigator.serviceWorker.register('/sw.js');})}` }} />
      </body>
    </html>
  );
}
