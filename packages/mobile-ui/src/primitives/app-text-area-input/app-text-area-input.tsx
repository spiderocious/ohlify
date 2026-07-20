import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';

import { colors } from '../../theme/colors';

/** 1:1 with mobile/lib/ui/widgets/app_text_area_input/app_text_area_input.dart. */
export interface AppTextAreaInputProps {
  value?: string;
  onChangeText?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  bordered?: boolean;
  borderColor?: string;
  errorMessage?: string;
  maxLength?: number;
  minLines?: number;
  maxLines?: number;
  label?: string;
}

export function AppTextAreaInput({
  value,
  onChangeText,
  placeholder,
  disabled = false,
  bordered = true,
  borderColor = colors.border,
  errorMessage,
  maxLength,
  minLines = 3,
  maxLines = 6,
  label,
}: AppTextAreaInputProps) {
  const [isFocused, setIsFocused] = useState(false);

  const effectiveBorderColor = errorMessage
    ? colors.error
    : isFocused
      ? colors.primary
      : bordered
        ? borderColor
        : 'transparent';

  const showBorder = bordered || Boolean(errorMessage) || isFocused;
  const lineHeight = 22;

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
          backgroundColor: disabled ? colors.surface : colors.background,
          borderRadius: 12,
          borderWidth: showBorder ? (isFocused ? 1.5 : 1) : 0,
          borderColor: showBorder ? effectiveBorderColor : undefined,
          paddingHorizontal: 16,
          paddingVertical: 14,
        }}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textSlate}
          editable={!disabled}
          maxLength={maxLength}
          multiline
          numberOfLines={minLines}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          style={{
            fontFamily: 'MonaSans-Regular',
            fontSize: 16,
            fontWeight: '400',
            color: colors.textPrimary,
            minHeight: lineHeight * minLines,
            maxHeight: lineHeight * maxLines,
            textAlignVertical: 'top',
          }}
        />
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
