import type { ReactNode } from 'react';

import { HawkButton } from '../actions/button.js';
import { HawkDataState, canActOnBalance, formatAge } from '../contracts/data-state.js';
import { HawkFigure } from '../foundation/figure.js';
import { HawkIcon } from '../foundation/icon.js';
import { formatKobo, type HawkKobo } from '../foundation/money.js';
import { HawkSkeletonLine } from '../foundation/skeleton.js';
import { HawkText } from '../foundation/text.js';
import {
  IconAlertTriangle,
  IconEye,
  IconEyeOff,
  IconEscrow,
} from '../icons/index.js';
import { HawkMoneyDirection, HawkSemantic, quartet } from '../theme/semantic.js';
import { useHawkMasked } from '../theme/register.js';
import { cn } from '../utils/cn.js';

import { HawkKeyValue } from '../display/stat.js';

export interface HawkBalanceCardProps {
  /** Spendable balance, in kobo. */
  balanceKobo: HawkKobo;
  label?: string;
  /** Funds held in escrow — not yet spendable. */
  heldKobo?: HawkKobo;
  dataState?: HawkDataState;
  ageMs?: number;
  /** Toggles global masking. */
  onToggleMask?: () => void;
  actions?: ReactNode;
  className?: string;
}

/**
 * The balance card — the wallet's hero.
 *
 * Three things it does that a plain figure would not:
 *
 * 1. **Held funds are shown separately and never added in.** Escrowed money is
 *    not spendable, and a single total that includes it promises a balance the
 *    user cannot use.
 * 2. **Stale balances say so.** CONTRACTS §10 — you may browse a balance
 *    offline; you may not act on one. The card surfaces the age rather than
 *    quietly showing a number that may have moved.
 * 3. **The mask toggle lives here**, because this is the figure the preference
 *    exists for. It flips the *global* setting, not a local one.
 */
export function HawkBalanceCard({
  balanceKobo,
  label = 'Available balance',
  heldKobo,
  dataState = HawkDataState.FRESH,
  ageMs,
  onToggleMask,
  actions,
  className,
}: HawkBalanceCardProps) {
  const masked = useHawkMasked();
  const stale = dataState === HawkDataState.STALE;

  if (dataState === HawkDataState.LOADING) {
    return (
      <div
        role="status"
        aria-busy="true"
        aria-label="Loading balance"
        className={cn('flex flex-col gap-hawk-5 rounded-hawk-fixed-xl bg-hawk-hero p-hawk-7', className)}
      >
        <HawkSkeletonLine widthFactor={0.35} height={11} className="opacity-30" />
        <HawkSkeletonLine widthFactor={0.6} height={38} className="opacity-30" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative flex flex-col gap-hawk-5 overflow-hidden rounded-hawk-fixed-xl',
        'bg-hawk-hero p-hawk-7 text-hawk-hero-on',
        className,
      )}
    >
      {/* The decorative grid — the one ornament the hero card carries. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-30">
        <div className="grid h-full w-full grid-cols-6 grid-rows-3">
          {Array.from({ length: 18 }, (_, i) => (
            <span
              key={i}
              className={cn('border-r border-t', i % 3 === 0 ? 'bg-hawk-hero-grid' : undefined)}
              style={{ borderColor: 'rgb(255 255 255 / 0.08)' }}
            />
          ))}
        </div>
      </div>

      <div className="relative flex items-center justify-between gap-hawk-4">
        <HawkText variant="caption" ink="inverse-muted">
          {label}
        </HawkText>
        {onToggleMask && (
          <button
            type="button"
            onClick={onToggleMask}
            aria-label={masked ? 'Show amounts' : 'Hide amounts'}
            className="hawk-focusable rounded-hawk-xs p-1 text-hawk-ink-inverse-muted hover:text-hawk-ink-inverse"
          >
            <HawkIcon icon={masked ? IconEyeOff : IconEye} size={16} />
          </button>
        )}
      </div>

      <div className="relative">
        <HawkFigure value={balanceKobo} size="display" ink="inverse" stale={stale} />
      </div>

      {heldKobo !== undefined && (
        <div className="relative flex items-center gap-hawk-3">
          <HawkIcon icon={IconEscrow} size={13} className="text-hawk-ink-inverse-muted" />
          <HawkText variant="caption" ink="inverse-muted">
            <HawkFigure value={heldKobo} size="sm" ink="inverse-muted" /> held in escrow
          </HawkText>
        </div>
      )}

      {stale && (
        <div className="relative flex items-center gap-hawk-3 rounded-hawk-sm bg-white/12 px-hawk-4 py-hawk-3">
          <HawkIcon icon={IconAlertTriangle} size={13} className="text-hawk-ink-inverse-muted" />
          <HawkText variant="tiny" ink="inverse-muted">
            Saved balance{ageMs !== undefined ? ` · ${formatAge(ageMs)}` : ''} · not live
          </HawkText>
        </div>
      )}

      {actions && <div className="relative flex gap-hawk-4">{actions}</div>}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

export interface HawkMoneyLineProps {
  label: ReactNode;
  amountKobo: HawkKobo;
  direction?: HawkMoneyDirection;
  /** The bold total line at the bottom of a breakdown. */
  total?: boolean;
  /** A deduction — rendered with a leading minus and muted. */
  deduction?: boolean;
  neverMasked?: boolean;
  className?: string;
}

/** One line in a money breakdown — a fee, a subtotal, a total. */
export function HawkMoneyLine({
  label,
  amountKobo,
  direction,
  total = false,
  deduction = false,
  neverMasked = false,
  className,
}: HawkMoneyLineProps) {
  return (
    <div
      className={cn(
        'flex items-baseline justify-between gap-hawk-5 py-hawk-3',
        total && 'border-t border-hawk-line pt-hawk-4',
        className,
      )}
    >
      <HawkText
        variant={total ? 'body' : 'caption'}
        ink={total ? 'strong' : 'muted'}
        className={cn(total && 'font-semibold')}
      >
        {label}
      </HawkText>
      <span className={cn(deduction && 'text-hawk-ink-muted')}>
        {deduction && <span className="hawk-record mr-0.5">−</span>}
        <HawkFigure
          value={amountKobo}
          size={total ? 'md' : 'sm'}
          {...(direction ? { direction } : {})}
          ink={total ? 'strong' : 'default'}
          neverMasked={neverMasked}
          decimals
        />
      </span>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

export interface HawkPurchaseIntentProps {
  /** What is being bought — "30 minutes with Adaeze". */
  description: ReactNode;
  /** Line items, before the total. */
  lines: ReadonlyArray<{ label: string; amountKobo: HawkKobo; deduction?: boolean }>;
  totalKobo: HawkKobo;
  /** The balance the total is charged against. */
  balanceKobo?: HawkKobo;
  onConfirm?: () => void;
  onCancel?: () => void;
  confirmLabel?: string;
  loading?: boolean;
  /** Blocks confirmation — insufficient funds, a stale balance. */
  blockedReason?: string;
  className?: string;
}

/**
 * The purchase intent — the itemised bill before money moves.
 *
 * Every line is shown, including fees. A total with no breakdown is what makes
 * users distrust a wallet, and in a product that debits a real ledger the
 * breakdown is not a courtesy — it is the record the user is agreeing to.
 */
export function HawkPurchaseIntent({
  description,
  lines,
  totalKobo,
  balanceKobo,
  onConfirm,
  onCancel,
  confirmLabel = 'Confirm',
  loading = false,
  blockedReason,
  className,
}: HawkPurchaseIntentProps) {
  return (
    <div className={cn('flex flex-col gap-hawk-6', className)}>
      <HawkText variant="body" ink="strong">
        {description}
      </HawkText>

      <div className="flex flex-col rounded-hawk-sm bg-hawk-stock px-hawk-5 py-hawk-3">
        {lines.map((line) => (
          <HawkMoneyLine
            key={line.label}
            label={line.label}
            amountKobo={line.amountKobo}
            deduction={line.deduction ?? false}
          />
        ))}
        <HawkMoneyLine label="Total" amountKobo={totalKobo} total />
      </div>

      {balanceKobo !== undefined && (
        <HawkKeyValue
          label="Charged to your balance"
          value={<HawkFigure value={balanceKobo} size="sm" ink="muted" />}
        />
      )}

      {blockedReason && (
        <div className="flex items-center gap-hawk-3 rounded-hawk-sm bg-hawk-hazard-soft px-hawk-5 py-hawk-4">
          <HawkIcon icon={IconAlertTriangle} size={14} className="text-hawk-hazard" />
          <HawkText variant="caption" className="text-hawk-hazard-on-soft">
            {blockedReason}
          </HawkText>
        </div>
      )}

      <div className="flex flex-col gap-hawk-4">
        <HawkButton
          label={confirmLabel}
          size="lg"
          block
          loading={loading}
          disabled={Boolean(blockedReason)}
          onClick={onConfirm}
        />
        {onCancel && <HawkButton label="Cancel" variant="ghost" size="lg" block onClick={onCancel} />}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

export interface HawkAmountMaskingToggleProps {
  masked: boolean;
  onChange: (masked: boolean) => void;
  className?: string;
}

/**
 * The masking preference control.
 *
 * One switch, app-wide (CONTRACTS §9). The copy says "every amount" on purpose:
 * a user who thinks this hides only their wallet balance will be surprised when
 * the in-call earnings counter is masked too, and surprise about what is hidden
 * is the one thing a privacy control cannot afford.
 */
export function HawkAmountMaskingToggle({
  masked,
  onChange,
  className,
}: HawkAmountMaskingToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={masked}
      onClick={() => onChange(!masked)}
      className={cn(
        'hawk-focusable flex w-full items-center gap-hawk-5 rounded-hawk-sm px-hawk-pad py-hawk-row-y text-left',
        'transition-colors duration-hawk-fast hover:bg-hawk-hovered',
        className,
      )}
    >
      <HawkIcon
        icon={masked ? IconEyeOff : IconEye}
        size={17}
        className="text-hawk-ink-muted"
      />
      <span className="flex min-w-0 flex-1 flex-col">
        <HawkText variant="body" ink="strong">
          Hide amounts
        </HawkText>
        <HawkText variant="caption" ink="muted">
          Masks every amount across the app, including during a call.
        </HawkText>
      </span>
      <span
        className={cn(
          'hawk-motion relative inline-flex h-6 w-11 shrink-0 items-center rounded-full',
          'transition-colors duration-hawk-fast',
          masked ? 'bg-hawk-acc' : 'bg-hawk-line-strong',
        )}
      >
        <span
          className={cn(
            'hawk-motion inline-block h-5 w-5 rounded-full bg-hawk-paper shadow-sm transition-transform duration-hawk-fast',
            masked ? 'translate-x-[22px]' : 'translate-x-0.5',
          )}
        />
      </span>
    </button>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

export interface HawkWithdrawSummaryProps {
  amountKobo: HawkKobo;
  feeKobo?: HawkKobo;
  /** Destination — "GTBank ••••4821". */
  destination: string;
  /** Expected arrival — "within 24 hours". */
  eta?: string;
  className?: string;
}

/** The withdrawal summary — what leaves, what arrives, and where. */
export function HawkWithdrawSummary({
  amountKobo,
  feeKobo,
  destination,
  eta,
  className,
}: HawkWithdrawSummaryProps) {
  const fee = feeKobo === undefined ? 0 : Number(feeKobo);
  const net = Number(amountKobo) - fee;

  return (
    <div className={cn('flex flex-col rounded-hawk-sm bg-hawk-stock px-hawk-5 py-hawk-3', className)}>
      <HawkMoneyLine label="Amount" amountKobo={amountKobo} />
      {feeKobo !== undefined && Number(feeKobo) > 0 && (
        <HawkMoneyLine label="Transfer fee" amountKobo={feeKobo} deduction />
      )}
      <HawkMoneyLine label="You receive" amountKobo={net} total direction={HawkMoneyDirection.CREDIT} />
      <div className="mt-hawk-3 border-t border-hawk-line pt-hawk-4">
        <HawkKeyValue label="To" value={destination} record />
        {eta && <HawkKeyValue label="Arrives" value={eta} />}
      </div>
    </div>
  );
}

/** Re-exported so money surfaces can format without a second import. */
export { formatKobo, canActOnBalance, quartet, HawkSemantic };
