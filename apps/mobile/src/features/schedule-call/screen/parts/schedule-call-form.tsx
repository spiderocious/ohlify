import { AppButton, AppDateInput, AppDropdownInput, AppText, SlotChipPicker, colors, type DropdownOption, type SlotOption } from '@ohlify/mobile-ui';
import type { CallType } from '@ohlify/core';
import { Text, View } from 'react-native';

import type { ProfessionalRateView } from '@features/professionals/types/professional-models';

export interface ScheduleCallFormSubmit {
  rateId: string;
  startAtIso: string;
}

export interface ScheduleCallFormProps {
  rates: ProfessionalRateView[];
  lockedRate?: ProfessionalRateView;
  slots: SlotOption[];
  slotsLoading: boolean;
  date?: Date;
  onDateChange: (date: Date) => void;
  callType?: CallType;
  durationMinutes?: number;
  onCallTypeChange: (callType: CallType | undefined) => void;
  onDurationChange: (duration: number | undefined) => void;
  selectedSlotIso?: string;
  onSelectedSlotChange: (slot: SlotOption) => void;
  onClearLockedRate?: () => void;
  /** Wallet balance hint (kobo). When priceKobo > balance, shows a "wallet ₦X · top up ₦Y" line. */
  walletBalanceKobo?: number;
  onSubmit: (submission: ScheduleCallFormSubmit) => void;
  isSubmitting: boolean;
}

function formatNaira(kobo: number): string {
  const naira = Math.round(kobo / 100);
  return `₦${naira.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,')}`;
}

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function isoWeekday(d: Date): number {
  const day = d.getDay();
  return day === 0 ? 7 : day;
}

function relativeDayLabel(target: Date): string {
  const now = new Date();
  const t = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = Math.round((t.getTime() - today.getTime()) / 86_400_000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff > 1) return `In ${diff} days`;
  if (diff === -1) return 'Yesterday';
  return `${Math.abs(diff)} days ago`;
}

function formatLongDate(d: Date): string {
  return `${WEEKDAYS[isoWeekday(d) - 1]}, ${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

/**
 * Stateless presentation widget — all interesting state lives on the
 * parent screen so the availability query can react to it. Mirrors
 * mobile/lib/features/schedule_call/screen/parts/schedule_call_form.dart.
 */
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
  selectedSlotIso,
  onSelectedSlotChange,
  onClearLockedRate,
  walletBalanceKobo,
  onSubmit,
  isSubmitting,
}: ScheduleCallFormProps) {
  const safeRates = Array.isArray(rates) ? rates : [];

  const activeRate: ProfessionalRateView | undefined = lockedRate
    ? lockedRate
    : callType !== undefined && durationMinutes !== undefined
      ? safeRates.find((r) => r.callType === callType && r.durationMinutes === durationMinutes)
      : undefined;

  const seenCallTypes = new Set<string>();
  const callTypeOptions: DropdownOption<CallType>[] = [];
  for (const r of safeRates) {
    if (!seenCallTypes.has(r.callType)) {
      seenCallTypes.add(r.callType);
      callTypeOptions.push({ label: r.callType === 'audio' ? 'Audio' : 'Video', value: r.callType === 'audio' ? 'audio' : 'video' });
    }
  }

  const durationOptions: DropdownOption<number>[] =
    callType === undefined
      ? []
      : safeRates
          .filter((r) => r.callType === callType)
          .sort((a, b) => a.durationMinutes - b.durationMinutes)
          .map((r) => ({ label: `${r.durationMinutes} min — ${formatNaira(r.priceKobo)}`, value: r.durationMinutes }));

  const priceKobo = activeRate?.priceKobo ?? 0;
  const showWalletHint = walletBalanceKobo !== undefined && priceKobo > 0 && walletBalanceKobo < priceKobo;
  const shortfallKobo = showWalletHint ? priceKobo - (walletBalanceKobo ?? 0) : 0;
  const isValid = date !== undefined && activeRate !== undefined && selectedSlotIso !== undefined;

  const today = new Date();
  const minDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  return (
    <View style={{ padding: 16, backgroundColor: colors.background, borderRadius: 16 }}>
      <AppDateInput label="Select date" value={date} minDate={minDate} onChange={onDateChange} />
      {date ? (
        <>
          <View style={{ height: 12 }} />
          <SelectedDateSummary date={date} />
        </>
      ) : null}
      <View style={{ height: 20 }} />
      {lockedRate ? (
        <LockedRateSummary rate={lockedRate} onClear={onClearLockedRate} />
      ) : (
        <>
          <FieldLabel text="Call type" />
          <View style={{ height: 8 }} />
          <AppDropdownInput
            placeholder="Select call type"
            bordered
            value={callType}
            options={callTypeOptions}
            onChange={(v) => {
              onCallTypeChange(v);
              onDurationChange(undefined);
            }}
          />
          <View style={{ height: 20 }} />
          <FieldLabel text="Duration" />
          <View style={{ height: 8 }} />
          <AppDropdownInput
            placeholder={callType === undefined ? 'Select call type first' : 'Select duration'}
            bordered
            value={durationMinutes}
            options={durationOptions}
            onChange={onDurationChange}
          />
        </>
      )}
      <View style={{ height: 20 }} />
      <FieldLabel text="Time" />
      <View style={{ height: 8 }} />
      <SlotChipPicker
        slots={slots}
        selectedStartAtIso={selectedSlotIso}
        onSelect={onSelectedSlotChange}
        isLoading={slotsLoading}
        hasDate={date !== undefined && activeRate !== undefined}
      />
      {activeRate ? (
        <>
          <View style={{ height: 20 }} />
          <PriceCard priceKobo={priceKobo} walletBalanceKobo={walletBalanceKobo} showWalletHint={showWalletHint} shortfallKobo={shortfallKobo} />
        </>
      ) : null}
      <View style={{ height: 24 }} />
      <AppButton
        label={isSubmitting ? 'Scheduling…' : 'Schedule call'}
        expanded
        radius={100}
        height={52}
        isDisabled={!isValid || isSubmitting}
        onPress={!isValid || isSubmitting ? undefined : () => onSubmit({ rateId: activeRate!.id, startAtIso: selectedSlotIso! })}
      />
    </View>
  );
}

function FieldLabel({ text }: { text: string }) {
  return (
    <AppText variant="body" color={colors.textJet} weight="600" align="left">
      {text}
    </AppText>
  );
}

function SelectedDateSummary({ date }: { date: Date }) {
  const relative = relativeDayLabel(date);
  const isImminent = relative === 'Today' || relative === 'Tomorrow';
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 12,
        backgroundColor: colors.surfaceLight,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: `${colors.border}99`,
      }}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: 'MonaSans-SemiBold', fontSize: 11, fontWeight: '600', color: colors.textMuted, letterSpacing: 0.6 }}>CALL DATE</Text>
        <View style={{ height: 4 }} />
        <Text style={{ fontFamily: 'MonaSans-Bold', fontSize: 15, fontWeight: '700', color: colors.textJet }}>{formatLongDate(date)}</Text>
      </View>
      <View style={{ width: 12 }} />
      <View
        style={{
          paddingHorizontal: 12,
          paddingVertical: 6,
          borderRadius: 100,
          backgroundColor: isImminent ? `${colors.primary}1F` : colors.background,
          borderWidth: isImminent ? 0 : 1,
          borderColor: colors.border,
        }}
      >
        <Text style={{ fontFamily: 'MonaSans-SemiBold', fontSize: 12, fontWeight: '600', color: isImminent ? colors.primary : colors.textMuted }}>{relative}</Text>
      </View>
    </View>
  );
}

function LockedRateSummary({ rate, onClear }: { rate: ProfessionalRateView; onClear?: () => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, backgroundColor: colors.surfaceLight, borderRadius: 12 }}>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: 'MonaSans-SemiBold', fontSize: 14, fontWeight: '600', color: colors.textJet }}>
          {`${rate.callType === 'video' ? 'Video' : 'Audio'} call · ${rate.durationMinutes} min`}
        </Text>
        <View style={{ height: 2 }} />
        <Text style={{ fontFamily: 'MonaSans-Regular', fontSize: 13, color: colors.textMuted }}>{formatNaira(rate.priceKobo)}</Text>
      </View>
      {onClear ? (
        <Text onPress={onClear} style={{ fontFamily: 'MonaSans-SemiBold', fontSize: 13, fontWeight: '600', color: colors.primary }}>
          Change
        </Text>
      ) : null}
    </View>
  );
}

function PriceCard({
  priceKobo,
  walletBalanceKobo,
  showWalletHint,
  shortfallKobo,
}: {
  priceKobo: number;
  walletBalanceKobo?: number;
  showWalletHint: boolean;
  shortfallKobo: number;
}) {
  return (
    <View style={{ paddingHorizontal: 14, paddingVertical: 12, backgroundColor: colors.surfaceLight, borderRadius: 12 }}>
      <View style={{ flexDirection: 'row' }}>
        <View style={{ flex: 1 }}>
          <AppText variant="bodyNormal" color={colors.textMuted} align="left">
            You'll be charged
          </AppText>
        </View>
        <Text style={{ fontFamily: 'MonaSans-Bold', fontSize: 15, fontWeight: '700', color: colors.textJet }}>{formatNaira(priceKobo)}</Text>
      </View>
      {showWalletHint ? (
        <>
          <View style={{ height: 4 }} />
          <View style={{ flexDirection: 'row' }}>
            <View style={{ flex: 1 }}>
              <AppText variant="bodyNormal" color={colors.textMuted} align="left">
                Wallet balance
              </AppText>
            </View>
            <Text style={{ fontFamily: 'MonaSans-SemiBold', fontSize: 12, fontWeight: '600', color: colors.textMuted }}>
              {`${formatNaira(walletBalanceKobo ?? 0)} · top up ${formatNaira(shortfallKobo)}`}
            </Text>
          </View>
        </>
      ) : null}
    </View>
  );
}
