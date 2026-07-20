import { AppIcon, AppTag, AppText, colors, type AppIconName } from '@ohlify/mobile-ui';
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

interface RowShellProps {
  icon: AppIconName;
  iconColor: string;
  title: string;
  onTap: () => void;
  subtitle: ReactNode;
}

/** Mirrors mobile/lib/features/profile/screen/parts/personal_info_row.dart. */
export interface PersonalInfoRowProps {
  icon: AppIconName;
  iconColor: string;
  title: string;
  subtitle: string;
  onTap: () => void;
}

export function PersonalInfoRow({ icon, iconColor, title, subtitle, onTap }: PersonalInfoRowProps) {
  return (
    <RowShell
      icon={icon}
      iconColor={iconColor}
      title={title}
      onTap={onTap}
      subtitle={
        <AppText variant="bodyNormal" color={colors.textMuted} align="left" numberOfLines={1}>
          {subtitle}
        </AppText>
      }
    />
  );
}

export interface PersonalInfoDescriptionRowProps {
  icon: AppIconName;
  iconColor: string;
  title: string;
  description: string;
  onTap: () => void;
}

export function PersonalInfoDescriptionRow({ icon, iconColor, title, description, onTap }: PersonalInfoDescriptionRowProps) {
  return (
    <RowShell
      icon={icon}
      iconColor={iconColor}
      title={title}
      onTap={onTap}
      subtitle={
        <AppText variant="bodyNormal" color={colors.textMuted} align="left">
          {description}
        </AppText>
      }
    />
  );
}

export interface PersonalInfoInterestsRowProps {
  icon: AppIconName;
  iconColor: string;
  title: string;
  interests: string[];
  onTap: () => void;
}

export function PersonalInfoInterestsRow({ icon, iconColor, title, interests, onTap }: PersonalInfoInterestsRowProps) {
  return (
    <RowShell
      icon={icon}
      iconColor={iconColor}
      title={title}
      onTap={onTap}
      subtitle={
        interests.length === 0 ? (
          <AppText variant="bodyNormal" color={colors.textMuted} align="left">
            Not set yet
          </AppText>
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {interests.map((v) => (
              <AppTag key={v} label={v.toUpperCase()} variant="outline" size="small" />
            ))}
          </View>
        )
      }
    />
  );
}

function RowShell({ icon, iconColor, title, subtitle, onTap }: RowShellProps) {
  return (
    <Pressable onPress={onTap}>
      <View style={{ padding: 14, backgroundColor: colors.surfaceLight, borderRadius: 14, flexDirection: 'row', alignItems: 'flex-start' }}>
        <View style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: `${iconColor}26`, alignItems: 'center', justifyContent: 'center' }}>
          <AppIcon name={icon} size={22} color={iconColor} />
        </View>
        <View style={{ width: 14 }} />
        <View style={{ flex: 1 }}>
          <AppText variant="body" color={colors.textJet} weight="700" align="left">
            {title}
          </AppText>
          <View style={{ height: 6 }} />
          {subtitle}
        </View>
        <View style={{ width: 8 }} />
        <View style={{ paddingTop: 10 }}>
          <AppIcon name="chevronRight" size={20} color={colors.textSlate} />
        </View>
      </View>
    </Pressable>
  );
}
