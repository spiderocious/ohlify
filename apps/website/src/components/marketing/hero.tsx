import { CtaButton } from './cta-button';
import { HeroPhonePreview } from './hero-phone-preview';
import { HeroWaves } from './hero-waves';
import { siteConfig } from '@/lib/site-config';

/**
 * LCP-owning section. The headline is the LCP element — a real text
 * node, no JS dependency for first paint.
 *
 * Asymmetric layout: text column gets ~60% width, the phone tucks into
 * the right margin with a slight negative top-margin so its top edge
 * meets the headline's right edge. Behind everything, a slow-drifting
 * SVG layer of violet blobs gives the section visible character
 * without competing with the type.
 *
 * The noun ticker uses a nested `.noun-ticker__track` so the spans
 * actually stack in a column — see `.noun-ticker` rules in globals.css.
 * The previous "stack-of-words-on-one-line" bug was a flex-direction
 * default snafu.
 */
export function Hero() {
  return (
    <section className="relative overflow-hidden pb-24 pt-16 sm:pt-20 lg:pb-32 lg:pt-24">
      <HeroWaves />
      <div className="relative z-10 mx-auto grid w-full max-w-[1240px] grid-cols-1 gap-12 px-6 lg:grid-cols-[1.4fr_1fr] lg:items-end lg:gap-16">
        <div>
          <p className="eyebrow">Available wherever you call from</p>
          <h1 className="mt-6 font-display text-[clamp(2.6rem,7vw,5.6rem)] font-medium leading-[0.95] text-ink">
            Talk to{' '}
            <span
              className="noun-ticker text-accent"
              aria-label="verified experts"
            >
              <span className="noun-ticker__track" aria-hidden="true">
                <span>doctors</span>
                <span>lawyers</span>
                <span>coaches</span>
                <span>designers</span>
                <span>experts</span>
              </span>
            </span>
            <br />
            <span className="font-display italic text-ink-soft">
              who&apos;ve done it before.
            </span>
          </h1>
          <p className="lede mt-8 max-w-xl text-ink-soft">
            Ohlify is a marketplace for paid 1:1 audio + video consultations with
            verified professionals. You pay once. We hold the money. They get paid
            when the call is delivered — or you do, automatically, if it isn&apos;t.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-3">
            <CtaButton href={siteConfig.ctaFindProfessional.href} size="lg">
              {siteConfig.ctaFindProfessional.label} →
            </CtaButton>
            <CtaButton
              href={siteConfig.ctaBecomeProfessional.href}
              variant="ghost"
              size="lg"
            >
              {siteConfig.ctaBecomeProfessional.label}
            </CtaButton>
          </div>
        </div>

        <div className="flex justify-center lg:justify-end lg:-mt-8">
          <div className="relative">
            <HeroPhonePreview />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -left-6 -top-6 hidden text-[10px] font-semibold uppercase tracking-[0.18em] text-muted lg:block"
            >
              Live screen
            </span>
          </div>
        </div>
      </div>

      <div className="relative z-10 mx-auto mt-24 w-full max-w-[1240px] px-6">
        <div className="divider-rule" />
        <dl className="grid grid-cols-2 gap-y-6 py-8 sm:grid-cols-4">
          <Stat label="Calls completed" value="3,200+" />
          <Stat label="Average rating" value="4.9 ★" />
          <Stat label="Minutes to first call" value="< 5" />
          <Stat label="Refund automation" value="100%" />
        </dl>
        <div className="divider-rule" />
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
        {label}
      </dt>
      <dd className="font-display text-[28px] font-medium leading-none text-ink sm:text-[32px]">
        {value}
      </dd>
    </div>
  );
}
