import { LazyInteractiveDemo } from './lazy-interactive-demo';

/**
 * Section wrapper for the interactive demo. The introduction sits on
 * top, the demo itself below; we don't use the generic `SectionShell`
 * because the demo needs a wider canvas than the rest of the editorial
 * sections.
 */
export function DemoSection() {
  return (
    <section
      id="demo"
      className="section-rule bg-paper-elev px-6 py-24 lg:py-32"
    >
      <div className="mx-auto w-full max-w-[1240px]">
        <div className="reveal-on-scroll max-w-2xl">
          <p className="eyebrow">Try it</p>
          <h2 className="mt-4 font-display text-[clamp(2rem,4vw,3.5rem)] font-medium leading-[1.02] text-ink">
            See the whole flow
            <br />
            <span className="italic text-ink-soft">without signing up.</span>
          </h2>
          <p className="lede mt-6 max-w-xl text-ink-soft">
            Real components from the app, wired to a fake state machine.
            Tap through Browse → Schedule → Pay → Talk → Rate. No network,
            no money, no surprises.
          </p>
        </div>
        <div className="mt-16 lg:mt-20">
          <LazyInteractiveDemo />
        </div>
      </div>
    </section>
  );
}
