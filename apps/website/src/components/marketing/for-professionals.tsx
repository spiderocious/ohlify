import { CtaButton } from './cta-button';
import { siteConfig } from '@/lib/site-config';

const POINTS = [
  {
    h: 'Price your own time.',
    b: 'Set rates per call type and duration. Adjust whenever you want — no approval needed.',
  },
  {
    h: 'Get paid when the call ends.',
    b: 'Escrow releases to your wallet automatically. Withdraw to your bank in minutes, not days.',
  },
  {
    h: 'No-show protection.',
    b: 'If a caller doesn’t show, you keep a meaningful slice of the booking. Your time matters.',
  },
  {
    h: 'A profile that does the marketing.',
    b: 'Verified badge, real ratings, a shareable handle. Pass the link to your network and let the calls come in.',
  },
];

/**
 * The signature inverted section. Deep violet background (a darker
 * shade of the brand) with amber accents — a deliberate visual break
 * from the cream sections so this block reads as "now we're talking
 * to a different audience" without jumping to jet black (which would
 * fight the violet palette running through the rest of the page).
 */
export function ForProfessionals() {
  return (
    <section
      id="for-professionals"
      className="relative overflow-hidden text-white"
      style={{
        // 22% lightness of brand violet — deep enough to feel like a
        // surface invert, light enough to keep palette coherence.
        background: 'linear-gradient(180deg, #2a249d 0%, #1a155f 100%)',
      }}
    >
      <div className="mx-auto w-full max-w-[1240px] px-6 py-24 lg:py-32">
        <div className="grid gap-16 lg:grid-cols-[1fr_1.1fr] lg:items-start lg:gap-24">
          <div className="reveal-on-scroll">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-highlight">
              For professionals
            </p>
            <h2 className="mt-5 font-display text-[clamp(2.4rem,5.5vw,4.6rem)] font-medium leading-[0.98]">
              Your expertise,
              <br />
              <span className="italic text-highlight">on its own terms.</span>
            </h2>
            <p className="lede mt-7 max-w-md text-white/70">
              Bookings, payments, identity checks, even the ringing phone —
              all handled. You spend your hour doing what you&apos;re actually
              good at.
            </p>
            <div className="mt-9">
              <CtaButton
                href={siteConfig.ctaBecomeProfessional.href}
                variant="light"
                size="lg"
              >
                {siteConfig.ctaBecomeProfessional.label} →
              </CtaButton>
            </div>
          </div>

          <ul className="reveal-on-scroll grid gap-px overflow-hidden rounded-3xl bg-white/10">
            {POINTS.map((p) => (
              <li
                key={p.h}
                className="bg-[#1f1979] p-7 transition-colors hover:bg-[#241d8c]"
              >
                <h3 className="font-display text-[20px] font-medium leading-tight text-white">
                  {p.h}
                </h3>
                <p className="mt-2 text-[14px] leading-relaxed text-white/65">
                  {p.b}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Soft blobs to keep the surface alive — corner glow + side wash. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-20 -right-20 hidden h-[520px] w-[520px] rounded-full bg-highlight/[0.10] blur-[140px] lg:block"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -left-32 top-1/3 h-[420px] w-[420px] rounded-full bg-white/[0.04] blur-[100px]"
      />
    </section>
  );
}
