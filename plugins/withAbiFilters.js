const { withGradleProperties, withAppBuildGradle } = require('@expo/config-plugins');

/**
 * Restreint les ABIs natives aux boîtiers Android TV (ARM uniquement).
 * Retire x86 / x86_64 → ~78 Mo économisés sur l'APK release
 * (libnode.so x86_64 ~63 Mo non compressé + libs x86 RN/Hermes).
 *
 * Agit à deux niveaux, car `reactNativeArchitectures` seul ne strippe pas
 * toujours les .so prébuildés des AAR (ex: nodejs-mobile libnode.so) :
 *   1. gradle.properties → reactNativeArchitectures (évite de compiler x86)
 *   2. app/build.gradle  → ndk.abiFilters (garantit l'exclusion du packaging)
 */
const ABIS = ['armeabi-v7a', 'arm64-v8a'];

function withReactNativeArchitectures(config) {
  return withGradleProperties(config, (cfg) => {
    cfg.modResults = cfg.modResults.filter(
      (item) => !(item.type === 'property' && item.key === 'reactNativeArchitectures')
    );
    cfg.modResults.push({
      type: 'property',
      key: 'reactNativeArchitectures',
      value: ABIS.join(','),
    });
    return cfg;
  });
}

function withAbiFiltersGradle(config) {
  return withAppBuildGradle(config, (cfg) => {
    const src = cfg.modResults.contents;
    if (src.includes('abiFilters')) return cfg; // déjà présent

    const ndkBlock =
      `\n        ndk {\n` +
      `            abiFilters ${ABIS.map((a) => `'${a}'`).join(', ')}\n` +
      `        }\n`;

    // Injecte le bloc ndk { } à la fin du defaultConfig { }
    cfg.modResults.contents = src.replace(
      /(defaultConfig\s*\{)/,
      `$1${ndkBlock}`
    );
    return cfg;
  });
}

module.exports = function withAbiFilters(config) {
  config = withReactNativeArchitectures(config);
  config = withAbiFiltersGradle(config);
  return config;
};
