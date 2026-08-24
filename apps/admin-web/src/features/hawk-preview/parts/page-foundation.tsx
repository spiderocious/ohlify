import {
  HawkCaption,
  HawkFigure,
  HawkHeading,
  HawkIcon,
  HawkOverline,
  HawkPerforation,
  HawkRegister,
  HawkRegisterScope,
  HawkSkeleton,
  HawkSkeletonLine,
  HawkSkeletonParagraph,
  HawkText,
  HAWK_HAZARD,
  HAWK_QUARTET,
  HAWK_SEMANTICS,
  HawkButton,
  HawkTextInput,
  HawkDuration,
  formatKobo,
} from '@ohlify/hawk-ui';
import * as HawkIcons from '@ohlify/hawk-ui';

import {
  PreviewGrid,
  PreviewPage,
  PreviewRow,
  PreviewSection,
  PreviewStage,
  PreviewState,
  PreviewStates,
} from './preview-shell.js';

/**
 * @HawkPage slug=01-palette name=Palette group=Foundation
 *
 * The primitive ramps and the semantic quartet.
 */
export function PagePalette() {
  const RAMPS = [
    {
      name: 'Violet — brand',
      steps: ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'],
      prefix: 'v',
    },
    {
      name: 'Ink — cool neutral',
      steps: ['0', '25', '50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'],
      prefix: 'n',
    },
  ];

  return (
    <PreviewPage
      title="Palette"
      kicker="Foundation · 01"
      intro="Primitive ramps, then the semantic layer components actually read. A component never reaches for a ramp step directly — that is the hand-mixing the quartet exists to stop."
    >
      {RAMPS.map((ramp) => (
        <PreviewSection key={ramp.name} title={ramp.name}>
          <div className="flex flex-wrap gap-hawk-2">
            {ramp.steps.map((step) => (
              <div key={step} className="flex w-16 flex-col gap-hawk-2">
                <div
                  className="h-12 rounded-hawk-xs border border-hawk-line"
                  style={{ background: `var(--hawk-${ramp.prefix}-${step})` }}
                />
                <HawkText variant="tiny" ink="disabled" record>
                  {step}
                </HawkText>
              </div>
            ))}
          </div>
        </PreviewSection>
      ))}

      <PreviewSection
        title="The semantic quartet"
        rule="Five semantics × base / soft / onSoft / border. A component picks a semantic, never a colour. The absence of this quartet is why the pre-Hawk audit found 26 files hand-mixing 13 tints — three different greens doing one job."
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[36rem] border-collapse text-hawk-label">
            <thead>
              <tr className="border-b border-hawk-line-strong">
                {['semantic', 'base', 'soft', 'onSoft', 'border'].map((head) => (
                  <th
                    key={head}
                    className="px-hawk-4 py-hawk-3 text-left text-hawk-overline font-bold uppercase tracking-hawk-overline text-hawk-ink-muted"
                  >
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {HAWK_SEMANTICS.map((semantic) => {
                const tone = HAWK_QUARTET[semantic];
                return (
                  <tr key={semantic} className="border-b border-hawk-line">
                    <td className="px-hawk-4 py-hawk-4 font-semibold">{semantic}</td>
                    {[tone.cssBase, tone.cssSoft, tone.cssOnSoft, tone.cssBorder].map(
                      (value, index) => (
                        <td key={index} className="px-hawk-4 py-hawk-4">
                          <span
                            className="inline-block h-7 w-16 rounded-hawk-xs border border-hawk-line"
                            style={{ background: value }}
                          />
                        </td>
                      ),
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </PreviewSection>

      <PreviewSection
        title="Hazard — outside the enum"
        rule="Hazard is a system alarm-state, deliberately unreachable from the semantic enum. It escalates within the warm family beyond caution. A user cannot press a hazard; a hazard is something the system reports. Critical red stays reserved for irreversible operator actions."
      >
        <div className="flex flex-wrap gap-hawk-4">
          {[HAWK_HAZARD.cssBase, HAWK_HAZARD.cssSoft, HAWK_HAZARD.cssOnSoft, HAWK_HAZARD.cssBorder].map(
            (value, index) => (
              <div key={index} className="flex w-24 flex-col gap-hawk-2">
                <div
                  className="h-12 rounded-hawk-xs border border-hawk-line"
                  style={{ background: value }}
                />
                <HawkText variant="tiny" ink="disabled">
                  {['base', 'soft', 'onSoft', 'border'][index]}
                </HawkText>
              </div>
            ),
          )}
        </div>
      </PreviewSection>

      <PreviewSection
        title="Money direction"
        rule="Strictly by sign, banker's-ledger discipline. Debits are ink, not red — red means failed, and a successful debit is not a failure."
      >
        <div className="flex flex-wrap gap-hawk-7">
          {[
            ['credit', 'var(--hawk-credit)'],
            ['debit', 'var(--hawk-debit)'],
            ['reversal', 'var(--hawk-reversal)'],
          ].map(([name, value]) => (
            <div key={name} className="flex items-center gap-hawk-3">
              <span
                className="h-6 w-6 rounded-full border border-hawk-line"
                style={{ background: value }}
              />
              <HawkText variant="caption">{name}</HawkText>
            </div>
          ))}
        </div>
      </PreviewSection>
    </PreviewPage>
  );
}

/**
 * @HawkPage slug=02-type name=Type group=Foundation
 *
 * The scale, the weights, and the record face.
 */
export function PageType() {
  const SCALE = [
    ['display-xl', 'Wallet balance'],
    ['display-lg', 'Section hero'],
    ['display', 'Page heading'],
    ['title', 'Screen title'],
    ['header', 'Card header'],
    ['body-title', 'Emphasised body'],
    ['medium', 'Section title'],
    ['subheader', 'Sub-heading'],
    ['body', 'Body copy'],
    ['label', 'Field label'],
    ['caption', 'Helper text'],
    ['overline', 'Group label'],
    ['tiny', 'Timestamp'],
  ] as const;

  return (
    <PreviewPage
      title="Type"
      kicker="Foundation · 02"
      intro="Mona Sans throughout — chrome and display. It ships sixteen weights including Black and ExtraBold, so the display tier needs no second family."
    >
      <PreviewSection
        title="The scale"
        note="The display tier is new: the pre-Hawk app topped out at 24px, so a wallet balance — the most important figure on its screen — had no slot."
      >
        <div className="flex flex-col gap-hawk-5">
          {SCALE.map(([variant, sample]) => (
            <div key={variant} className="flex flex-wrap items-baseline gap-hawk-6">
              <span className="w-28 shrink-0 text-hawk-tiny uppercase tracking-hawk-overline text-hawk-ink-disabled">
                {variant}
              </span>
              <HawkText variant={variant}>{sample}</HawkText>
            </div>
          ))}
        </div>
      </PreviewSection>

      <PreviewSection
        title="The record face"
        rule="The spec names IBM Plex Mono for figures, reasoning that a proportional face makes a live meter jitter. That reasoning is right; the remedy was not needed. Mona Sans carries tabular figures, so the obligation is met with no second family and no extra webfont to load."
      >
        <PreviewStage label="tabular — every digit the same width">
          <div className="flex flex-col gap-hawk-2">
            {['₦8,420', '₦1,111', '₦9,999', '₦0'].map((value) => (
              <span key={value} className="hawk-record text-hawk-body-title font-bold tabular-nums">
                {value}
              </span>
            ))}
          </div>
        </PreviewStage>
      </PreviewSection>

      <PreviewSection title="The primitives">
        <div className="flex flex-col gap-hawk-4">
          <HawkHeading level={2}>A heading</HawkHeading>
          <HawkText>Body text, the default register for anything the user reads.</HawkText>
          <HawkCaption>A caption — timestamps, helper text, row subtitles.</HawkCaption>
          <HawkOverline>An overline</HawkOverline>
        </div>
      </PreviewSection>
    </PreviewPage>
  );
}

/**
 * @HawkPage slug=03-geometry name=Spacing & geometry group=Foundation
 *
 * The step scale and the radii.
 */
export function PageGeometry() {
  const STEPS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
  const RADII = ['xs', 'sm', 'md', 'lg', 'xl', 'pill'];

  return (
    <PreviewPage
      title="Spacing & geometry"
      kicker="Foundation · 03"
      intro="One step scale, one radius scale. Register-aware radii resolve from whichever zone an element sits in."
    >
      <PreviewSection title="Spacing steps">
        <div className="flex flex-col gap-hawk-3">
          {STEPS.map((step) => (
            <div key={step} className="flex items-center gap-hawk-5">
              <span className="w-16 shrink-0 text-hawk-tiny uppercase tracking-hawk-overline text-hawk-ink-disabled">
                s-{step}
              </span>
              <span
                className="h-4 rounded-hawk-xs bg-hawk-acc-soft"
                style={{ width: `var(--hawk-s-${step})` }}
              />
              <span className="hawk-record text-hawk-tiny text-hawk-ink-disabled">
                var(--hawk-s-{step})
              </span>
            </div>
          ))}
        </div>
      </PreviewSection>

      <PreviewSection title="Radii">
        <div className="flex flex-wrap gap-hawk-5">
          {RADII.map((radius) => (
            <div key={radius} className="flex flex-col items-center gap-hawk-2">
              <div
                className="h-16 w-16 border border-hawk-line bg-hawk-acc-soft"
                style={{ borderRadius: `var(--hawk-r-${radius})` }}
              />
              <HawkText variant="tiny" ink="disabled">
                {radius}
              </HawkText>
            </div>
          ))}
        </div>
      </PreviewSection>
    </PreviewPage>
  );
}

/**
 * @HawkPage slug=04-motion name=Motion group=Foundation
 *
 * The four durations and the flip rule.
 */
export function PageMotion() {
  return (
    <PreviewPage
      title="Motion"
      kicker="Foundation · 04"
      intro="Tokens retained verbatim from the app's own motion scale. Everything respects prefers-reduced-motion, and the gallery's own toggle demonstrates it without changing your system settings."
    >
      <PreviewSection title="Durations">
        <div className="flex flex-col gap-hawk-4">
          {[
            ['instant', HawkDuration.instant, 'press'],
            ['fast', HawkDuration.fast, 'toggle, chip'],
            ['base', HawkDuration.base, 'entrance, modal, tab'],
            ['slow', HawkDuration.slow, 'full-screen, celebration'],
          ].map(([name, ms, use]) => (
            <div key={String(name)} className="flex flex-wrap items-baseline gap-hawk-5">
              <span className="w-20 shrink-0 text-hawk-label font-semibold">{name}</span>
              <span className="hawk-record w-16 text-hawk-label tabular-nums text-hawk-ink-muted">
                {ms}ms
              </span>
              <HawkCaption>{use}</HawkCaption>
            </div>
          ))}
        </div>
      </PreviewSection>

      <PreviewSection
        title="A figure flips; it never tweens"
        rule="Ohlify bills per second against a double-entry ledger. A balance tweening from ₦0 to ₦8,420 displays about thirty values the user does not hold. In a billing product that is not a flourish, it is a lie. The motion audit asked for a count-up on the wallet balance; this system overrides that and flips instead."
      >
        <FlipDemo />
      </PreviewSection>
    </PreviewPage>
  );
}

function FlipDemo() {
  const VALUES = [842_000, 856_500, 856_700, 1_200_000];
  return (
    <PreviewStage label="each value swaps in place — no intermediate values">
      <div className="flex flex-col gap-hawk-4">
        {VALUES.map((value) => (
          <HawkFigure key={value} value={value} size="lg" />
        ))}
        <HawkCaption>
          Only the digits that actually changed re-animate. Re-animating an unchanged
          digit would suggest a value moved when it did not.
        </HawkCaption>
      </div>
    </PreviewStage>
  );
}

/**
 * @HawkPage slug=05-perforation name=The perforation group=Foundation
 *
 * The one decorative device the system allows.
 */
export function PagePerforation() {
  return (
    <PreviewPage
      title="The perforation"
      kicker="Foundation · 05"
      intro="Everything else in Hawk earns its place functionally. This one is permitted because it is the metaphor the whole system is named for."
    >
      <PreviewSection
        title="Against the ground"
        note="The end-notches are painted in the ground colour, so the device only reads correctly against the ground — which is the only place a pass ever sits."
      >
        <PreviewStage ground>
          <div className="overflow-hidden rounded-hawk-fixed-lg border border-hawk-line bg-hawk-paper">
            <div className="p-hawk-6">
              <HawkText variant="body-title" ink="strong">
                The held part
              </HawkText>
            </div>
            <HawkPerforation className="my-0" />
            <div className="bg-hawk-stock p-hawk-6">
              <HawkCaption>The stub</HawkCaption>
            </div>
          </div>
        </PreviewStage>
      </PreviewSection>
    </PreviewPage>
  );
}

/**
 * @HawkPage slug=06-density name=Register — PASS & BOARD group=Foundation
 * @HawkStates pass board nested
 *
 * The law, made mechanical.
 */
export function PageRegister() {
  const sample = (
    <div className="flex flex-col gap-hawk-4">
      <HawkTextInput label="Account name" placeholder="Adaeze Okonkwo" />
      <div className="flex gap-hawk-4">
        <HawkButton label="Approve" size="md" />
        <HawkButton label="Cancel" variant="ghost" size="md" />
      </div>
      <div className="rounded-hawk border border-hawk-line bg-hawk-stock p-hawk-pad">
        <HawkCaption>A card, resolving its radius from the zone.</HawkCaption>
      </div>
    </div>
  );

  return (
    <PreviewPage
      title="Register — PASS & BOARD"
      kicker="Foundation · 06"
      intro="Two zones. Every surface is a PASS (what one person holds) or a BOARD (what an operator scans). A screen may hold both; a single block belongs to exactly one."
    >
      <PreviewSection
        title="The same components, two densities"
        rule="Nothing below is a new component. Every control is the same component rendered inside a different register zone — radius, height and rhythm resolve automatically from CSS variables. This is the Flutter port's InheritedWidget translated to the mechanism the web already has."
      >
        <PreviewGrid columns={2}>
          <div className="flex flex-col gap-hawk-3">
            <HawkOverline>PASS — 48px controls, 16px radius</HawkOverline>
            <HawkRegisterScope
              value={HawkRegister.PASS}
              className="rounded-hawk-fixed-md border border-hawk-line bg-hawk-paper p-hawk-6"
            >
              {sample}
            </HawkRegisterScope>
          </div>
          <div className="flex flex-col gap-hawk-3">
            <HawkOverline>BOARD — 34px controls, 8px radius</HawkOverline>
            <HawkRegisterScope
              value={HawkRegister.BOARD}
              className="rounded-hawk-fixed-md border border-hawk-line bg-hawk-paper p-hawk-6"
            >
              {sample}
            </HawkRegisterScope>
          </div>
        </PreviewGrid>
      </PreviewSection>

      <PreviewStates columns={3}>
        <PreviewState name="pass" note="Surfaces carry structure.">
          <HawkRegisterScope value={HawkRegister.PASS}>
            <HawkButton label="Continue" size="md" />
          </HawkRegisterScope>
        </PreviewState>
        <PreviewState name="board" note="Rules carry structure.">
          <HawkRegisterScope value={HawkRegister.BOARD}>
            <HawkButton label="Continue" size="md" />
          </HawkRegisterScope>
        </PreviewState>
        <PreviewState name="nested" note="A BOARD inside a PASS resolves to BOARD.">
          <HawkRegisterScope value={HawkRegister.PASS}>
            <HawkRegisterScope value={HawkRegister.BOARD}>
              <HawkButton label="Continue" size="md" />
            </HawkRegisterScope>
          </HawkRegisterScope>
        </PreviewState>
      </PreviewStates>
    </PreviewPage>
  );
}

/**
 * @HawkPage slug=07-elevation name=Elevation group=Foundation
 *
 * Hairline-first; shadow only for overlays.
 */
export function PageElevation() {
  const LEVELS = [
    ['popover', 'shadow-hawk-popover', 'menus, dropdowns, tooltips'],
    ['modal', 'shadow-hawk-modal', 'modals, sheets, takeovers'],
    ['toast', 'shadow-hawk-toast', 'toasts'],
    ['press', 'shadow-hawk-press', 'the inset press state'],
  ] as const;

  return (
    <PreviewPage
      title="Elevation"
      kicker="Foundation · 07"
      intro="Shadow is reserved for things that genuinely float above the page. A page of shadowed cards makes nothing look raised, because everything is."
    >
      <PreviewSection title="The four levels">
        <PreviewGrid columns={2}>
          {LEVELS.map(([name, cls, use]) => (
            <div key={name} className="flex flex-col gap-hawk-3">
              <div className={`rounded-hawk-fixed-md bg-hawk-paper p-hawk-6 ${cls}`}>
                <HawkText variant="label" ink="strong">
                  {name}
                </HawkText>
              </div>
              <HawkCaption>{use}</HawkCaption>
            </div>
          ))}
        </PreviewGrid>
      </PreviewSection>
    </PreviewPage>
  );
}

/**
 * @HawkPage slug=08-icons-ui name=Icons group=Foundation
 *
 * The glyph set, proxied in one file.
 */
export function PageIcons() {
  const names = Object.keys(HawkIcons)
    .filter((key) => key.startsWith('Icon'))
    .sort();

  return (
    <PreviewPage
      title="Icons"
      kicker="Foundation · 08–10"
      intro="Every Hawk component imports glyphs from one proxy file, never from the icon library directly — swapping the source later is a one-file change. Names mirror the Flutter port's glyph set one-for-one."
    >
      <PreviewSection title={`${names.length} glyphs`}>
        <div className="grid grid-cols-3 gap-hawk-4 sm:grid-cols-4 lg:grid-cols-6">
          {names.map((name) => {
            const Glyph = (HawkIcons as unknown as Record<string, unknown>)[name];
            if (typeof Glyph !== 'function' && typeof Glyph !== 'object') return null;
            return (
              <div
                key={name}
                className="flex flex-col items-center gap-hawk-3 rounded-hawk-sm border border-hawk-line bg-hawk-paper p-hawk-4"
              >
                <HawkIcon icon={Glyph as never} size={20} />
                <span className="w-full truncate text-center text-hawk-tiny text-hawk-ink-disabled">
                  {name.replace('Icon', '')}
                </span>
              </div>
            );
          })}
        </div>
      </PreviewSection>
    </PreviewPage>
  );
}

/**
 * @HawkPage slug=14-figure name=Figure group=Foundation
 * @HawkStates default masked stale
 *
 * The flip primitive and the masking contract.
 */
export function PageFigure() {
  return (
    <PreviewPage
      title="Figure"
      kicker="Foundation · 14"
      intro="The system's signature primitive. It carries the flip rule and the masking contract at once — both the kind that fail silently if anyone reimplements them locally."
    >
      <PreviewSection title="Sizes">
        <div className="flex flex-col gap-hawk-5">
          {(['sm', 'md', 'lg', 'display'] as const).map((size) => (
            <PreviewRow key={size} label={size}>
              <HawkFigure value={842_000} size={size} />
            </PreviewRow>
          ))}
        </div>
      </PreviewSection>

      <PreviewSection
        title="Money direction"
        note="Strictly by sign. Debits render as ink rather than red — red means failed, and a successful debit is not a failure."
      >
        <div className="flex flex-wrap gap-hawk-7">
          <HawkFigure value={250_000} direction="credit" signed />
          <HawkFigure value={250_000} direction="debit" />
          <HawkFigure value={250_000} direction="reversal" />
        </div>
      </PreviewSection>

      <PreviewSection
        title="Masking"
        rule="A masked figure renders at the unmasked width, so toggling the preference cannot reflow the page around it. This is measured, not guessed — the real string stays in the DOM, invisible and aria-hidden, to pin the box. Flip the mask toggle in the header to see it."
      >
        <PreviewStage>
          <div className="flex flex-col gap-hawk-4">
            <HawkFigure value={842_000} size="lg" />
            <HawkCaption>
              A public rate opts out: masking hides <em>your</em> balance from a
              shoulder-surfer, not a price list. → <HawkFigure value={250_000} size="sm" neverMasked />
            </HawkCaption>
          </div>
        </PreviewStage>
      </PreviewSection>

      <PreviewStates columns={3}>
        <PreviewState name="default">
          <HawkFigure value={842_000} />
        </PreviewState>
        <PreviewState name="masked" note="Rendered at the unmasked width.">
          <HawkText variant="caption" ink="muted">
            {formatKobo(842_000)} → ₦••••••
          </HawkText>
        </PreviewState>
        <PreviewState name="stale" note="The freshness contract.">
          <HawkFigure value={842_000} stale />
        </PreviewState>
      </PreviewStates>
    </PreviewPage>
  );
}

/**
 * @HawkPage slug=13-skeleton name=Skeleton group=Foundation
 * @HawkStates line paragraph circle
 *
 * The per-component skeleton primitive.
 */
export function PageSkeleton() {
  return (
    <PreviewPage
      title="Skeleton"
      kicker="Foundation"
      intro="Every data-bearing component owns a skeleton mirroring its own layout — not one shimmer box standing in for everything. The pre-Hawk audit found no skeleton primitive on either platform at all."
    >
      <PreviewSection
        title="The parts"
        rule="A skeleton designed later will not match the shape it stands in for, which is why each component ships its own built from these parts. Shimmer is a 1.4s sweep; prefers-reduced-motion and the header toggle both collapse it to a static tint — a tint, not nothing, since the placeholder still has to read as one."
      >
        <PreviewGrid columns={3}>
          <PreviewState name="line">
            <HawkSkeletonLine widthFactor={0.8} />
          </PreviewState>
          <PreviewState name="paragraph">
            <HawkSkeletonParagraph lines={3} />
          </PreviewState>
          <PreviewState name="circle">
            <HawkSkeleton circle width={48} height={48} />
          </PreviewState>
        </PreviewGrid>
      </PreviewSection>
    </PreviewPage>
  );
}
