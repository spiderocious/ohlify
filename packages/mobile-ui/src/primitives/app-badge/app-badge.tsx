import { Text, View } from 'react-native';

import { colors } from '../../theme/colors';

export interface AppBadgeProps {
  /** Omit for a dot. A count of 0 renders nothing. */
  count?: number;
  /** Above this, renders `9+` — the exact number stops mattering. */
  max?: number;
}

/**
 * Unread indicator: a count where the number is actionable, a dot where
 * "something happened" is the whole signal.
 *
 * A number implies per-item read state. Surfaces that have no such concept —
 * calls, wallet movements — get the dot instead, so the UI never promises a
 * precision the data cannot back.
 */
export function AppBadge({ count, max = 9 }: AppBadgeProps) {
  const isDot = count === undefined;
  if (!isDot && count <= 0) return null;

  if (isDot) {
    return (
      <View
        style={{
          width: 9,
          height: 9,
          borderRadius: 5,
          backgroundColor: colors.error,
          borderWidth: 1.5,
          borderColor: colors.navBackground,
        }}
      />
    );
  }

  const label = count > max ? `${max}+` : String(count);
  return (
    <View
      style={{
        minWidth: 17,
        height: 17,
        borderRadius: 9,
        paddingHorizontal: 4,
        backgroundColor: colors.error,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: colors.navBackground,
      }}
    >
      <Text
        style={{
          fontFamily: 'MonaSans-Bold',
          fontSize: 10,
          lineHeight: 13,
          color: colors.textWhite,
        }}
      >
        {label}
      </Text>
    </View>
  );
}
