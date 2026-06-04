import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ServiceWorkerRegister } from '@/components/service-worker-register';

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
  themeColor: '#0f172a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
