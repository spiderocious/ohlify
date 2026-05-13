/**
 * Single source of truth for cross-page marketing copy. Section-specific
 * content lives next to the section. Anything edited here changes the
 * nav, hero, footer, OG meta, and CTAs in one go.
 */
export const siteConfig = {
  brand: 'Ohlify',
  url: 'https://ohlify.com',
  appUrl: 'https://app.ohlify.com',
  /** <title> on the landing page. */
  title: 'Ohlify — Paid 1:1 calls with verified professionals',
  /** Meta description. Keep under ~160 chars. */
  description:
    'Book paid audio or video consultations with verified professionals. Money held in escrow, refunded automatically if the call falls through.',
  /**
   * Nouns the hero ticker cycles through. Order matters — the cycle
   * pauses on each. Five entries are tuned to fit the 15s loop in
   * globals.css; if you change the count, update the @keyframes.
   */
  rotatingNouns: ['doctors', 'lawyers', 'coaches', 'designers', 'experts'] as const,
  /** Primary CTA in nav + hero. */
  ctaFindProfessional: {
    label: 'Find a professional',
    href: 'https://app.ohlify.com/professionals',
  },
  /** Secondary CTA — professional acquisition. */
  ctaBecomeProfessional: {
    label: 'Earn on Ohlify',
    href: 'https://app.ohlify.com/register',
  },
  /** Footer socials. Drop empty strings to hide. */
  socials: [
    { label: 'Twitter', href: 'https://x.com/ohlify' },
    { label: 'Instagram', href: 'https://instagram.com/ohlify' },
    { label: 'LinkedIn', href: 'https://linkedin.com/company/ohlify' },
  ],
} as const;
