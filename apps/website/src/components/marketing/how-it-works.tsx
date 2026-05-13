import howItWorks from '@/data/how-it-works.json';

/**
 * Three-step explainer. Horizontal on lg+, stacked on mobile. The
 * "00" / "01" / "02" prefixes are oversized display numerals that
 * dominate each card visually — body text is intentionally quiet.
 */
export function HowItWorks() {
  return (
    <section id="how" className="section-rule px-6 py-24 lg:py-32">
      <div className="mx-auto w-full max-w-[1240px]">
        <div className="reveal-on-scroll grid gap-12 lg:grid-cols-[1fr_2fr] lg:items-end lg:gap-16">
          <div>
            <p className="eyebrow">How it works</p>
            <h2 className="mt-4 font-display text-[clamp(2rem,4vw,3.5rem)] font-medium leading-[1.02] text-ink">
              Three steps,
              <br />
              <span className="italic text-ink-soft">none of them tedious.</span>
            </h2>
          </div>
          <p className="lede max-w-xl lg:pb-3">
            We obsessed over the booking flow until it disappeared.
            What&apos;s left is a payment, a calendar, and a real human at
            the other end of the line.
          </p>
        </div>

        <ol className="mt-16 grid gap-12 lg:mt-20 lg:grid-cols-3 lg:gap-10">
          {howItWorks.map((s) => (
            <li
              key={s.step}
              className="reveal-on-scroll relative flex flex-col gap-4 border-t border-paper-line pt-6"
            >
              <span className="font-display text-[68px] font-medium leading-none tracking-tight text-ink">
                {s.step}
              </span>
              <h3 className="font-display text-[22px] font-medium leading-tight text-ink">
                {s.title}
              </h3>
              <p className="text-[15px] leading-relaxed text-ink-soft">{s.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
