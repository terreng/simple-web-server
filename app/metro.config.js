const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * Note: react-native-windows and react-native-macos both provide their own
 * platform entries; the default config picks them up from the installed
 * out-of-tree platform packages. Keep the Rust workspace out of Metro's watch
 * folders so file-watching stays cheap.
 */
const config = {
  resolver: {
    blockList: [/rust-server\/target\/.*/, /\/windows\/.*/, /\/macos\/.*/],
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
