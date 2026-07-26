import { Pressable } from 'react-native';

import { amountVisibility, useAmountsHidden } from '../../money/amount-visibility';
import { colors } from '../../theme/colors';
import { AppIcon } from '../../icons/app-icons';

export interface AmountVisibilityToggleProps {
  size?: number;
  color?: string;
}

/**
 * The eye beside a balance. One tap masks every amount in the app.
 *
 * Deliberately unlabelled — the icon is universally understood here, and a
 * "hide balance" label sitting next to a balance would be its own kind of noise.
 */
export function AmountVisibilityToggle({
  size = 20,
  color = colors.textWhite,
}: AmountVisibilityToggleProps) {
  const hidden = useAmountsHidden();

  return (
    <Pressable
      onPress={() => amountVisibility.toggle()}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel={hidden ? 'Show amounts' : 'Hide amounts'}
      style={{ padding: 4 }}
    >
      <AppIcon name={hidden ? 'eyeOff' : 'eye'} size={size} color={color} />
    </Pressable>
  );
}
