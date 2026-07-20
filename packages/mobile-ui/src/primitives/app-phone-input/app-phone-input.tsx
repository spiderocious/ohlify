import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';

import { AppSvg } from '../../icons/app-svg';
import { colors } from '../../theme/colors';

/**
 * 1:1 with mobile/lib/ui/widgets/app_phone_input/app_phone_input.dart.
 * NG-only dial code prefix for now, matching the Dart source.
 */
const DIAL_CODE = '+234';

export interface AppPhoneInputProps {
  value?: string;
  onChangeText?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  bordered?: boolean;
  borderColor?: string;
  errorMessage?: string;
  label?: string;
  maxLength?: number;
  testID?: string;
}

export function AppPhoneInput({
  value,
  onChangeText,
  placeholder = '000 000 0000',
  disabled = false,
  bordered = true,
  borderColor = colors.border,
  errorMessage,
  label,
  maxLength = 10,
  testID,
}: AppPhoneInputProps) {
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
          paddingLeft: 14,
        }}
      >
        <AppSvg name="flagNg" size={22} />
        <Text
          style={{
            fontFamily: 'MonaSans-Regular',
            fontSize: 16,
            fontWeight: '400',
            color: colors.textPrimary,
            marginLeft: 6,
          }}
        >
          {DIAL_CODE}
        </Text>
        <View
          style={{ width: 1, height: 24, backgroundColor: colors.border, marginHorizontal: 8 }}
        />
        <TextInput
          value={value}
          onChangeText={(text) => onChangeText?.(text.replace(/\D/g, ''))}
          placeholder={placeholder}
          placeholderTextColor={colors.textSlate}
          editable={!disabled}
          keyboardType="phone-pad"
          maxLength={maxLength}
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
