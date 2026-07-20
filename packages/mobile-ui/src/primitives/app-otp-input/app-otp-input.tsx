import { useEffect, useRef, useState } from 'react';
import { Text, TextInput, View } from 'react-native';

import { colors } from '../../theme/colors';

/** 1:1 with mobile/lib/ui/widgets/app_otp_input/app_otp_input.dart. */
export interface AppOtpInputProps {
  length?: number;
  autoFocus?: boolean;
  onComplete?: (value: string) => void;
  onChangeText?: (value: string) => void;
  disabled?: boolean;
  errorMessage?: string;
  bordered?: boolean;
  borderColor?: string;
}

export function AppOtpInput({
  length = 6,
  autoFocus = true,
  onComplete,
  onChangeText,
  disabled = false,
  errorMessage,
  borderColor = colors.border,
}: AppOtpInputProps) {
  const [digits, setDigits] = useState<string[]>(() => Array(length).fill(''));
  const inputRefs = useRef<Array<TextInput | null>>([]);

  // Only on mount, matching the Dart source's addPostFrameCallback-once behavior.
  useEffect(() => {
    if (autoFocus) inputRefs.current[0]?.focus();
  }, [autoFocus]);

  function onDigitChange(index: number, value: string) {
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[index] = digit;
    setDigits(next);

    if (digit && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    } else if (digit && index === length - 1) {
      inputRefs.current[index]?.blur();
    }

    const full = next.join('');
    onChangeText?.(full);
    if (full.length === length) onComplete?.(full);
  }

  function onKeyPress(index: number, key: string) {
    if (key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  return (
    <View>
      <View className="flex-row justify-center">
        {digits.map((digit, i) => (
          <View key={i} style={{ flex: 1, marginRight: i < length - 1 ? 10 : 0 }}>
            <OtpCell
              ref={(el) => {
                inputRefs.current[i] = el;
              }}
              value={digit}
              disabled={disabled}
              hasError={Boolean(errorMessage)}
              borderColor={borderColor}
              onChangeText={(v) => onDigitChange(i, v)}
              onKeyPress={(k) => onKeyPress(i, k)}
            />
          </View>
        ))}
      </View>
      {errorMessage ? (
        <Text
          style={{
            fontFamily: 'MonaSans-Regular',
            fontSize: 12,
            color: colors.error,
            marginTop: 6,
            textAlign: 'center',
          }}
        >
          {errorMessage}
        </Text>
      ) : null}
    </View>
  );
}

interface OtpCellProps {
  value: string;
  disabled: boolean;
  hasError: boolean;
  borderColor: string;
  onChangeText: (value: string) => void;
  onKeyPress: (key: string) => void;
}

function OtpCell({
  value,
  disabled,
  hasError,
  borderColor,
  onChangeText,
  onKeyPress,
  ref,
}: OtpCellProps & { ref: (el: TextInput | null) => void }) {
  const [isFocused, setIsFocused] = useState(false);
  const effectiveBorderColor = hasError ? colors.error : isFocused ? colors.primary : borderColor;

  return (
    <View
      style={{
        height: 56,
        borderRadius: 12,
        backgroundColor: disabled ? colors.surface : colors.background,
        borderWidth: isFocused ? 1.5 : 1,
        borderColor: effectiveBorderColor,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <TextInput
        ref={ref}
        value={value}
        onChangeText={onChangeText}
        onKeyPress={({ nativeEvent }) => onKeyPress(nativeEvent.key)}
        editable={!disabled}
        keyboardType="number-pad"
        textAlign="center"
        maxLength={1}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        style={{
          fontFamily: 'MonaSans-SemiBold',
          fontSize: 20,
          fontWeight: '600',
          color: colors.textPrimary,
          width: '100%',
          textAlign: 'center',
        }}
      />
    </View>
  );
}
