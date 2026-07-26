import { AppIcon, AppText, colors } from '@ohlify/mobile-ui';
import { Pressable, View } from 'react-native';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'] as const;

export interface PinPadProps {
  length: number;
  filled: number;
  error?: string;
  onKey: (digit: string) => void;
  onDelete: () => void;
}

/**
 * Numeric pad with dot indicators.
 *
 * Its own keypad rather than a text field: a PIN entered on the system keyboard
 * shows a cursor, autocorrect, and paste — none of which belong on a lock
 * screen, and all of which leak the secret into the keyboard's own history.
 */
export function PinPad({ length, filled, error, onKey, onDelete }: PinPadProps) {
  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ flexDirection: 'row', gap: 14 }}>
        {Array.from({ length }, (_, i) => (
          <View
            key={i}
            style={{
              width: 14,
              height: 14,
              borderRadius: 7,
              backgroundColor: i < filled ? colors.primary : 'transparent',
              borderWidth: 1.5,
              borderColor: error ? colors.error : i < filled ? colors.primary : colors.border,
            }}
          />
        ))}
      </View>

      {error ? (
        <>
          <View style={{ height: 12 }} />
          <AppText variant="bodySmall" color={colors.error} align="center">
            {error}
          </AppText>
        </>
      ) : null}

      <View style={{ height: 28 }} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', width: 264, gap: 12 }}>
        {KEYS.map((key, index) => {
          if (key === '') return <View key={`gap-${index}`} style={{ width: 80, height: 64 }} />;
          const isDelete = key === 'del';
          return (
            <Pressable
              key={key}
              onPress={() => (isDelete ? onDelete() : onKey(key))}
              style={({ pressed }) => ({
                width: 80,
                height: 64,
                borderRadius: 16,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: pressed ? colors.border : colors.surface,
              })}
            >
              {isDelete ? (
                <AppIcon name="chevronLeft" size={22} color={colors.textJet} />
              ) : (
                <AppText variant="header" weight="600" color={colors.textJet}>
                  {key}
                </AppText>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
