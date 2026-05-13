// Fonts: MonaSans Variable handles body, Fraunces Variable handles
// display headlines. We import the variable axes for each so
// font-optical-sizing works on the editorial display type.
import '@fontsource-variable/mona-sans';
import '@fontsource-variable/fraunces';

// Brings the `--ohl-*` CSS variables that the @ohlify/ui Tailwind preset
// references. The interactive demo reuses primitives that depend on
// those tokens (button radii, etc.).
import '@ohlify/ui/styles.css';
import './globals.css';

import type { Metadata, Viewport } from 'next';

import { siteConfig } from '@/lib/site-config';

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: siteConfig.title,
    template: `%s · ${siteConfig.brand}`,
  },
  description: siteConfig.description,
  openGraph: {
    type: 'website',
    locale: 'en',
    url: siteConfig.url,
    siteName: siteConfig.brand,
    title: siteConfig.title,
    description: siteConfig.description,
  },
  twitter: {
    card: 'summary_large_image',
    title: siteConfig.title,
    description: siteConfig.description,
  },
  alternates: { canonical: siteConfig.url },
  robots: { index: true, follow: true },
  icons: { icon: '/favicon.svg' },
};

export const viewport: Viewport = {
  themeColor: '#0d0c0a',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh bg-paper text-ink antialiased">{children}</body>
    </html>
  );
}
