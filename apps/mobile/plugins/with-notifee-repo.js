const { withProjectBuildGradle } = require('expo/config-plugins');

/**
 * Registers Notifee's bundled Maven repository.
 *
 * `@notifee/react-native` does not publish `app.notifee:core` to Maven Central
 * or Google — it ships the artifact inside the npm package, under
 * `android/libs`, and expects the consuming project to add that directory as a
 * repository. Notifee's own docs have you paste this into `android/build.gradle`
 * by hand.
 *
 * A hand-edit does not survive `expo prebuild`, which regenerates `android/`
 * from scratch — and `android/` is gitignored here, so CI regenerates it on
 * every run. Without this plugin the build fails with:
 *
 *   Could not find any matches for app.notifee:core:+
 *
 * Notifee ships no config plugin of its own, hence this local one.
 */
const NOTIFEE_REPO = `
    maven {
      // Notifee's Android artifact lives inside the npm package rather than a
      // public Maven repo. Resolved from the React Native root so it works in a
      // pnpm workspace, where node_modules is hoisted above apps/mobile.
      url new File(["node", "--print", "require.resolve('@notifee/react-native/package.json')"].execute(null, rootDir).text.trim(), "../android/libs")
    }`;

module.exports = function withNotifeeRepo(config) {
  return withProjectBuildGradle(config, (cfg) => {
    if (cfg.modResults.language !== 'groovy') return cfg;
    if (cfg.modResults.contents.includes('@notifee/react-native/package.json')) return cfg;

    // Insert into `allprojects.repositories`, which is what app-module
    // dependency resolution actually reads.
    cfg.modResults.contents = cfg.modResults.contents.replace(
      /allprojects\s*\{\s*repositories\s*\{/,
      (match) => `${match}${NOTIFEE_REPO}`,
    );
    return cfg;
  });
};
