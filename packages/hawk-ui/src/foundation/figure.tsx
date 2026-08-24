import { useEffect, useRef, useState } from 'react';

import type { HawkFigureSize } from '../contracts/size.js';
import { useHawkMasked } from '../theme/register.js';
import { HAWK_MONEY_INK } from '../theme/semantic.js';
import type { HawkMoneyDirection } from '../theme/semantic.js';
import { cn } from '../utils/cn.js';

import { HAWK_MASK, formatKobo, type HawkKobo } from './money.js';
import { HawkInk, HAWK_INK_CLASS } from './text.js';

/**
 * The figure — the system's signature primitive.
 *
 * It carries two contracts at once, and both are the kind that fail silently if
 * anyone reimplements them locally.
 *
 * **§0.1 — a live figure flips; it never tweens.** Money and durations update
 * digit-in-place, gate-board style. They never animate *through* intermediate
 * values. Ohlify bills per second against a double-entry ledger: a balance
 * tweening from ₦0 to ₦8,420 displays ~30 values the user does not hold. In a
 * billing product that is not a flourish, it is a lie. Only the digits that
 * actually changed re-animate, over one `instant` beat.
 *
 * **§9 — masking must not shift the layout.** A masked figure renders `₦••••••`
 * *at the unmasked width*, so toggling the preference cannot reflow the page
 * around it. This is measured, not guessed: the component renders the real
 * string invisibly to pin the box.
 */
const SIZE_CLASS: Record<HawkFigureSize, string> = {
  sm: 'text-hawk-body font-semibold',
  md: 'text-hawk-body-title font-bold tracking-hawk-tight',
  lg: 'text-hawk-display font-extrabold tracking-hawk-display',
  display: 'text-hawk-display-xl font-black tracking-hawk-display',
};

export interface HawkFigureProps {
  /** The amount, in kobo. */
  value: HawkKobo;
  size?: HawkFigureSize;
  /** Money direction tints the ink strictly by sign. */
  direction?: HawkMoneyDirection;
  ink?: HawkInk;
  /** Show the ₦ sign. */
  symbol?: boolean;
  /** Show kobo. Ledger surfaces set this. */
  decimals?: boolean;
  /** Prefix `+` on positives — used by transaction rows. */
  signed?: boolean;
  /**
   * Opt out of masking.
   *
   * Reserved for figures that are not the user's money: a professional's
   * public rate, a platform fee shown on a pricing page. Masking exists to hide
   * *your* balance from a shoulder-surfer, not to hide a price list.
   */
  neverMasked?: boolean;
  className?: string;
  /** Marks the value as stale — the freshness contract. CONTRACTS §10. */
  stale?: boolean;
}

export function HawkFigure({
  value,
  size = 'md',
  direction,
  ink = HawkInk.STRONG,
  symbol = true,
  decimals = false,
  signed = false,
  neverMasked = false,
  className,
  stale = false,
}: HawkFigureProps) {
  const ambientMasked = useHawkMasked();
  const masked = ambientMasked && !neverMasked;
  const text = formatKobo(value, { symbol, decimals, signed });

  return (
    <span
      className={cn(
        'hawk-record inline-flex items-baseline tabular-nums',
        SIZE_CLASS[size],
        direction ? HAWK_MONEY_INK[direction] : HAWK_INK_CLASS[ink],
        stale && 'opacity-70',
        className,
      )}
      // The accessible value is the real one when unmasked; when masked, the
      // screen reader must not read out what the screen deliberately hides.
      aria-label={masked ? 'Amount hidden' : text}
      title={masked ? undefined : text}
    >
      {masked ? <MaskedFigure real={text} /> : <FlippingText text={text} />}
    </span>
  );
}

/**
 * Renders the mask at the real string's width.
 *
 * The real text is still in the DOM — `invisible` and `aria-hidden`, so it
 * paints nothing and is never announced — purely to hold the box open. The
 * alternative (a fixed `ch` width) drifts as soon as the amount changes
 * magnitude, which is exactly when a reflow would be most visible.
 */
function MaskedFigure({ real }: { real: string }) {
  return (
    <span className="relative inline-block">
      <span aria-hidden="true" className="invisible">
        {real}
      </span>
      <span className="absolute inset-0 flex items-center justify-start">{HAWK_MASK}</span>
    </span>
  );
}

/**
 * The flip.
 *
 * Each character is its own cell. On change, only the cells whose character
 * actually differs get the flip animation — re-animating an unchanged digit
 * would read as noise and, worse, would suggest a value moved when it did not.
 */
function FlippingText({ text }: { text: string }) {
  const previous = useRef(text);
  const [changed, setChanged] = useState<readonly boolean[]>(() => text.split('').map(() => false));

  useEffect(() => {
    const before = previous.current;
    if (before === text) return;

    const next = text.split('').map((char, i) => {
      // Compare from the right: digits enter on the left as a number grows, so
      // right-alignment is what keeps the ones column comparable to the ones
      // column rather than flipping every digit whenever the width changes.
      const j = before.length - (text.length - i);
      return before[j] !== char;
    });
    setChanged(next);
    previous.current = text;

    // Clear the flags so a later identical value can flip again.
    const timer = setTimeout(() => setChanged(text.split('').map(() => false)), 120);
    return () => clearTimeout(timer);
  }, [text]);

  return (
    <>
      {text.split('').map((char, i) => (
        <span
          // Index-keyed on purpose: the cell is a *position* in the figure, not
          // an identity. Keying by character would make React move nodes around
          // as digits repeat, and the flip would land on the wrong column.
          key={`${i}-${char}`}
          className={cn('inline-block', changed[i] && 'hawk-motion animate-hawk-flip')}
        >
          {char === ' ' ? ' ' : char}
        </span>
      ))}
    </>
  );
}

/**
 * A duration figure — the live meter's face.
 *
 * Same flip rule, no masking: a call's elapsed time is not money, and hiding it
 * would leave the user unable to tell whether they are still being billed.
 */
export interface HawkDurationFigureProps {
  text: string;
  size?: HawkFigureSize;
  ink?: HawkInk;
  className?: string;
}

export function HawkDurationFigure({
  text,
  size = 'md',
  ink = HawkInk.STRONG,
  className,
}: HawkDurationFigureProps) {
  return (
    <span
      className={cn(
        'hawk-record inline-flex items-baseline tabular-nums',
        SIZE_CLASS[size],
        HAWK_INK_CLASS[ink],
        className,
      )}
    >
      <FlippingText text={text} />
    </span>
  );
}
