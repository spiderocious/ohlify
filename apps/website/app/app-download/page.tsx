import type { Metadata } from 'next';

import { siteConfig } from '@/lib/site-config';

/**
 * Unlisted utility page for the app owner to grab the latest Android build.
 * Intentionally NOT linked from the nav, footer, or sitemap — reach it by
 * typing /app-download directly. `noindex` keeps it out of search results.
 *
 * Drop the build at `public/ohlify.apk` and it serves from `/ohlify.apk`.
 */
const APK_PATH = 'https://drive.google.com/file/d/181Y3eZwW_uynSbyvehqF9wset-A2g8th/view?usp=sharing';

export const metadata: Metadata = {
  title: 'Download the app',
  robots: { index: false, follow: false },
};

export default function AppDownloadPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[520px] flex-col items-center justify-center px-6 py-20 text-center">
      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">
        {siteConfig.brand} for Android
      </span>

      <h1 className="mt-5 font-display text-[clamp(2rem,6vw,3rem)] font-medium leading-[1.04] text-ink">
        Download the app
      </h1>

      <p className="mt-4 text-[15px] leading-relaxed text-ink-soft">
        Get the latest Android build directly as an APK. You may need to allow
        installs from unknown sources on your device.
      </p>

      <a
        href={APK_PATH}
        download
        className="mt-10 inline-flex h-14 items-center justify-center gap-2 rounded-full bg-accent px-9 text-[15px] font-semibold tracking-tight text-white transition-colors hover:opacity-90"
      >
        Download APK
      </a>

      <p className="mt-6 text-[12px] text-muted">
        Android only · installs the {siteConfig.brand} mobile app
      </p>
    </main>
  );
}
