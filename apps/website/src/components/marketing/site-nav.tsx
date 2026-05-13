import Link from 'next/link';

import { CtaButton } from './cta-button';
import { siteConfig } from '@/lib/site-config';

const NAV_LINKS = [
  { label: 'How it works', href: '#how' },
  { label: 'Why Ohlify', href: '#why' },
  { label: 'Try it', href: '#demo' },
  { label: 'For professionals', href: '#for-professionals' },
] as const;

/**
 * Editorial header. The wordmark uses Fraunces italic so it reads as a
 * masthead rather than a SaaS logo. Backdrop blur on the bar keeps
 * editorial calm even when long-form copy scrolls behind it.
 */
export function SiteNav() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-transparent bg-paper/80 backdrop-blur supports-[backdrop-filter]:bg-paper/65">
      <div className="mx-auto flex h-16 w-full max-w-[1240px] items-center justify-between px-6">
        <Link href="/" className="flex items-baseline gap-1.5" aria-label="Ohlify home">
          <span className="font-display text-[26px] font-medium italic leading-none tracking-tight text-ink">
            Ohlify
          </span>
          <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
        </Link>
        <nav className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-[13px] font-medium text-ink-soft transition-colors hover:text-ink"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link
            href={siteConfig.appUrl}
            className="hidden text-[13px] font-medium text-ink-soft transition-colors hover:text-ink sm:inline-flex"
          >
            Open app
          </Link>
          <CtaButton href={siteConfig.ctaFindProfessional.href}>
            {siteConfig.ctaFindProfessional.label}
          </CtaButton>
        </div>
      </div>
    </header>
  );
}
