import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '../primitives/app-button/app-button';
import { AppText } from '../primitives/app-text/app-text';
import { AppIcon, type AppIconName } from '../icons/app-icons';
import { colors } from '../theme/colors';
import type { ConfirmationModalEntry, ModalConfirmationKind } from './modal-store';

/** 1:1 with mobile/lib/ui/widgets/app_confirmation_modal/app_confirmation_modal.dart. */
const CIRCLE_BG_BY_KIND: Record<ModalConfirmationKind, string> = {
  neutral: '#F3F4F6',
  success: '#DCFCE7',
  error: '#FEE2E2',
  warning: '#FFF7ED',
  info: '#EFF6FF',
};

const CIRCLE_BORDER_BY_KIND: Record<ModalConfirmationKind, string> = {
  neutral: colors.border,
  success: colors.success,
  error: colors.error,
  warning: colors.warning,
  info: colors.primary,
};

const ICON_BY_KIND: Record<ModalConfirmationKind, AppIconName> = {
  neutral: 'info',
  success: 'check',
  error: 'close',
  warning: 'warning',
  info: 'info',
};

function IconCircle({ kind }: { kind: ModalConfirmationKind }) {
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

function DestructiveButton({
  label,
  isLoading,
  onPress,
}: {
  label: string;
  isLoading: boolean;
  onPress: () => void;
}) {
  return (
    <AppButton
      label={label}
      isLoading={isLoading}
      expanded
      radius={100}
      onPress={onPress}
      style={{ backgroundColor: colors.danger }}
    />
  );
}

export function AppConfirmationModal({
  entry,
  onDismiss,
}: {
  entry: ConfirmationModalEntry;
  onDismiss: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { options } = entry;
  const iconWidget = options.icon ?? (options.showIcon ? <IconCircle kind={options.kind} /> : null);

  function confirm() {
    options.onConfirm?.();
    if (!options.isLoading) onDismiss();
  }

  function cancel() {
    options.onCancel?.();
    onDismiss();
  }

  const ConfirmButton = options.destructive ? (
    <DestructiveButton
      label={options.confirmButtonText}
      isLoading={options.isLoading}
      onPress={confirm}
    />
  ) : (
    <AppButton
      label={options.confirmButtonText}
      isLoading={options.isLoading}
      expanded
      radius={100}
      onPress={confirm}
    />
  );

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
            onPress={cancel}
            style={{ position: 'absolute', top: 16, right: 24, zIndex: 1 }}
          >
            <AppIcon name="close" size={24} color={colors.textMuted} />
          </Pressable>
        ) : null}

        <View
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}
        >
          {iconWidget ? (
            <>
              {iconWidget}
              <View style={{ height: 24 }} />
            </>
          ) : null}
          <AppText variant="medium" align="center" weight="700">
            {entry.title}
          </AppText>
          <View style={{ height: 10 }} />
          <AppText variant="body" color={colors.textMuted} align="center">
            {entry.message}
          </AppText>
        </View>

        <View style={{ paddingHorizontal: 24, paddingBottom: 24 }}>
          {options.showCancelButton ? (
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <AppButton
                  label={options.cancelButtonText}
                  variant="outline"
                  expanded
                  radius={100}
                  onPress={cancel}
                />
              </View>
              <View style={{ flex: 1 }}>{ConfirmButton}</View>
            </View>
          ) : (
            ConfirmButton
          )}
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
        <Pressable onPress={cancel} style={{ alignSelf: 'flex-end', marginBottom: 4 }}>
          <AppIcon name="close" size={22} color={colors.textMuted} />
        </Pressable>
      ) : null}

      {iconWidget ? (
        <>
          {iconWidget}
          <View style={{ height: 20 }} />
        </>
      ) : null}

      <AppText variant="medium" align="center" weight="700">
        {entry.title}
      </AppText>
      <View style={{ height: 8 }} />
      <AppText variant="body" color={colors.textMuted} align="center">
        {entry.message}
      </AppText>
      <View style={{ height: 24 }} />

      {ConfirmButton}
      {options.showCancelButton ? (
        <>
          <View style={{ height: 10 }} />
          <AppButton
            label={options.cancelButtonText}
            variant="outline"
            expanded
            radius={100}
            onPress={cancel}
          />
        </>
      ) : null}
    </View>
  );
}
