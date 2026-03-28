const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

// Monorepo root (two levels up from apps/mobile)
const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Watch the entire monorepo so Metro can resolve workspace packages (@navaja/shared, etc.)
config.watchFolders = [monorepoRoot];

// Allow Metro to follow pnpm symlinks
config.resolver = {
  ...config.resolver,
  unstable_enableSymlinks: true,
  // Search node_modules from both the app and the monorepo root
  nodeModulesPaths: [
    path.resolve(projectRoot, 'node_modules'),
    path.resolve(monorepoRoot, 'node_modules'),
  ],
};

module.exports = withNativeWind(config);
