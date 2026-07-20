import { useState, type ReactNode } from 'react';
import {
  Text,
  TextInput,
  View,
  type KeyboardTypeOptions,
  type ReturnKeyTypeOptions,
} from 'react-native';

import { colors } from '../../theme/colors';

/**
 * Shared text input. 1:1 with
 * mobile/lib/ui/widgets/app_text_input/app_text_input.dart — border, focus,
 * error, icon, and char-filtering behavior all mirrored.
 */
export type CharSupported = 'all' | 'number' | 'text' | 'textWithEmoji';

export interface AppTextInputProps {
  value?: string;
  onChangeText?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  bordered?: boolean;
  borderColor?: string;
  errorMessage?: string;
  startIcon?: ReactNode;
  endIcon?: ReactNode;
  maxLength?: number;
  charSupported?: CharSupported;
  secureTextEntry?: boolean;
  keyboardType?: KeyboardTypeOptions;
  returnKeyType?: ReturnKeyTypeOptions;
  onSubmitEditing?: () => void;
  label?: string;
  autoFocus?: boolean;
  testID?: string;
}

const TEXT_FILTER_REGEX: Partial<Record<CharSupported, RegExp>> = {
  number: /[^0-9]/g,
  text: /[^a-zA-Z\s]/g,
};

function filterText(value: string, charSupported: CharSupported): string {
  const pattern = TEXT_FILTER_REGEX[charSupported];
  return pattern ? value.replace(pattern, '') : value;
}

export function AppTextInput({
  value,
  onChangeText,
  placeholder,
  disabled = false,
  bordered = true,
  borderColor = colors.border,
  errorMessage,
  startIcon,
  endIcon,
  maxLength,
  charSupported = 'all',
  secureTextEntry = false,
  keyboardType,
  returnKeyType,
  onSubmitEditing,
  label,
  autoFocus = false,
  testID,
}: AppTextInputProps) {
  const [isFocused, setIsFocused] = useState(false);

  const effectiveBorderColor = errorMessage
    ? colors.error
    : isFocused
      ? colors.primary
      : bordered
        ? borderColor
        : 'transparent';

  const showBorder = bordered || Boolean(errorMessage) || isFocused;

  return (
    <View>
      {label ? (
        <Text
          style={{
            fontFamily: 'MonaSans-Medium',
            fontSize: 13,
            fontWeight: '500',
            color: colors.textPrimary,
            marginBottom: 6,
          }}
        >
          {label}
        </Text>
      ) : null}

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: disabled ? colors.surface : colors.background,
          borderRadius: 12,
          borderWidth: showBorder ? (isFocused ? 1.5 : 1) : 0,
          borderColor: showBorder ? effectiveBorderColor : undefined,
          paddingHorizontal: 16,
        }}
      >
        {startIcon ? <View style={{ marginRight: 8 }}>{startIcon}</View> : null}
        <TextInput
          value={value}
          onChangeText={(text) => onChangeText?.(filterText(text, charSupported))}
          placeholder={placeholder}
          placeholderTextColor={colors.textSlate}
          editable={!disabled}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          returnKeyType={returnKeyType}
          autoFocus={autoFocus}
          maxLength={maxLength}
          onSubmitEditing={onSubmitEditing}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          testID={testID}
          style={{
            flex: 1,
            fontFamily: 'MonaSans-Regular',
            fontSize: 16,
            fontWeight: '400',
            color: colors.textPrimary,
            paddingVertical: 14,
          }}
        />
        {endIcon ? <View style={{ marginLeft: 8 }}>{endIcon}</View> : null}
      </View>

      {errorMessage ? (
        <Text
          style={{
            fontFamily: 'MonaSans-Regular',
            fontSize: 12,
            color: colors.error,
            marginTop: 6,
          }}
        >
          {errorMessage}
        </Text>
      ) : null}
    </View>
  );
}
