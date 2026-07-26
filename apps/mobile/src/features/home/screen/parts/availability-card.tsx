import { AppText, colors } from '@ohlify/mobile-ui';
import { Switch, View } from 'react-native';

export interface AvailabilityCardProps {
  isAvailable: boolean;
  isSaving: boolean;
  onChange: (next: boolean) => void;
}

/**
 * The professional's most important control, given the top of their screen.
 *
 * This is what decides whether calls reach them at all — it replaced heartbeats
 * entirely — so it is a switch they can see and flip without navigating, not a
 * setting buried three taps deep.
 */
export function AvailabilityCard({ isAvailable, isSaving, onChange }: AvailabilityCardProps) {
  const tint = isAvailable ? colors.success : colors.textSlate;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        padding: 18,
        borderRadius: 18,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: isAvailable ? `${colors.success}55` : colors.border,
      }}
    >
      <View
        style={{
          width: 10,
          height: 10,
          borderRadius: 5,
          backgroundColor: tint,
        }}
      />
      <View style={{ width: 12 }} />
      <View style={{ flex: 1 }}>
        <AppText variant="body" weight="700" color={colors.textJet} align="left">
          {isAvailable ? 'Available for calls' : 'Not taking calls'}
        </AppText>
        <AppText variant="bodySmall" color={colors.textMuted} align="left">
          {isAvailable
            ? 'Clients who hold minutes with you can call now.'
            : 'You won’t receive new calls until you turn this back on.'}
        </AppText>
      </View>
      <Switch value={isAvailable} onValueChange={onChange} disabled={isSaving} />
    </View>
  );
}
