import { AppButton } from '@ohlify/mobile-ui';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { View } from 'react-native';

/** Native datetime picker. Metro resolves date-time-form.web.tsx instead on web. */
export function DateTimeForm({ seed, onConfirm }: { seed: Date; onConfirm: (date: Date) => void }) {
  const [value, setValue] = useState(seed);

  return (
    <View>
      <DateTimePicker
        value={value}
        mode="datetime"
        display="spinner"
        minimumDate={new Date()}
        onChange={(_, date) => date && setValue(date)}
      />
      <View style={{ height: 12 }} />
      <AppButton label="Confirm" expanded radius={100} onPress={() => onConfirm(value)} />
    </View>
  );
}
