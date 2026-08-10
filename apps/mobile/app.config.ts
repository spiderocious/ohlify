import type { ExpoConfig } from 'expo/config';

/**
 * Expo app config. App identifiers (`com.ohlify.ohlify`) and permission
 * strings are copied verbatim from the Flutter app:
 *  - Android: mobile/android/app/build.gradle.kts (applicationId)
 *  - iOS: mobile/ios/Runner.xcodeproj/project.pbxproj (PRODUCT_BUNDLE_IDENTIFIER)
 *  - Permissions: mobile/android/app/src/main/AndroidManifest.xml,
 *    mobile/ios/Runner/Info.plist
 */
const config: ExpoConfig = {
  name: 'Ohlify',
  slug: 'ohlify',
  scheme: 'ohlify',
  version: '1.0.0',
  orientation: 'default',
  userInterfaceStyle: 'light',
  icon: './assets/icon.png',
  assetBundlePatterns: ['**/*'],
  ios: {
    bundleIdentifier: 'com.ohlify.ohlify',
    supportsTablet: true,
    infoPlist: {
      NSMicrophoneUsageDescription:
        'Ohlify needs your microphone for voice and video calls.',
      NSCameraUsageDescription: 'Ohlify needs your camera for video calls.',
      UIRequiresFullScreen: false,
    },
  },
  android: {
    package: 'com.ohlify.ohlify',
    // Firebase client config (FCM). Gitignored — cloud EAS builds get it
    // via an EAS file secret; local prebuild reads it straight from disk.
    googleServicesFile: './google-services.json',
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#4A3FE5',
    },
    permissions: [
      'RECORD_AUDIO',
      'CAMERA',
      'MODIFY_AUDIO_SETTINGS',
      'INTERNET',
      // Android 13+ runtime notification permission (prompted on login).
      'POST_NOTIFICATIONS',
      // Full-screen incoming-call UI over the lock screen. Auto-granted
      // for calling apps; Play can revoke it for non-calling apps only.
      'USE_FULL_SCREEN_INTENT',
    ],
  },
  web: {
    favicon: './assets/favicon.png',
    bundler: 'metro',
  },
  plugins: [
    // Wires the google-services gradle plugin at prebuild (FCM).
    '@react-native-firebase/app',
    [
      'expo-splash-screen',
      {
        // A centred wordmark on a solid brand background, NOT a full-bleed
        // artwork.
        //
        // Android 12+ routes the splash through the platform SplashScreen API,
        // which ignores `resizeMode` entirely: it always draws the image as a
        // small centred icon over windowSplashScreenBackground, masked to a
        // circle. Feeding it the old 390x844 full-screen artwork meant Android
        // squashed a whole screen into an 864x864 square — mostly empty
        // background with a tiny mark, which is why launch looked like a blank
        // field with a small block in the middle.
        //
        // `splash-icon.png` is the wordmark alone, pre-padded to sit inside the
        // circular mask, so the same asset works on both the modern Android
        // path and the iOS/Android-11 `cover` path.
        image: './assets/splash-icon.png',
        resizeMode: 'contain',
        backgroundColor: '#4A3FE5',
        // iOS has no icon-in-circle constraint, so it can show the real
        // artwork: `splash-full.png` is the JS splash composed into one image
        // (hex-pattern background + centred wordmark, same 160pt sizing).
        // Native and JS splash are pixel-identical there; Android 12+ stays
        // wordmark-on-indigo because the platform allows nothing else.
        ios: {
          image: './assets/splash-full.png',
          resizeMode: 'cover',
          backgroundColor: '#4A3FE5',
        },
      },
    ],
    [
      'expo-build-properties',
      {
        ios: { newArchEnabled: true },
        // usesCleartextTraffic: dev builds talk to the LAN backend over
        // plain http (release builds block it by default). Drop when the
        // app points at the https production API.
        android: { newArchEnabled: true, usesCleartextTraffic: true },
      },
    ],
    'expo-font',
    'expo-secure-store',
    'expo-image',
    [
      'expo-image-picker',
      {
        photosPermission: 'Ohlify needs access to your photos to upload identity documents and a selfie.',
        cameraPermission: 'Ohlify needs your camera to take a selfie for identity verification.',
      },
    ],
    '@react-native-community/datetimepicker',
    // Notifee ships its Android artifact inside the npm package instead of a
    // public Maven repo, and provides no config plugin. Without this the
    // generated build.gradle cannot resolve `app.notifee:core`.
    './plugins/with-notifee-repo',
  ],
  extra: {
    eas: {
      projectId: 'fe98feb6-a953-46b7-9abc-3d917e9b2915',
    },
  },
};

export default config;
