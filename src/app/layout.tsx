import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import { ServiceWorkerRegister } from '@/components/service-worker-register';

const fontSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
});

export const metadata: Metadata = {
  title: {
    default: 'Chemical Auction — B2B reverse auctions for chemical procurement',
    template: '%s · Chemical Auction',
  },
  description:
    'A verified, GST-anchored B2B reverse-auction marketplace for chemical procurement in India. Post a precise requirement; qualified sellers bid blindly; every action is audit-logged.',
  manifest: '/manifest.webmanifest',
  applicationName: 'Chemical Auction',
  appleWebApp: { capable: true, title: 'Chemical Auction', statusBarStyle: 'default' },
};

export const viewport: Viewport = {
  themeColor: '#fafaf9',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={fontSans.variable} suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
