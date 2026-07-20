import { Pressable, View } from 'react-native';

import { AppIcon } from '../../icons/app-icons';
import { colors } from '../../theme/colors';
import { AppTextInput } from '../app-text-input/app-text-input';

/** 1:1 with mobile/lib/ui/widgets/app_search_bar/app_search_bar.dart. */
export interface AppSearchBarProps {
  placeholder?: string;
  value?: string;
  onChangeText?: (value: string) => void;
  onPress?: () => void;
  /** When true the field is not editable — tapping fires onPress instead. */
  readOnly?: boolean;
  autoFocus?: boolean;
}

export function AppSearchBar({
  placeholder = 'Search for professional',
  value,
  onChangeText,
  onPress,
  readOnly = false,
  autoFocus = false,
}: AppSearchBarProps) {
  const field = (
    <AppTextInput
      value={value}
      placeholder={placeholder}
      startIcon={<AppIcon name="search" size={18} color={colors.textMuted} />}
      onChangeText={onChangeText}
      autoFocus={autoFocus}
    />
  );

  if (!readOnly) return field;

  return (
    <Pressable onPress={onPress}>
      <View pointerEvents="none">{field}</View>
    </Pressable>
  );
}
