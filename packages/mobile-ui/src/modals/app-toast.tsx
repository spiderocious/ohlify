import { Pressable, Text, View } from 'react-native';

import { AppIcon, type AppIconName } from '../icons/app-icons';
import { colors } from '../theme/colors';
import type { ToastEntry, ToastType } from './toast-store';

/** Visual bar for a single toast. 1:1 with mobile/lib/ui/widgets/app_toast/app_toast.dart. */
const BG_BY_TYPE: Record<ToastType, string> = {
  success: colors.toastSuccessBg,
  error: colors.toastErrorBg,
  warning: colors.toastWarningBg,
  info: colors.toastInfoBg,
};

const ICON_COLOR_BY_TYPE: Record<ToastType, string> = {
  success: colors.toastSuccessIcon,
  error: colors.toastErrorIcon,
  warning: colors.toastWarningIcon,
  info: colors.toastInfoIcon,
};

const ICON_BY_TYPE: Record<ToastType, AppIconName> = {
  success: 'check',
  error: 'error',
  warning: 'warning',
  info: 'info',
};

export function AppToast({ entry, onDismiss }: { entry: ToastEntry; onDismiss: () => void }) {
  const { type, fullWidth, showIcon, dismissible } = entry.options;

  return (
    <View
      style={{
        width: '100%',
        paddingHorizontal: fullWidth ? 20 : 16,
        paddingVertical: 14,
        backgroundColor: BG_BY_TYPE[type],
        borderRadius: fullWidth ? 0 : 10,
        flexDirection: 'row',
        alignItems: 'center',
      }}
    >
      {showIcon ? (
        <View style={{ marginRight: 12 }}>
          <AppIcon name={ICON_BY_TYPE[type]} size={20} color={ICON_COLOR_BY_TYPE[type]} />
        </View>
      ) : null}

      <Text
        style={{
          flex: 1,
          fontFamily: 'MonaSans-Medium',
          fontSize: 14,
          fontWeight: '500',
          color: colors.textWhite,
          lineHeight: 20,
        }}
      >
        {entry.message}
      </Text>

      {dismissible ? (
        <Pressable onPress={onDismiss} style={{ marginLeft: 12 }}>
          <Text
            style={{
              fontFamily: 'MonaSans-Bold',
              fontSize: 14,
              fontWeight: '700',
              color: colors.textWhite,
            }}
          >
            Dismiss
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
