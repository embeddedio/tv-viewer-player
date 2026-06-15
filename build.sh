#!/bin/bash
# build.sh — Build, installe et configure tv-viewer player
# Usage : ./build.sh [debug|release]

set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"
BUILD_TYPE="${1:-debug}"
PKG="com.tvviewer.app"
START=$(date +%s)

# ─── Couleurs ────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${BLUE}▶${NC} $1"; }
ok()   { echo -e "${GREEN}✓${NC} $1"; }
err()  { echo -e "${RED}✗${NC} $1"; exit 1; }
warn() { echo -e "${YELLOW}!${NC} $1"; }
sep()  { echo -e "${CYAN}────────────────────────────────────────${NC}"; }
elapsed() { echo $(( $(date +%s) - $START ))s; }

grant()  { adb shell pm grant "$PKG" "$1" 2>/dev/null || warn "Permission ignorée : $1"; }
appops() { adb shell appops set "$PKG" "$1" allow 2>/dev/null || warn "appops ignoré : $1"; }

# ─── Vérification ADB ────────────────────────────────────────────────────────
check_adb() {
  command -v adb &>/dev/null || err "ADB non trouvé dans le PATH"
  DEVICE=$(adb devices | grep -v "List of" | grep "device$" | head -1 | awk '{print $1}')
  [ -z "$DEVICE" ] && err "Aucun appareil connecté via ADB"
  ok "Appareil : $DEVICE"
}

# ─── APK path selon build type ───────────────────────────────────────────────
case "$BUILD_TYPE" in
  debug)
    GRADLE_TASK="assembleDebug"
    APK="$ROOT/android/app/build/outputs/apk/debug/app-debug.apk"
    ;;
  release)
    GRADLE_TASK="assembleRelease"
    APK="$ROOT/android/app/build/outputs/apk/release/app-release.apk"
    ;;
  *)
    echo "Usage : $0 [debug|release]"
    exit 1
    ;;
esac

# ─── Main ────────────────────────────────────────────────────────────────────
sep
echo -e "${CYAN}  tv-viewer player — $BUILD_TYPE${NC}"
sep

check_adb

# 1. Sync serveur
sep && log "[1/3] Sync serveur Node.js..."
yarn sync:server
ok "Sync OK"

# 2. Build
sep && log "[2/3] Build $GRADLE_TASK..."
cd "$ROOT/android"
./gradlew "$GRADLE_TASK" --quiet
cd "$ROOT"

[ -f "$APK" ] || err "APK introuvable : $APK"
ok "Build OK → $(basename $APK)"

# 3. Install + permissions
sep && log "[3/3] Installation & permissions..."

adb install -r "$APK"
ok "$PKG installé"

# READ/WRITE_EXTERNAL_STORAGE : permissions dangereuses standard (Android ≤ 10)
grant android.permission.READ_EXTERNAL_STORAGE
grant android.permission.WRITE_EXTERNAL_STORAGE

# AUTO_START (certaines ROMs fabricant : Xiaomi, etc.)
appops AUTO_START_APP

# MANAGE_EXTERNAL_STORAGE (Android 11+) : permission spéciale non grantable via ADB
# → l'app affiche son propre écran de demande au démarrage si nécessaire

adb shell dumpsys deviceidle whitelist +"$PKG" 2>/dev/null || true

sep
ok "Terminé en $(elapsed)"
sep
