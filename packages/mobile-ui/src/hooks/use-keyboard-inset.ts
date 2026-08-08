import { useEffect, useRef, useState } from 'react';
import { Keyboard, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * The space that must be reserved at the bottom of the screen: the software
 * keyboard when it is open, otherwise the system navigation bar.
 *
 * ## Why not KeyboardAvoidingView
 *
 * `KeyboardAvoidingView` is usually written as
 * `behavior={Platform.OS === 'ios' ? 'padding' : undefined}`. On Android that
 * evaluates to `undefined`, which makes the component a no-op — it renders a
 * plain View and moves nothing, leaving the layout entirely to the native
 * `adjustResize`.
 *
 * ## Why `adjustResize` alone is not enough here
 *
 * `android:windowSoftInputMode="adjustResize"` is set, but this app's theme
 * makes the status and navigation bars transparent (see
 * android/app/src/main/res/values/styles.xml), so the window is laid out
 * edge-to-edge and stays full-height. There is nothing for `adjustResize` to
 * shrink, and the keyboard is simply painted over the bottom of the window —
 * which is why an input anchored to the bottom disappears behind it.
 *
 * `edgeToEdgeEnabled=true` in android/gradle.properties confirms this. Under
 * it, `keyboardDidShow` reports a height that *excludes* the navigation bar
 * even though the keyboard is drawn over it, so the reserved space must be the
 * reported height plus the bottom inset.
 *
 * Two earlier revisions of this hook got that wrong in opposite directions:
 * one used the raw reported height (short by the nav bar), the other subtracted
 * a "how much has the window already shrunk" term that is meaningless on an
 * edge-to-edge window. Both left the composer under the keys.
 *
 * ## Why the keyboard and nav-bar insets are not added together
 *
 * An open keyboard is drawn over the navigation bar, so the nav bar occupies no
 * extra space at that moment. Adding both would leave a nav-bar-sized gap
 * between the input and the keyboard. The larger of the two is correct.
 */
export function useKeyboardInset(): number {
  const insets = useSafeAreaInsets();
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Kept in a ref so the listener below, registered once, always reads the
  // current inset instead of the one captured on first render.
  const insetsRef = useRef(insets.bottom);
  insetsRef.current = insets.bottom;

  useEffect(() => {
    // `keyboardWillShow` fires ahead of the animation on iOS, so the layout
    // moves in step with the keyboard. Android only emits `keyboardDidShow`.
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (event) => {
      // On Android the reported height excludes the navigation bar, but the
      // keyboard is drawn *over* it — so the true covered height is the
      // reported height plus the bottom inset. Padding by the reported value
      // alone falls short by exactly the nav bar, which left only the top
      // sliver of the composer visible above the keys.
      //
      // `insetsRef` rather than `insets.bottom` directly: this listener is
      // registered once, so closing over the render-time value would freeze the
      // first inset the hook ever saw.
      const extra = Platform.OS === 'android' ? insetsRef.current : 0;
      setKeyboardHeight(event.endCoordinates.height + extra);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return Math.max(keyboardHeight, insets.bottom);
}
