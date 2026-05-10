import { Show } from 'meemaw';
import { useEffect, useMemo, useState } from 'react';

import type { ApiRate } from '@ohlify/api';
import type { CallType } from '@ohlify/core';
import { formatNaira } from '@ohlify/core';
import {
  AppButton,
  AppDateInput,
  AppDropdownInput,
  AppText,
  type DropdownOption,
} from '@ohlify/ui';

import { SlotChipPicker, type SlotOption } from './slot-chip-picker.js';

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/**
 * Returns a human-readable lead-time relative to today at local midnight:
 *   today / tomorrow / "in N days" / "N days ago".
 */
function relativeDayLabel(target: Date): string {
  const diffDays = Math.round(
    (startOfDay(target).getTime() - startOfDay(new Date()).getTime()) / DAY_MS,
  );
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays > 1) return `In ${diffDays} days`;
  if (diffDays === -1) return 'Yesterday';
  return `${Math.abs(diffDays)} days ago`;
}

const FULL_DATE_FORMATTER = new Intl.DateTimeFormat(undefined, {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
  year: 'numeric',
});

export interface ScheduleCallFormSubmit {
  rateId: string;
  /** ISO instant in UTC chosen from a backend availability slot. */
  startAtIso: string;
}

interface ScheduleCallFormProps {
  rates: ApiRate[];
  /** When provided, locks call type + duration to this rate's values. */
  lockedRate?: ApiRate;
  /** Slots for the selected date — owned by the parent. */
  slots: ReadonlyArray<SlotOption>;
  slotsLoading?: boolean;
  /** Date the parent has resolved (so it can drive the availability query). */
  date: Date | undefined;
  onDateChange: (d: Date) => void;
  /** Call type / duration — also lifted so the parent can use them in the
   *  availability query. */
  callType: CallType | undefined;
  durationMinutes: number | undefined;
  onCallTypeChange: (t: CallType | undefined) => void;
  onDurationChange: (n: number | undefined) => void;
  /** Allows the parent to clear `lockedRate`. */
  onClearLockedRate?: () => void;
  /** Wallet balance hint (kobo). When `priceKobo > balance`, the form shows a
   *  "you'll need to top up X" line. */
  walletBalanceKobo?: number;
  onSubmit: (s: ScheduleCallFormSubmit) => void;
  isSubmitting?: boolean;
}

export function ScheduleCallForm({
  rates,
  lockedRate,
  slots,
  slotsLoading,
  date,
  onDateChange,
  callType,
  durationMinutes,
  onCallTypeChange,
  onDurationChange,
  onClearLockedRate,
  walletBalanceKobo,
  onSubmit,
  isSubmitting,
}: ScheduleCallFormProps) {
  const [selectedSlotIso, setSelectedSlotIso] = useState<string | undefined>();

  // Reset slot selection any time the date / rate / duration changes — the
  // previously-picked instant is no longer in the slot grid.
  useEffect(() => {
    setSelectedSlotIso(undefined);
  }, [date?.getTime(), callType, durationMinutes, lockedRate?.id]);

  const callTypeOptions = useMemo<DropdownOption<CallType>[]>(() => {
    const seen = new Set<CallType>();
    return rates
      .filter((r) => {
        if (seen.has(r.call_type)) return false;
        seen.add(r.call_type);
        return true;
      })
      .map((r) => ({
        label: r.call_type === 'audio' ? 'Audio' : 'Video',
        value: r.call_type,
      }));
  }, [rates]);

  const durationOptions = useMemo<DropdownOption<number>[]>(() => {
    if (!callType) return [];
    return rates
      .filter((r) => r.call_type === callType)
      .map((r) => ({
        label: `${r.duration_minutes} min — ${formatNaira(r.price_kobo)}`,
        value: r.duration_minutes,
      }))
      .sort((a, b) => a.value - b.value);
  }, [rates, callType]);

  // Identify the rate currently in play (locked or matched from selection).
  const activeRate: ApiRate | undefined = useMemo(() => {
    if (lockedRate) return lockedRate;
    if (!callType || !durationMinutes) return undefined;
    return rates.find(
      (r) => r.call_type === callType && r.duration_minutes === durationMinutes,
    );
  }, [lockedRate, rates, callType, durationMinutes]);

  const priceKobo = activeRate?.price_kobo ?? 0;
  const showWalletHint =
    walletBalanceKobo !== undefined && priceKobo > 0 && walletBalanceKobo < priceKobo;
  const shortfallKobo = showWalletHint ? priceKobo - (walletBalanceKobo ?? 0) : 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const isValid = Boolean(date && activeRate && selectedSlotIso);

  const submit = () => {
    if (!activeRate || !selectedSlotIso) return;
    onSubmit({ rateId: activeRate.id, startAtIso: selectedSlotIso });
  };

  return (
    <div className="space-y-4 rounded-2xl bg-background p-4">
      <AppDateInput label="Select date" value={date} minDate={today} onChange={onDateChange} />

      <Show when={Boolean(date)}>
        <SelectedDateSummary date={date as Date} />
      </Show>

      {lockedRate ? (
        <LockedRateSummary rate={lockedRate} onClear={onClearLockedRate} />
      ) : (
        <>
          <Field label="Call type">
            <AppDropdownInput
              placeholder="Select call type"
              bordered
              options={callTypeOptions}
              value={callType}
              onChange={(t: CallType) => {
                onCallTypeChange(t);
                onDurationChange(undefined);
              }}
            />
          </Field>
          <Field label="Duration">
            <AppDropdownInput
              placeholder={callType ? 'Select duration' : 'Select call type first'}
              bordered
              options={durationOptions}
              value={durationMinutes}
              onChange={onDurationChange}
              disabled={!callType}
            />
          </Field>
        </>
      )}

      <Field label="Time">
        <SlotChipPicker
          slots={slots}
          selectedStartAt={selectedSlotIso}
          onSelect={(s) => setSelectedSlotIso(s.startAt)}
          isLoading={slotsLoading}
          hasDate={Boolean(date && activeRate)}
        />
      </Field>

      {activeRate ? (
        <div className="rounded-xl bg-surface-light px-4 py-3">
          <div className="flex items-center justify-between">
            <AppText variant="bodyNormal" align="start" color="var(--ohl-text-muted)">
              You'll be charged
            </AppText>
            <AppText
              variant="body"
              align="end"
              weight={700}
              color="var(--ohl-text-jet)"
            >
              {formatNaira(priceKobo)}
            </AppText>
          </div>
          {showWalletHint ? (
            <div className="mt-1 flex items-center justify-between">
              <AppText
                variant="bodyNormal"
                align="start"
                color="var(--ohl-text-muted)"
              >
                Wallet balance
              </AppText>
              <AppText
                variant="bodyNormal"
                align="end"
                weight={600}
                color="var(--ohl-text-muted)"
              >
                {formatNaira(walletBalanceKobo ?? 0)} · top up{' '}
                {formatNaira(shortfallKobo)}
              </AppText>
            </div>
          ) : null}
        </div>
      ) : null}

      <AppButton
        label="Schedule call"
        expanded
        radius={100}
        height={52}
        isDisabled={!isValid || isSubmitting}
        onPressed={isValid && !isSubmitting ? submit : undefined}
      />
    </div>
  );
}

function SelectedDateSummary({ date }: { date: Date }) {
  const relative = relativeDayLabel(date);
  const isImminent = relative === 'Today' || relative === 'Tomorrow';
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-surface-light px-4 py-3">
      <div className="min-w-0">
        <p className="font-sans text-[11px] font-semibold uppercase tracking-wide text-text-muted">
          Call date
        </p>
        <p className="mt-1 truncate font-sans text-[15px] font-bold text-text-jet">
          {FULL_DATE_FORMATTER.format(date)}
        </p>
      </div>
      <span
        className="shrink-0 rounded-pill px-3 py-1 font-sans text-xs font-semibold"
        style={{
          backgroundColor: isImminent ? 'var(--ohl-secondary)' : 'var(--ohl-background)',
          color: isImminent ? 'var(--ohl-primary)' : 'var(--ohl-text-muted)',
          border: isImminent ? 'none' : '1px solid var(--ohl-border)',
        }}
      >
        {relative}
      </span>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <AppText variant="body" weight={600} align="start" color="var(--ohl-text-jet)">
        {label}
      </AppText>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function LockedRateSummary({
  rate,
  onClear,
}: {
  rate: ApiRate;
  onClear?: () => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-surface-light px-4 py-3">
      <div>
        <AppText variant="body" weight={600} align="start" color="var(--ohl-text-jet)">
          {rate.call_type === 'video' ? 'Video' : 'Audio'} call · {rate.duration_minutes} min
        </AppText>
        <AppText
          variant="bodyNormal"
          align="start"
          color="var(--ohl-text-muted)"
          className="mt-0.5"
        >
          {formatNaira(rate.price_kobo)}
        </AppText>
      </div>
      {onClear ? (
        <button
          type="button"
          onClick={onClear}
          className="font-sans text-sm font-semibold text-primary"
        >
          Change
        </button>
      ) : null}
    </div>
  );
}
