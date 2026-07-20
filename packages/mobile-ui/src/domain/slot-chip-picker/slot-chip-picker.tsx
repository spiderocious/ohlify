import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { AppText } from '../../primitives/app-text/app-text';
import { colors } from '../../theme/colors';

/**
 * A single time-of-day chip. `startAtIso` is the slot's UTC instant from
 * the backend availability response; `label` is the locally-formatted
 * time. 1:1 with mobile/lib/ui/widgets/slot_chip_picker/slot_chip_picker.dart.
 */
export interface SlotOption {
  startAtIso: string;
  label: string;
}

export interface SlotChipPickerProps {
  slots: SlotOption[];
  selectedStartAtIso?: string;
  onSelect: (slot: SlotOption) => void;
  isLoading?: boolean;
  hasDate: boolean;
}

/**
 * Renders a wrap of pill-shaped time chips. Four visual states: no date
 * picked, loading, empty, or a wrap of chips.
 */
export function SlotChipPicker({
  slots,
  selectedStartAtIso,
  onSelect,
  isLoading = false,
  hasDate,
}: SlotChipPickerProps) {
  if (!hasDate) {
    return <Placeholder message="Pick a date to see available slots." height={56} />;
  }
  if (isLoading) {
    return (
      <View
        style={{
          height: 96,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.surfaceLight,
          borderRadius: 16,
        }}
      >
        <ActivityIndicator size="small" color={colors.textMuted} />
        <View style={{ height: 8 }} />
        <AppText variant="bodyNormal" color={colors.textMuted} align="center">
          Looking up available times…
        </AppText>
      </View>
    );
  }
  if (slots.length === 0) {
    return <Placeholder message="No slots available on this date — try another." height={64} />;
  }
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {slots.map((slot) => (
        <SlotChip
          key={slot.startAtIso}
          slot={slot}
          selected={slot.startAtIso === selectedStartAtIso}
          onTap={() => onSelect(slot)}
        />
      ))}
    </View>
  );
}

function SlotChip({
  slot,
  selected,
  onTap,
}: {
  slot: SlotOption;
  selected: boolean;
  onTap: () => void;
}) {
  return (
    <Pressable onPress={onTap}>
      <View
        style={{
          paddingHorizontal: 16,
          paddingVertical: 10,
          borderRadius: 100,
          backgroundColor: selected ? colors.primary : colors.background,
          borderWidth: 1,
          borderColor: selected ? colors.primary : colors.border,
        }}
      >
        <Text
          style={{
            fontFamily: 'MonaSans-SemiBold',
            fontSize: 13,
            fontWeight: '600',
            color: selected ? '#FFFFFF' : colors.textJet,
          }}
        >
          {slot.label}
        </Text>
      </View>
    </Pressable>
  );
}

function Placeholder({ message, height }: { message: string; height: number }) {
  return (
    <View
      style={{
        height,
        paddingHorizontal: 16,
        paddingVertical: 12,
        justifyContent: 'center',
        backgroundColor: colors.surfaceLight,
        borderRadius: 16,
      }}
    >
      <AppText variant="bodyNormal" color={colors.textMuted} align="left">
        {message}
      </AppText>
    </View>
  );
}
