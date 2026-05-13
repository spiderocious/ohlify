import Link from 'next/link';
import type { ReactNode } from 'react';

import { SiteFooter } from './site-footer';
import { SiteNav } from './site-nav';

interface LegalPageShellProps {
  title: string;
  effectiveDate: string;
  children: ReactNode;
}

/**
 * Long-form text wrapper for /privacy, /terms, /eula. Prose styles are
 * inline-tailored — no `@tailwindcss/typography` dep for three pages.
 */
export function LegalPageShell({ title, effectiveDate, children }: LegalPageShellProps) {
  return (
    <>
      <SiteNav />
      <main className="mx-auto w-full max-w-[760px] px-6 py-20 sm:py-24">
        <Link
          href="/"
          className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent"
        >
          ← Back to home
        </Link>
        <h1 className="mt-6 font-display text-[clamp(2.2rem,5vw,3.4rem)] font-medium leading-[1.02] text-ink">
          {title}
        </h1>
        <p className="mt-3 text-[13px] text-muted">Effective {effectiveDate}</p>
        <div className="mt-12 space-y-6 text-[15px] leading-relaxed text-ink-soft [&_h2]:mt-12 [&_h2]:font-display [&_h2]:text-[24px] [&_h2]:font-medium [&_h2]:leading-tight [&_h2]:text-ink [&_h3]:mt-8 [&_h3]:font-display [&_h3]:text-[18px] [&_h3]:font-medium [&_h3]:text-ink [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-2 [&_a]:text-accent [&_a]:underline [&_a]:underline-offset-2">
          {children}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
