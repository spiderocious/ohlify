import { AppButton, AppText, colors } from '@ohlify/mobile-ui';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { View } from 'react-native';

/** Native time picker. Metro resolves time-form.web.tsx instead on web. */
export function TimeForm({ seedMinute, helpText, onConfirm }: { seedMinute: number; helpText?: string; onConfirm: (minute: number) => void }) {
  const seed = new Date();
  seed.setHours(Math.floor(seedMinute / 60), seedMinute % 60, 0, 0);
  const [value, setValue] = useState(seed);

  return (
    <View>
      {helpText ? (
        <>
          <AppText variant="body" color={colors.textMuted} align="left">
            {helpText}
          </AppText>
          <View style={{ height: 12 }} />
        </>
      ) : null}
      <DateTimePicker value={value} mode="time" display="spinner" onChange={(_, date) => date && setValue(date)} />
      <View style={{ height: 12 }} />
      <AppButton label="Confirm" expanded radius={100} onPress={() => onConfirm(value.getHours() * 60 + value.getMinutes())} />
    </View>
  );
}
