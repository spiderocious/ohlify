const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Monorepo support: watch the whole workspace and resolve modules hoisted
// to the workspace root (pnpm workspace, same pattern every other app in
// this Nx monorepo would need for a metro-based tool).
config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];
config.resolver.disableHierarchicalLookup = true;

// react-native-svg-transformer: import '*.svg' as a component instead of a
// static asset (see packages/mobile-ui/src/icons/app-svgs.ts).
const { transformer, resolver } = config;
config.transformer = {
  ...transformer,
  babelTransformerPath: require.resolve('react-native-svg-transformer'),
};
// packages/core and packages/api are consumed as raw TS source (their
// package.json "main"/"exports" point straight at src/index.ts, no build
// step) and use ESM-style relative imports with an explicit ".js" suffix
// (e.g. `export * from './client.js'`) — correct for tsc's "bundler"
// moduleResolution and for Vite (both remap .js -> .ts automatically), but
// Metro takes an explicit extension literally and only looks for a real
// client.js file, which doesn't exist. This previously went unnoticed
// because every existing cross-package import from apps/mobile was a
// `import type` (erased before Metro ever sees it) — usePublicConfig was
// the first real value-level import of @ohlify/api, which is what surfaced
// this. Strip a trailing .js/.jsx and retry each TS-ish extension before
// falling back to Metro's default resolver for everything else.
const TS_RETRY_EXTS = ['.ts', '.tsx', '.js', '.jsx'];
config.resolver = {
  ...resolver,
  assetExts: resolver.assetExts.filter((ext) => ext !== 'svg'),
  sourceExts: [...resolver.sourceExts, 'svg'],
  resolveRequest: (context, moduleName, platform) => {
    if (/\.jsx?$/.test(moduleName)) {
      const withoutExt = moduleName.replace(/\.jsx?$/, '');
      for (const ext of TS_RETRY_EXTS) {
        try {
          return context.resolveRequest(context, `${withoutExt}${ext}`, platform);
        } catch {
          // Try the next extension.
        }
      }
    }
    return context.resolveRequest(context, moduleName, platform);
  },
};

module.exports = withNativeWind(config, { input: './src/shared/styles/global.css' });
