// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// ── Resolver tweaks ─────────────────────────────────────────────────────────

// Allow .mjs files to be resolved (some packages ship ESM as .mjs)
config.resolver.sourceExts = [
  ...config.resolver.sourceExts.filter((e) => e !== 'mjs'),
  'mjs',
];

// Force query-string v7 (CJS) — prevents any hoisted ESM v9 from leaking in
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  'query-string': require.resolve('query-string'),
};

// ── Transformer tweaks ───────────────────────────────────────────────────────

// Transform @react-navigation/core lib/module files through Babel so that
// their "export function" / "import * as" ESM syntax is correctly converted
// to CommonJS for the Hermes/web platform targets.
const originalTransformIgnorePatterns =
  config.transformer?.transformIgnorePatterns || [
    'node_modules/(?!(' +
      '@react-native|' +
      'react-native|' +
      'expo|' +
      '@expo|' +
      '@unimodules' +
    ')/)',
  ];

config.transformer = {
  ...config.transformer,
  // Transform the react-navigation core module files (they ship as ESM)
  transformIgnorePatterns: [
    'node_modules/(?!(' +
      'react-native|' +
      '@react-native|' +
      'expo|' +
      '@expo|' +
      'expo-router|' +
      '@react-navigation|' +
      '@unimodules|' +
      'zustand|' +
      '@tanstack' +
    ')/)',
  ],
};

module.exports = config;
