import type { SvgProps } from 'react-native-svg';
import { View } from 'react-native';
import { AppSvgs, type AppSvgName } from './app-svgs';

/**
 * Renders any registered custom SVG icon.
 *
 * Source: mobile/lib/ui/widgets/app_svg/app_svg.dart. `color` tints only
 * the paths that opt in via `fill="currentColor"` in the source SVG (the nav
 * glyphs) — passed as the `color` prop on the root <Svg> for native (where
 * react-native-svg resolves `currentColor` against it directly) AND by
 * wrapping the icon in a plain `View` with `style={{ color }}` for web.
 * react-native-svg's web shim spreads an unrecognized `color` prop as a
 * literal DOM *attribute* on the <svg> tag (not CSS), which does nothing —
 * SVG's `currentColor` only resolves through actual CSS `color` inheritance.
 * A wrapping View reliably becomes a real DOM element with that CSS
 * property set, so the child <path fill="currentColor"> inherits it
 * regardless of react-native-svg's own prop handling. Multi-tone assets
 * (the logo, the NG flag) keep their own hardcoded fills untouched since
 * they never reference currentColor. This mirrors Flutter's per-asset
 * choice of whether ColorFilter.mode(...) is applied, rather than
 * Flutter's blanket tint-everything behavior.
 *
 * `width`/`height` independently override `size` — lets non-square assets
 * (e.g. the logo wordmark, viewBox 82x28) be sized by height alone rather
 * than forced into a square box.
 */
interface AppSvgProps extends Omit<SvgProps, 'width' | 'height'> {
  name: AppSvgName;
  size?: number;
  width?: number;
  height?: number;
  color?: string;
}

export function AppSvg({ name, size = 24, width, height, color, ...rest }: AppSvgProps) {
  const Icon = AppSvgs[name];
  const icon = <Icon width={width ?? size} height={height ?? size} color={color} {...rest} />;
  return color ? (
    <View style={[{ color } as never, { width: width ?? size, height: height ?? size }]}>
      {icon}
    </View>
  ) : (
    icon
  );
}
