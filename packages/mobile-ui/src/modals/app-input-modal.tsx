import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '../primitives/app-button/app-button';
import { AppText } from '../primitives/app-text/app-text';
import { AppTextAreaInput } from '../primitives/app-text-area-input/app-text-area-input';
import { AppTextInput } from '../primitives/app-text-input/app-text-input';
import { AppIcon } from '../icons/app-icons';
import { colors } from '../theme/colors';
import type { InputModalEntry } from './modal-store';

/** 1:1 with mobile/lib/ui/widgets/app_input_modal/app_input_modal.dart. */
export function AppInputModal({
  entry,
  onDismiss,
}: {
  entry: InputModalEntry;
  onDismiss: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { options } = entry;
  const [value, setValue] = useState(options.defaultValue ?? '');
  const [validationError, setValidationError] = useState<string>();

  function handleConfirm() {
    if (options.regex && !options.regex.test(value)) {
      setValidationError(options.errorMessage ?? 'Invalid input. Please try again.');
      return;
    }
    onDismiss();
    options.onConfirm?.(value);
  }

  function cancel() {
    options.onCancel?.();
    onDismiss();
  }

  const inputField = options.multiline ? (
    <AppTextAreaInput
      value={value}
      placeholder={options.placeholder}
      maxLength={options.maxLength || undefined}
      errorMessage={validationError}
      onChangeText={(v) => {
        setValue(v);
        setValidationError(undefined);
      }}
    />
  ) : (
    <AppTextInput
      value={value}
      placeholder={options.placeholder}
      maxLength={options.maxLength || undefined}
      secureTextEntry={options.inputType === 'password'}
      keyboardType={
        options.inputType === 'number'
          ? 'numeric'
          : options.inputType === 'email'
            ? 'email-address'
            : 'default'
      }
      errorMessage={validationError}
      startIcon={options.startIcon}
      endIcon={options.endIcon}
      onChangeText={(v) => {
        setValue(v);
        setValidationError(undefined);
      }}
      onSubmitEditing={handleConfirm}
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

        <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 24 }}>
          {options.stepLabel ? (
            <>
              <AppText variant="label" color={colors.textMuted} align="center">
                {options.stepLabel}
              </AppText>
              <View style={{ height: 12 }} />
            </>
          ) : null}
          <View style={{ paddingHorizontal: 8 }}>
            <AppText variant="bodyTitle" align="center" weight="700">
              {entry.title}
            </AppText>
            <View style={{ height: 8 }} />
            <AppText variant="body" color={colors.textMuted} align="center">
              {entry.message}
            </AppText>
          </View>
          <View style={{ height: 28 }} />
          {inputField}
        </View>

        <View style={{ paddingHorizontal: 24, paddingBottom: 24 }}>
          <AppButton
            label={options.confirmButtonText}
            expanded
            radius={100}
            isDisabled={value.length === 0}
            onPress={value.length > 0 ? handleConfirm : undefined}
          />
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
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {options.stepLabel ? (
          <AppText variant="label" color={colors.textMuted} align="left">
            {options.stepLabel}
          </AppText>
        ) : (
          <View style={{ flex: 1 }} />
        )}
        <View style={{ flex: 1 }} />
        {options.showCloseButton ? (
          <Pressable onPress={cancel}>
            <AppIcon name="close" size={22} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>
      {options.showCloseButton || options.stepLabel ? <View style={{ height: 16 }} /> : null}

      <AppText variant="bodyTitle" align="left" weight="700">
        {entry.title}
      </AppText>
      <View style={{ height: 6 }} />
      <AppText variant="body" color={colors.textMuted} align="left">
        {entry.message}
      </AppText>
      <View style={{ height: 20 }} />

      {inputField}
      <View style={{ height: 24 }} />

      <AppButton
        label={options.confirmButtonText}
        expanded
        radius={100}
        isDisabled={value.length === 0}
        onPress={value.length > 0 ? handleConfirm : undefined}
      />
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
