#!/bin/bash
#
# Génère l'APK release (signé debug.keystore → installable) et l'installe sur le boîtier.
#
# Usage :
#   ./build-release.sh                  # build release + install sur $DEVICE + affiche le chemin
#   ./build-release.sh 10.42.0.99:5555  # cible un boîtier précis (ou export DEVICE=...)
#   SKIP_INSTALL=1 ./build-release.sh   # build seulement, pas d'install
#   SYNC=1 ./build-release.sh           # rsync server/ → nodejs-assets/ avant le build
#
set -e

# --- Config (surchargeable par variables d'env) ---
ADB="${ADB:-$HOME/Android/Sdk/platform-tools/adb}"
DEVICE="${1:-${DEVICE:-10.42.0.99:5555}}"
PACKAGE="${PACKAGE:-com.tvviewer.dev}"
APK="android/app/build/outputs/apk/release/app-release.apk"

# adb du PATH en repli si le chemin par défaut n'existe pas
if [ ! -x "$ADB" ]; then ADB="$(command -v adb || echo adb)"; fi

# --- Sync serveur embarqué (optionnel) ---
if [ "$SYNC" = "1" ]; then
  echo "→ Sync server/ → nodejs-assets/ ..."
  ./sync-node-server.sh
else
  echo "ℹ  Si tu as modifié server/, relance avec : SYNC=1 ./build-release.sh"
fi

# --- Prebuild si le dossier android n'existe pas ---
if [ ! -d "android" ]; then
  echo "→ Prebuild..."
  EXPO_TV=1 expo prebuild
fi

# --- Build APK release via Gradle ---
echo "→ Build Gradle (release)..."
cd android && ./gradlew app:assembleRelease
cd ..

# --- Chemin absolu du release généré ---
APK_PATH="$(cd "$(dirname "$APK")" && pwd)/$(basename "$APK")"
if [ ! -f "$APK_PATH" ]; then
  echo "✗ APK introuvable : $APK_PATH" >&2
  exit 1
fi
APK_SIZE="$(du -h "$APK_PATH" | cut -f1)"

# --- Installation sur le boîtier ---
if [ "$SKIP_INSTALL" = "1" ]; then
  echo "ℹ  SKIP_INSTALL=1 → pas d'installation."
else
  echo "→ Push APK sur le boîtier ($DEVICE)..."
  $ADB -s "$DEVICE" push "$APK_PATH" /data/local/tmp/app.apk
  echo "→ Installation..."
  $ADB -s "$DEVICE" shell pm install -r -d /data/local/tmp/app.apk
  echo "→ Lancement de l'app..."
  $ADB -s "$DEVICE" shell am start -n "$PACKAGE/.MainActivity" || true
fi

# --- Résumé ---
echo ""
echo "✓ RELEASE généré"
echo "  Chemin : $APK_PATH"
echo "  Taille : $APK_SIZE"
echo ""
