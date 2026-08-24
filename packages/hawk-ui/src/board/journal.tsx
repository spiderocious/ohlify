import { useMemo, type ReactNode } from 'react';

import { HawkButton } from '../actions/button.js';
import { HawkIconButton } from '../actions/icon-button.js';
import { HawkFigure } from '../foundation/figure.js';
import { HawkIcon } from '../foundation/icon.js';
import { formatKobo, toKobo, type HawkKobo } from '../foundation/money.js';
import { HawkText } from '../foundation/text.js';
import { IconAlertTriangle, IconCheck, IconPlus, IconTrash } from '../icons/index.js';
import { HawkCurrencyInput, HawkTextInput } from '../inputs/text-input.js';
import { HawkDropdown, type HawkSelectOption } from '../inputs/dropdown.js';
import { HAWK_HAZARD, HawkSemantic, quartet } from '../theme/semantic.js';
import { cn } from '../utils/cn.js';

/**
 * The manual journal composer — the highest-gravity surface in the product.
 *
 * This posts directly to a double-entry ledger. Two rules are enforced in the
 * component rather than left to the operator or the backend:
 *
 * 1. **An unbalanced journal cannot be submitted.** Debits must equal credits,
 *    to the kobo. The submit button is disabled and the imbalance is stated as
 *    a figure, not as "invalid". An operator who knows they are ₦2,500 out can
 *    find the line; one told "invalid" cannot.
 * 2. **Posting requires a typed confirmation** (CONTRACTS §4.1). The caller
 *    wires that up — `HawkDrawer.typedConfirm({ phrase: 'POST' })` — and this
 *    component's `onPost` should never be a bare click handler.
 *
 * Amounts are kobo throughout. A ledger that rounds is not a ledger.
 */
export interface HawkJournalLine {
  id: string;
  /** Account code — `1000`, `2100`. */
  account: string;
  /** Debit amount in kobo. Mutually exclusive with `credit`. */
  debitKobo?: number;
  /** Credit amount in kobo. */
  creditKobo?: number;
  memo?: string;
}

export interface HawkJournalComposerProps {
  lines: ReadonlyArray<HawkJournalLine>;
  onChange: (lines: HawkJournalLine[]) => void;
  /** The chart of accounts. */
  accounts: ReadonlyArray<HawkSelectOption<string>>;
  narration?: string;
  onNarrationChange?: (narration: string) => void;
  onPost?: () => void;
  onCancel?: () => void;
  posting?: boolean;
  /** Extra guard copy — what this journal will affect. */
  guards?: ReactNode;
  className?: string;
}

export function HawkJournalComposer({
  lines,
  onChange,
  accounts,
  narration = '',
  onNarrationChange,
  onPost,
  onCancel,
  posting = false,
  guards,
  className,
}: HawkJournalComposerProps) {
  const { debits, credits, difference, balanced } = useMemo(() => {
    const d = lines.reduce((sum, line) => sum + toKobo(line.debitKobo ?? 0), 0);
    const c = lines.reduce((sum, line) => sum + toKobo(line.creditKobo ?? 0), 0);
    return { debits: d, credits: c, difference: d - c, balanced: d === c && d > 0 };
  }, [lines]);

  const update = (id: string, patch: Partial<HawkJournalLine>) =>
    onChange(lines.map((line) => (line.id === id ? { ...line, ...patch } : line)));

  const remove = (id: string) => onChange(lines.filter((line) => line.id !== id));

  const add = () =>
    onChange([
      ...lines,
      { id: `line-${Date.now()}-${lines.length}`, account: '', memo: '' },
    ]);

  return (
    <div className={cn('hawk-board flex flex-col gap-hawk-6', className)}>
      <div className="overflow-hidden rounded-hawk border border-hawk-line">
        <table className="w-full border-collapse">
          <thead className="bg-hawk-stock">
            <tr className="border-b border-hawk-line-strong">
              <th className="px-hawk-4 py-hawk-3 text-left text-hawk-overline font-bold uppercase tracking-hawk-overline text-hawk-ink-muted">
                Account
              </th>
              <th className="px-hawk-4 py-hawk-3 text-left text-hawk-overline font-bold uppercase tracking-hawk-overline text-hawk-ink-muted">
                Memo
              </th>
              <th className="w-40 px-hawk-4 py-hawk-3 text-right text-hawk-overline font-bold uppercase tracking-hawk-overline text-hawk-ink-muted">
                Debit
              </th>
              <th className="w-40 px-hawk-4 py-hawk-3 text-right text-hawk-overline font-bold uppercase tracking-hawk-overline text-hawk-ink-muted">
                Credit
              </th>
              <th className="w-12" />
            </tr>
          </thead>

          <tbody>
            {lines.map((line) => (
              <tr key={line.id} className="border-b border-hawk-line">
                <td className="px-hawk-4 py-hawk-3 align-top">
                  <HawkDropdown
                    options={accounts}
                    value={line.account}
                    onChange={(account) => update(line.id, { account })}
                    placeholder="Select account"
                  />
                </td>
                <td className="px-hawk-4 py-hawk-3 align-top">
                  <HawkTextInput
                    value={line.memo ?? ''}
                    onChange={(memo) => update(line.id, { memo })}
                    placeholder="Optional"
                  />
                </td>
                <td className="px-hawk-4 py-hawk-3 align-top">
                  <HawkCurrencyInput
                    value={line.debitKobo}
                    // A line is a debit or a credit, never both. Typing in one
                    // column clears the other rather than letting a line carry
                    // two amounts the ledger would reject downstream.
                    onChange={(debitKobo) =>
                      update(line.id, { debitKobo, creditKobo: undefined })
                    }
                  />
                </td>
                <td className="px-hawk-4 py-hawk-3 align-top">
                  <HawkCurrencyInput
                    value={line.creditKobo}
                    onChange={(creditKobo) =>
                      update(line.id, { creditKobo, debitKobo: undefined })
                    }
                  />
                </td>
                <td className="px-hawk-4 py-hawk-3 align-top">
                  <HawkIconButton
                    icon={IconTrash}
                    label="Remove line"
                    size="sm"
                    destructive
                    disabled={lines.length <= 2}
                    onClick={() => remove(line.id)}
                  />
                </td>
              </tr>
            ))}
          </tbody>

          <tfoot className="bg-hawk-stock">
            <tr className="border-t border-hawk-line-strong">
              <td colSpan={2} className="px-hawk-4 py-hawk-4">
                <HawkButton
                  label="Add line"
                  variant="ghost"
                  size="sm"
                  startIcon={IconPlus}
                  onClick={add}
                />
              </td>
              <td className="px-hawk-4 py-hawk-4 text-right">
                <HawkFigure value={debits} size="sm" neverMasked />
              </td>
              <td className="px-hawk-4 py-hawk-4 text-right">
                <HawkFigure value={credits} size="sm" neverMasked />
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      <HawkBalanceCheck difference={difference} balanced={balanced} />

      <HawkTextInput
        label="Narration"
        value={narration}
        onChange={onNarrationChange}
        placeholder="Why this journal is being posted"
        hint="This is written to the audit log and cannot be edited later."
      />

      {guards}

      <div className="flex items-center justify-end gap-hawk-4">
        {onCancel && <HawkButton label="Cancel" variant="ghost" onClick={onCancel} />}
        <HawkButton
          label="Post journal"
          destructive
          // The gate. An unbalanced journal has no submit path at all.
          disabled={!balanced}
          loading={posting}
          onClick={onPost}
        />
      </div>
    </div>
  );
}

/**
 * The balance check.
 *
 * States the imbalance as a signed figure and says which side is heavy.
 * "Debits exceed credits by ₦2,500" is a line an operator can act on;
 * "unbalanced" is not.
 */
export function HawkBalanceCheck({
  difference,
  balanced,
  className,
}: {
  difference: number;
  balanced: boolean;
  className?: string;
}) {
  const tone = balanced ? quartet(HawkSemantic.SUCCESS) : HAWK_HAZARD;

  return (
    <div
      className={cn(
        'flex items-center gap-hawk-4 rounded-hawk-sm border px-hawk-5 py-hawk-4',
        tone.softBg,
        tone.border,
        className,
      )}
    >
      <HawkIcon
        icon={balanced ? IconCheck : IconAlertTriangle}
        size={15}
        className={tone.text}
      />
      <HawkText variant="label" className={cn('font-semibold', tone.onSoft)}>
        {balanced
          ? 'Balanced'
          : difference === 0
            ? 'Enter the amounts to post'
            : difference > 0
              ? `Debits exceed credits by ${formatKobo(difference)}`
              : `Credits exceed debits by ${formatKobo(Math.abs(difference))}`}
      </HawkText>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

export interface HawkLedgerRowProps {
  /** Account code and name. */
  account: string;
  accountName?: string;
  debitKobo?: HawkKobo;
  creditKobo?: HawkKobo;
  /** Running balance after this line. */
  balanceKobo?: HawkKobo;
  memo?: string;
  timestamp?: string;
  className?: string;
}

/**
 * One posted ledger line.
 *
 * Debit and credit occupy separate fixed columns and an empty column renders as
 * nothing rather than as a zero — a ledger where every line reads `₦0.00` in
 * one column is a ledger nobody can scan.
 */
export function HawkLedgerRow({
  account,
  accountName,
  debitKobo,
  creditKobo,
  balanceKobo,
  memo,
  timestamp,
  className,
}: HawkLedgerRowProps) {
  return (
    <tr className={cn('border-b border-hawk-line', className)}>
      <td className="px-hawk-4 py-hawk-row-y">
        <div className="flex flex-col">
          <span className="hawk-record text-hawk-label font-semibold text-hawk-ink-strong">
            {account}
          </span>
          {accountName && (
            <span className="truncate text-hawk-caption text-hawk-ink-muted">{accountName}</span>
          )}
        </div>
      </td>
      <td className="px-hawk-4 py-hawk-row-y">
        <span className="truncate text-hawk-caption text-hawk-ink-muted">{memo}</span>
      </td>
      <td className="px-hawk-4 py-hawk-row-y text-right">
        {debitKobo !== undefined && <HawkFigure value={debitKobo} size="sm" decimals />}
      </td>
      <td className="px-hawk-4 py-hawk-row-y text-right">
        {creditKobo !== undefined && <HawkFigure value={creditKobo} size="sm" decimals />}
      </td>
      {balanceKobo !== undefined && (
        <td className="px-hawk-4 py-hawk-row-y text-right">
          <HawkFigure value={balanceKobo} size="sm" ink="muted" decimals />
        </td>
      )}
      {timestamp && (
        <td className="px-hawk-4 py-hawk-row-y text-right">
          <span className="hawk-record text-hawk-caption text-hawk-ink-disabled">{timestamp}</span>
        </td>
      )}
    </tr>
  );
}
