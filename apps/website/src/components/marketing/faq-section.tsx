import faq from '@/data/faq.json';

/**
 * Numbered, editorial FAQ. Native `<details>` so it works without any
 * client-side JS. Numbering is decorative — the order in the JSON drives
 * the layout, and the index supplies the prefix.
 */
export function FaqSection() {
  return (
    <section id="faq" className="section-rule px-6 py-24 lg:py-32">
      <div className="mx-auto w-full max-w-[920px]">
        <div className="reveal-on-scroll">
          <p className="eyebrow">Questions</p>
          <h2 className="mt-4 font-display text-[clamp(2rem,4vw,3.5rem)] font-medium leading-[1.02] text-ink">
            Things people ask us first.
          </h2>
        </div>

        <ul className="mt-16 border-t border-paper-line">
          {faq.map((item, i) => (
            <li key={item.q} className="border-b border-paper-line">
              <details className="group">
                <summary className="grid cursor-pointer list-none grid-cols-[auto_1fr_auto] items-baseline gap-5 py-6 sm:py-8">
                  <span className="font-display text-[16px] font-medium leading-none text-muted">
                    {(i + 1).toString().padStart(2, '0')}
                  </span>
                  <span className="font-display text-[clamp(1.2rem,2vw,1.6rem)] font-medium leading-snug text-ink">
                    {item.q}
                  </span>
                  <span
                    aria-hidden="true"
                    className="font-display text-[28px] font-medium leading-none text-ink transition-transform group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <div className="grid grid-cols-[auto_1fr_auto] gap-5 pb-8">
                  <span aria-hidden="true" />
                  <p className="max-w-2xl text-[15px] leading-relaxed text-ink-soft">
                    {item.a}
                  </p>
                  <span aria-hidden="true" />
                </div>
              </details>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
