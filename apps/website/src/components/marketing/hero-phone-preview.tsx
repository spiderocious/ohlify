import professionals from '@/data/professionals.json';

import { PhoneFrame } from './phone-frame';
import { ProfessionalTile } from './professional-tile';

/**
 * Hero phone preview. Shows two professional tiles + a status row at
 * the bottom — three is too crowded at 272px wide.
 *
 * Layout details:
 *   - Screen bg is the warm `paper` tint (NOT pure white) so the
 *     white cards inside have visible separation.
 *   - "Discover" title is display-serif, sits beside a small soft
 *     online-count pill — not a competing eyebrow row.
 *   - Cards use the `'price'` variant (no fake button — the hero's
 *     preview isn't tappable, so a button would mislead about
 *     affordance).
 *   - Generous gap between cards (`gap-3` not `gap-2`) so the eye
 *     can rest between them at this small scale.
 */
export function HeroPhonePreview() {
  return (
    <PhoneFrame>
      <div className="flex h-full flex-col bg-paper">
        <header className="flex items-baseline justify-between px-5 pb-4 pt-7">
          <p className="font-display text-[22px] font-semibold leading-none tracking-tight text-ink">
            Discover
          </p>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-paper-elev px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            247 online
          </span>
        </header>
        <div className="flex flex-1 flex-col gap-3 overflow-hidden px-3 pb-3">
          {professionals.slice(0, 2).map((p) => {
            const cheapest = Math.min(...p.rates.map((r) => r.naira));
            return (
              <ProfessionalTile
                key={p.id}
                name={p.name}
                role={p.role}
                tagline={p.tagline}
                rating={p.rating}
                reviewCount={p.reviewCount}
                avatarTone={p.avatarTone}
                priceFromNaira={cheapest}
                variant="price"
              />
            );
          })}
          <div className="mt-auto rounded-xl border border-dashed border-paper-line bg-transparent px-4 py-2.5 text-center">
            <p className="text-[11px] font-medium text-muted">
              + 200 more professionals
            </p>
          </div>
        </div>
      </div>
    </PhoneFrame>
  );
}
