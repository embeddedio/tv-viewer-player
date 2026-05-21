const { withAndroidManifest } = require('@expo/config-plugins');

/**
 * Ajoute MANAGE_EXTERNAL_STORAGE + flags legacy storage dans le manifest Android.
 * Nécessaire pour que les écritures dans Documents/ fonctionnent sur Android 11+.
 */
module.exports = function withAllFilesAccess(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;

    // Namespace tools requis pour tools:ignore
    if (!manifest.$['xmlns:tools']) {
      manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
    }

    // Ajouter tools:ignore="ScopedStorage" sur MANAGE_EXTERNAL_STORAGE
    const perms = manifest['uses-permission'] || [];
    for (const p of perms) {
      if (p.$['android:name'] === 'android.permission.MANAGE_EXTERNAL_STORAGE') {
        p.$['tools:ignore'] = 'ScopedStorage';
      }
    }

    if (manifest.application && manifest.application[0]) {
      const app = manifest.application[0];
      app.$['android:requestLegacyExternalStorage'] = 'true';
      app.$['android:preserveLegacyExternalStorage'] = 'true';
      app.$['android:largeHeap'] = 'true';
      app.$['android:usesCleartextTraffic'] = 'true';
    }

    return cfg;
  });
};
