import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ServiceWorkerRegister } from '@/components/service-worker-register';
import { Analytics } from '@/components/analytics';

export const metadata: Metadata = {
  title: {
    default: 'ChemiBid — B2B reverse auctions for chemical procurement',
    template: '%s · ChemiBid',
  },
  description:
    'A verified, GST-anchored B2B reverse-auction marketplace for chemical procurement in India. Post a precise requirement; qualified sellers bid blindly; every action is audit-logged.',
  manifest: '/manifest.webmanifest',
  applicationName: 'ChemiBid',
  appleWebApp: { capable: true, title: 'ChemiBid', statusBarStyle: 'default' },
};

export const viewport: Viewport = {
  themeColor: '#fafaf9',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Design-language typefaces: Cabinet Grotesk (display) + General Sans (text). */}
        <link rel="preconnect" href="https://api.fontshare.com" crossOrigin="anonymous" />
        <link
          href="https://api.fontshare.com/v2/css?f[]=cabinet-grotesk@500,700,800&f[]=general-sans@400,500,600,700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased">
        {children}
        <ServiceWorkerRegister />
        <Analytics />
      </body>
    </html>
  );
}
