import Link from 'next/link';

import { siteConfig } from '@/lib/site-config';

const PRODUCT_LINKS = [
  { label: 'How it works', href: '#how' },
  { label: 'Why Ohlify', href: '#why' },
  { label: 'Try the demo', href: '#demo' },
  { label: 'For professionals', href: '#for-professionals' },
] as const;

const LEGAL_LINKS = [
  { label: 'Privacy policy', href: '/privacy' },
  { label: 'Terms of service', href: '/terms' },
  { label: 'EULA', href: '/eula' },
] as const;

/**
 * Editorial footer. Oversized wordmark anchors the bottom of the page;
 * link columns sit on the right at restrained type sizes. A horizontal
 * rule separates the legal microcopy from the substance.
 */
export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-paper-line bg-paper">
      <div className="mx-auto w-full max-w-[1240px] px-6 py-20">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr_1fr_1fr] lg:gap-16">
          <div>
            <Link href="/" className="block">
              <span className="font-display text-[44px] font-medium italic leading-none tracking-tight text-ink">
                Ohlify
              </span>
            </Link>
            <p className="mt-5 max-w-sm text-[14px] leading-relaxed text-ink-soft">
              A marketplace for paid 1:1 calls with verified professionals.
              Built mobile-first. Made in Lagos.
            </p>
            <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-[13px]">
              {siteConfig.socials.map((s) => (
                <Link
                  key={s.href}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-ink-soft underline decoration-paper-line decoration-1 underline-offset-4 transition-colors hover:text-ink hover:decoration-ink/40"
                >
                  {s.label}
                </Link>
              ))}
            </div>
          </div>
          <FooterColumn title="Product" links={PRODUCT_LINKS} />
          <FooterColumn title="Legal" links={LEGAL_LINKS} />
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
              Contact
            </p>
            <ul className="mt-4 space-y-3 text-[13px]">
              <li>
                <a
                  href="mailto:hello@ohlify.com"
                  className="text-ink-soft transition-colors hover:text-ink"
                >
                  hello@ohlify.com
                </a>
              </li>
              <li>
                <a
                  href="mailto:support@ohlify.com"
                  className="text-ink-soft transition-colors hover:text-ink"
                >
                  support@ohlify.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-16 flex flex-col items-start justify-between gap-3 border-t border-paper-line pt-6 text-[12px] text-muted sm:flex-row sm:items-center">
          <span>© {year} Ohlify. All rights reserved.</span>
          <span>Made in Lagos.</span>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: ReadonlyArray<{ label: string; href: string }>;
}) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
        {title}
      </p>
      <ul className="mt-4 space-y-3 text-[13px]">
        {links.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              className="text-ink-soft transition-colors hover:text-ink"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
