import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '../../theme/colors';

export interface AppSafeAreaProps {
  children: ReactNode;
  /**
   * Colour painted behind the status bar. Defaults to the brand tint, so the
   * notification area picks up the app's colour on every device instead of
   * showing whatever is underneath.
   */
  statusBarColor?: string;
  /** Colour painted behind the navigation bar / home indicator. */
  navigationBarColor?: string;
}

/**
 * The single place the app deals with system bars.
 *
 * Android 15 forces edge-to-edge and cannot be opted out of, and this app also
 * sets `edgeToEdgeEnabled=true` with transparent system bars — so the window is
 * always full-height and every screen would otherwise be free to draw under the
 * status bar and the navigation keys. That is exactly what kept happening: the
 * tab bar, the chat composer, bottom sheets and toasts each had to remember to
 * claim their own inset, and each was a separate bug when it forgot.
 *
 * This component ends that by reserving both insets once, at the root. Children
 * are laid out strictly between the bars, so a screen can use the full height of
 * its container without ever needing to know a system bar exists.
 *
 * The insets are rendered as painted bands rather than padding on a single view
 * so the status bar area can carry the brand colour while the content area keeps
 * its own background — the bars are tinted, the content is inset, and neither
 * has to compromise.
 *
 * Note this deliberately does NOT use `SafeAreaView` with `edges`. That applies
 * the inset as padding on the same view that holds the content, which makes it
 * impossible to give the bar area a different colour, and it silently does
 * nothing when a parent has already consumed the inset.
 */
export function AppSafeArea({
  children,
  statusBarColor = colors.primary,
  navigationBarColor = colors.navBackground,
}: AppSafeAreaProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: navigationBarColor }}>
      {/* Status bar / notch band. */}
      <View style={{ height: insets.top, backgroundColor: statusBarColor }} />

      {/* Everything the app draws. Sits strictly between the system bars, so
          screens below can treat this as the whole usable viewport. */}
      <View style={{ flex: 1 }}>{children}</View>

      {/* Navigation bar / home indicator band. Zero-height on devices using
          gesture navigation, so nothing is wasted there. */}
      <View style={{ height: insets.bottom, backgroundColor: navigationBarColor }} />
    </View>
  );
}
