import { AppButton, AppText, colors } from '@ohlify/mobile-ui';
import { useState } from 'react';
import { TextInput, View } from 'react-native';

/**
 * Web fallback for the native datetime picker (@react-native-community/
 * datetimepicker has no web implementation). Plain numeric fields — fine
 * since the dev workflow runs this in Chrome via `expo start --web`.
 */
export function DateTimeForm({ seed, onConfirm }: { seed: Date; onConfirm: (date: Date) => void }) {
  const [year, setYear] = useState(String(seed.getFullYear()));
  const [month, setMonth] = useState(String(seed.getMonth() + 1));
  const [day, setDay] = useState(String(seed.getDate()));
  const [hour, setHour] = useState(String(seed.getHours()));
  const [minute, setMinute] = useState(String(seed.getMinutes()).padStart(2, '0'));

  function submit() {
    onConfirm(new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute)));
  }

  const fieldStyle = {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
    fontFamily: 'MonaSans-Regular',
    fontSize: 15,
    color: colors.textJet,
    textAlign: 'center' as const,
  };

  return (
    <View>
      <AppText variant="body" color={colors.textMuted} align="left">
        Date
      </AppText>
      <View style={{ height: 6 }} />
      <View style={{ flexDirection: 'row' }}>
        <TextInput style={[fieldStyle, { flex: 1 }]} keyboardType="number-pad" value={year} onChangeText={setYear} placeholder="YYYY" maxLength={4} />
        <View style={{ width: 8 }} />
        <TextInput style={[fieldStyle, { flex: 1 }]} keyboardType="number-pad" value={month} onChangeText={setMonth} placeholder="MM" maxLength={2} />
        <View style={{ width: 8 }} />
        <TextInput style={[fieldStyle, { flex: 1 }]} keyboardType="number-pad" value={day} onChangeText={setDay} placeholder="DD" maxLength={2} />
      </View>
      <View style={{ height: 16 }} />
      <AppText variant="body" color={colors.textMuted} align="left">
        Time
      </AppText>
      <View style={{ height: 6 }} />
      <View style={{ flexDirection: 'row' }}>
        <TextInput style={[fieldStyle, { flex: 1 }]} keyboardType="number-pad" value={hour} onChangeText={setHour} placeholder="HH" maxLength={2} />
        <View style={{ width: 8 }} />
        <TextInput style={[fieldStyle, { flex: 1 }]} keyboardType="number-pad" value={minute} onChangeText={setMinute} placeholder="MM" maxLength={2} />
      </View>
      <View style={{ height: 20 }} />
      <AppButton label="Confirm" expanded radius={100} onPress={submit} />
    </View>
  );
}
