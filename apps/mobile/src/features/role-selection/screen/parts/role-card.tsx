import { AppIcon, AppText, colors, type AppIconName } from '@ohlify/mobile-ui';
import { Pressable, View } from 'react-native';

/** Mirrors mobile/lib/features/role_selection/screen/parts/role_card.dart. */
export interface RoleCardProps {
  title: string;
  subtitle: string;
  bullets: string[];
  icon: AppIconName;
  selected: boolean;
  onPress: () => void;
}

export function RoleCard({ title, subtitle, bullets, icon, selected, onPress }: RoleCardProps) {
  return (
    <Pressable onPress={onPress}>
      <View
        style={{
          padding: 20,
          backgroundColor: selected ? colors.surfaceDark : colors.background,
          borderRadius: 20,
          borderWidth: selected ? 1.5 : 1,
          borderColor: selected ? colors.primary : colors.border,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              backgroundColor: selected ? colors.primary : colors.surfaceDark,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <AppIcon name={icon} size={22} color={selected ? colors.textWhite : colors.primary} />
          </View>
          <View style={{ width: 14 }} />
          <View style={{ flex: 1 }}>
            <AppText variant="medium" color={colors.textJet} weight="700" align="left">
              {title}
            </AppText>
          </View>
          <Radio selected={selected} />
        </View>
        <View style={{ height: 12 }} />
        <AppText variant="body" color={colors.textMuted} align="left">
          {subtitle}
        </AppText>
        <View style={{ height: 14 }} />
        {bullets.map((bullet, i) => (
          <View key={bullet} style={{ marginTop: i > 0 ? 8 : 0 }}>
            <Bullet text={bullet} />
          </View>
        ))}
      </View>
    </Pressable>
  );
}

function Radio({ selected }: { selected: boolean }) {
  return (
    <View
      style={{
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: selected ? colors.primary : 'transparent',
        borderWidth: 2,
        borderColor: selected ? colors.primary : colors.border,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {selected ? <AppIcon name="check" size={14} color={colors.textWhite} /> : null}
    </View>
  );
}

function Bullet({ text }: { text: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
      <View style={{ marginTop: 6 }}>
        <AppIcon name="checkCircle" size={14} color={colors.primary} />
      </View>
      <View style={{ width: 10 }} />
      <View style={{ flex: 1 }}>
        <AppText variant="body" color={colors.textCharcoal} align="left">
          {text}
        </AppText>
      </View>
    </View>
  );
}
