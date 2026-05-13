/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The marketing site reuses `@ohlify/ui` + `@ohlify/core` directly from
  // the monorepo workspace as TS source. Next won't transpile workspace
  // packages by default, so we opt them in here. Cheaper than pre-
  // building the packages and lets HMR pick up component edits during
  // dev without a separate watcher.
  transpilePackages: ['@ohlify/ui', '@ohlify/core'],
  // Marketing pages are mostly static; opt into the modern image
  // formats but keep the loader local — Netlify's image CDN handles
  // the heavy lifting on prod via the @netlify/plugin-nextjs adapter.
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  // Resolve `.js` import specifiers from workspace TS sources. The
  // monorepo packages use the `import './foo.js'` convention even
  // though the actual file is `foo.ts` — that's the canonical way to
  // author dual-ESM-compatible TS, but Next's webpack resolver doesn't
  // strip the suffix the way Vite does without an explicit alias.
  webpack: (config) => {
    config.resolve.extensionAlias = {
      ...(config.resolve.extensionAlias ?? {}),
      '.js': ['.ts', '.tsx', '.js'],
    };
    return config;
  },
};

export default nextConfig;
