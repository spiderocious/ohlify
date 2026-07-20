import { Pressable, View } from 'react-native';

import { AppIcon, type AppIconName } from '../../icons/app-icons';
import { AppText } from '../../primitives/app-text/app-text';
import { colors } from '../../theme/colors';

/**
 * Reusable setup row — icon tile, title, subtitle/summary, completion badge,
 * and chevron. 1:1 with mobile/lib/ui/widgets/kyc_item_tile/kyc_item_tile.dart.
 */
export interface KycItemTileProps {
  icon: AppIconName;
  title: string;
  /** Short description — the filled value when completed, a hint sentence otherwise. */
  subtitle: string;
  completed: boolean;
  onPress: () => void;
  /** Locked state during a partial-rejection resubmit — dims, ignores taps, shows a lock indicator. */
  locked?: boolean;
}

export function KycItemTile({
  icon,
  title,
  subtitle,
  completed,
  onPress,
  locked = false,
}: KycItemTileProps) {
  const body = (
    <View
      style={{
        padding: 16,
        backgroundColor: colors.background,
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        opacity: locked ? 0.6 : 1,
      }}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 14,
          backgroundColor: colors.surfaceDark,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <AppIcon name={icon} size={20} color={colors.primary} />
      </View>
      <View style={{ width: 14 }} />
      <View style={{ flex: 1 }}>
        <AppText variant="body" color={colors.textJet} weight="600" align="left">
          {title}
        </AppText>
        <View style={{ height: 2 }} />
        <AppText variant="bodyNormal" color={colors.textMuted} align="left" numberOfLines={2}>
          {subtitle}
        </AppText>
      </View>
      <View style={{ width: 10 }} />
      <StatusBadge completed={completed} locked={locked} />
      {!locked ? (
        <>
          <View style={{ width: 6 }} />
          <AppIcon name="chevronRight" size={20} color={colors.textSlate} />
        </>
      ) : null}
    </View>
  );

  if (locked) return body;
  return <Pressable onPress={onPress}>{body}</Pressable>;
}

function StatusBadge({ completed, locked }: { completed: boolean; locked: boolean }) {
  if (locked) {
    return (
      <View
        style={{
          width: 26,
          height: 26,
          borderRadius: 13,
          backgroundColor: colors.surfaceLight,
          borderWidth: 1.5,
          borderColor: colors.border,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <AppIcon name="clock" size={13} color={colors.textMuted} />
      </View>
    );
  }
  if (completed) {
    return (
      <View
        style={{
          width: 26,
          height: 26,
          borderRadius: 13,
          backgroundColor: colors.success,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <AppIcon name="check" size={16} color={colors.textWhite} />
      </View>
    );
  }
  return (
    <View
      style={{
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: colors.surfaceLight,
        borderWidth: 1.5,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <AppIcon name="clock" size={14} color={colors.textMuted} />
    </View>
  );
}
