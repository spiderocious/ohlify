import { AppButton, AppText, colors } from '@ohlify/mobile-ui';
import { useState } from 'react';
import { TextInput, View } from 'react-native';

/** Web fallback for the native time picker. Plain numeric fields. */
export function TimeForm({ seedMinute, helpText, onConfirm }: { seedMinute: number; helpText?: string; onConfirm: (minute: number) => void }) {
  const [hour, setHour] = useState(String(Math.floor(seedMinute / 60)).padStart(2, '0'));
  const [minute, setMinute] = useState(String(seedMinute % 60).padStart(2, '0'));

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

  function submit() {
    const h = Math.min(23, Math.max(0, Number(hour) || 0));
    const m = Math.min(59, Math.max(0, Number(minute) || 0));
    onConfirm(h * 60 + m);
  }

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
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
        <TextInput style={[fieldStyle, { width: 60 }]} keyboardType="number-pad" value={hour} onChangeText={setHour} maxLength={2} placeholder="HH" />
        <View style={{ width: 8 }} />
        <AppText variant="header" color={colors.textJet}>
          :
        </AppText>
        <View style={{ width: 8 }} />
        <TextInput style={[fieldStyle, { width: 60 }]} keyboardType="number-pad" value={minute} onChangeText={setMinute} maxLength={2} placeholder="MM" />
      </View>
      <View style={{ height: 20 }} />
      <AppButton label="Confirm" expanded radius={100} onPress={submit} />
    </View>
  );
}
