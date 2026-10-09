// CRE-179 legal hold: Metro loads this file on every start/export, even when
// its transform cache is warm (babel.config.js is not re-run then), so the
// real-data flag check lives here too.
require('./scripts/assert-credit-real-data-off');

const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules || {}),
  'motion/react': path.resolve(__dirname, 'shims/motion'),
  'motion': path.resolve(__dirname, 'shims/motion'),
};

// Web-only override: zustand/esm/middleware.mjs uses Vite-style `import.meta.env`,
// which is incompatible with Expo's Hermes web bundler (script tag has no type="module").
// Force the CJS build (which uses process.env.NODE_ENV) on web. iOS/Android already
// resolve via the package.json `react-native` condition, so they are unaffected.
const ZUSTAND_CJS_MAP = {
  'zustand': path.resolve(__dirname, 'node_modules/zustand/index.js'),
  'zustand/middleware': path.resolve(__dirname, 'node_modules/zustand/middleware.js'),
  'zustand/middleware/immer': path.resolve(__dirname, 'node_modules/zustand/middleware/immer.js'),
  'zustand/shallow': path.resolve(__dirname, 'node_modules/zustand/shallow.js'),
  'zustand/vanilla': path.resolve(__dirname, 'node_modules/zustand/vanilla.js'),
  'zustand/vanilla/shallow': path.resolve(__dirname, 'node_modules/zustand/vanilla/shallow.js'),
  'zustand/react': path.resolve(__dirname, 'node_modules/zustand/react.js'),
  'zustand/traditional': path.resolve(__dirname, 'node_modules/zustand/traditional.js'),
};

const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'motion/react' || moduleName === 'motion') {
    return {
      filePath: path.resolve(__dirname, 'shims/motion/index.tsx'),
      type: 'sourceFile',
    };
  }
  if (platform === 'web' && ZUSTAND_CJS_MAP[moduleName]) {
    return {
      filePath: ZUSTAND_CJS_MAP[moduleName],
      type: 'sourceFile',
    };
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
