import { Image, Pressable, Text, View } from 'react-native';

import { appVersion } from './boot-guard';

/**
 * Shown when the app cannot boot.
 *
 * Deliberately built from bare `react-native` primitives with inline styles and
 * literal colours: this screen has to render when module evaluation has already
 * failed, so it must not import the theme, the UI kit, fonts, or anything else
 * that could be the very thing that threw.
 *
 * The copy says "out of date" rather than naming the real fault. A user cannot
 * act on "EXPO_PUBLIC_API_BASE_URL is missing", and every cause we can reach
 * here — bad build config, an incompatible bundle — is fixed by shipping a new
 * version. The precise error still goes to Sentry, tagged `boot_failure`, which
 * is where it is actually useful.
 */
interface BootFailureScreenProps {
  /**
   * Only supplied when a retry could plausibly help (a transient runtime
   * fault). A bad build config is baked into the bundle, so retrying re-reads
   * the same broken value forever — offering the button there would be a lie.
   */
  onRetry?: (() => void) | undefined;
  /** `registerRootComponent` injects Expo's InitialProps; accepted and ignored. */
  exp?: unknown;
}

export function BootFailureScreen({ onRetry }: BootFailureScreenProps) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
      }}
    >
      <Image
        source={require('../../../assets/icon.png')}
        style={{ width: 88, height: 88, borderRadius: 20, marginBottom: 32 }}
        resizeMode="contain"
      />

      <Text
        style={{
          fontSize: 22,
          fontWeight: '700',
          color: '#111827',
          textAlign: 'center',
          marginBottom: 12,
        }}
      >
        App out of date
      </Text>

      <Text
        style={{
          fontSize: 15,
          lineHeight: 22,
          color: '#6B7280',
          textAlign: 'center',
          marginBottom: 28,
        }}
      >
        Please update the app to continue.
      </Text>

      <View
        style={{
          backgroundColor: '#F7F6FF',
          borderRadius: 10,
          paddingVertical: 10,
          paddingHorizontal: 16,
          marginBottom: 32,
        }}
      >
        <Text style={{ fontSize: 13, color: '#807E7E' }}>Current version — {appVersion()}</Text>
      </View>

      {onRetry ? (
        <Pressable
          onPress={onRetry}
          style={{
            backgroundColor: '#4A3FE5',
            borderRadius: 999,
            paddingVertical: 16,
            paddingHorizontal: 48,
          }}
        >
          <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600' }}>Try again</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
