import { Pressable, Text, View } from 'react-native';

import { AppIcon } from '../../icons/app-icons';
import { AppSvg } from '../../icons/app-svg';
import { colors } from '../../theme/colors';
import { ProfessionalView } from '../role-gate/role-gate';

export interface AppHeaderProps {
  notificationCount?: number;
  onCopyLink?: () => void;
  onNotification?: () => void;
}

/** 1:1 with mobile/lib/ui/widgets/app_header/app_header.dart. */
export function AppHeader({ notificationCount = 0, onCopyLink, onNotification }: AppHeaderProps) {
  return (
    <View
      style={{
        height: 64,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        backgroundColor: colors.surface,
      }}
    >
      {/* logo.svg viewBox is 82x28 — fix both dims to that ratio at header height. */}
      <AppSvg name="logo" height={28} width={82} />
      <View style={{ flex: 1 }} />
      <ProfessionalView>
        <Pressable onPress={onCopyLink}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 14,
              paddingVertical: 8,
              backgroundColor: colors.textWhite,
              borderRadius: 100,
            }}
          >
            <AppSvg name="copy" size={16} />
            <View style={{ width: 6 }} />
            <Text
              style={{
                fontFamily: 'MonaSans-SemiBold',
                fontSize: 13,
                fontWeight: '600',
                color: colors.textPrimary,
              }}
            >
              Copy link
            </Text>
          </View>
        </Pressable>
        <View style={{ width: 10 }} />
      </ProfessionalView>
      <Pressable onPress={onNotification}>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: colors.secondary,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <View>
            <AppIcon name="notification" size={20} color={colors.primary} />
            {notificationCount > 0 ? (
              <View
                style={{
                  position: 'absolute',
                  top: -2,
                  right: -6,
                  minWidth: 16,
                  height: 16,
                  paddingHorizontal: 2,
                  borderRadius: 8,
                  backgroundColor: '#FF0000',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text
                  style={{
                    fontFamily: 'MonaSans-Bold',
                    fontSize: 9,
                    fontWeight: '700',
                    color: '#FFFFFF',
                  }}
                >
                  {notificationCount > 9 ? '9+' : String(notificationCount)}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </Pressable>
    </View>
  );
}
