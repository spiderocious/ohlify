import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '../primitives/app-button/app-button';
import { AppText } from '../primitives/app-text/app-text';
import { AppIcon, type AppIconName } from '../icons/app-icons';
import { colors } from '../theme/colors';
import type { FeedbackModalEntry, ModalFeedbackKind } from './modal-store';

/** 1:1 with mobile/lib/ui/widgets/app_feedback_modal/app_feedback_modal.dart. */
const CIRCLE_BG_BY_KIND: Record<ModalFeedbackKind, string> = {
  success: '#DCFCE7',
  error: '#FEE2E2',
  warning: '#FFF7ED',
  info: '#EFF6FF',
};

const CIRCLE_BORDER_BY_KIND: Record<ModalFeedbackKind, string> = {
  success: colors.success,
  error: colors.error,
  warning: colors.warning,
  info: colors.primary,
};

const ICON_BY_KIND: Record<ModalFeedbackKind, AppIconName> = {
  success: 'check',
  error: 'close',
  warning: 'warning',
  info: 'info',
};

function IconCircle({ kind }: { kind: ModalFeedbackKind }) {
  return (
    <View
      style={{
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: CIRCLE_BG_BY_KIND[kind],
        borderWidth: 3,
        borderColor: CIRCLE_BORDER_BY_KIND[kind],
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <AppIcon name={ICON_BY_KIND[kind]} size={36} color={CIRCLE_BORDER_BY_KIND[kind]} />
    </View>
  );
}

export function AppFeedbackModal({
  entry,
  onDismiss,
}: {
  entry: FeedbackModalEntry;
  onDismiss: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { options } = entry;
  const iconWidget = options.icon ?? <IconCircle kind={options.kind} />;

  function confirm() {
    onDismiss();
    options.onConfirm?.();
  }

  function secondaryAction() {
    onDismiss();
    options.onAction?.();
  }

  if (options.position === 'fullscreen') {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
        }}
      >
        {options.showCloseButton ? (
          <Pressable
            onPress={onDismiss}
            style={{ position: 'absolute', top: 16, right: 24, zIndex: 1 }}
          >
            <AppIcon name="close" size={24} color={colors.textMuted} />
          </Pressable>
        ) : null}

        <View
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}
        >
          {iconWidget}
          <View style={{ height: 24 }} />
          <AppText variant="medium" align="center" weight="700">
            {entry.title}
          </AppText>
          <View style={{ height: 10 }} />
          <AppText variant="body" color={colors.textMuted} align="center">
            {entry.message}
          </AppText>
        </View>

        <View style={{ paddingHorizontal: 24, paddingBottom: 24 }}>
          <AppButton label={options.confirmButtonText} expanded radius={100} onPress={confirm} />
          {options.actionLabel ? (
            <>
              <View style={{ height: 10 }} />
              <AppButton
                label={options.actionLabel}
                variant="plain"
                expanded
                radius={100}
                onPress={secondaryAction}
              />
            </>
          ) : null}
        </View>
      </View>
    );
  }

  return (
    <View
      style={{
        marginHorizontal: 24,
        paddingTop: 28,
        paddingHorizontal: 24,
        paddingBottom: 24,
        backgroundColor: colors.background,
        borderRadius: 20,
        alignItems: 'center',
      }}
    >
      {options.showCloseButton ? (
        <Pressable onPress={onDismiss} style={{ alignSelf: 'flex-end', marginBottom: 4 }}>
          <AppIcon name="close" size={22} color={colors.textMuted} />
        </Pressable>
      ) : null}

      {iconWidget}
      <View style={{ height: 20 }} />
      <AppText variant="medium" align="center" weight="700">
        {entry.title}
      </AppText>
      <View style={{ height: 8 }} />
      <AppText variant="body" color={colors.textMuted} align="center">
        {entry.message}
      </AppText>
      <View style={{ height: 24 }} />

      <AppButton label={options.confirmButtonText} expanded radius={100} onPress={confirm} />
      {options.actionLabel ? (
        <>
          <View style={{ height: 10 }} />
          <AppButton
            label={options.actionLabel}
            variant="plain"
            expanded
            radius={100}
            onPress={secondaryAction}
          />
        </>
      ) : null}
    </View>
  );
}
