#!/usr/bin/env bash
# set_app_name.sh
# Run after `flutter create .` in CI to set the display name to "Rahel"
# on both iOS and Android platforms.
#
# Usage:  cd mobile && bash scripts/set_app_name.sh

set -euo pipefail

APP_NAME="Rahel"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# ── iOS ─────────────────────────────────────────────────────────
IOS_PLIST="$PROJECT_DIR/ios/Runner/Info.plist"

if [ -f "$IOS_PLIST" ]; then
  echo "[iOS] Updating CFBundleDisplayName and CFBundleName in Info.plist..."

  # Set CFBundleDisplayName
  if grep -q '<key>CFBundleDisplayName</key>' "$IOS_PLIST"; then
    sed -i.bak -E "s|(<key>CFBundleDisplayName</key>[[:space:]]*<string>)[^<]*(</string>)|\1${APP_NAME}\2|" "$IOS_PLIST"
  else
    # Insert CFBundleDisplayName before CFBundleName
    sed -i.bak "/<key>CFBundleName<\/key>/i\\
	<key>CFBundleDisplayName</key>\\
	<string>${APP_NAME}</string>" "$IOS_PLIST"
  fi

  # Set CFBundleName
  sed -i.bak -E "s|(<key>CFBundleName</key>[[:space:]]*<string>)[^<]*(</string>)|\1${APP_NAME}\2|" "$IOS_PLIST"

  rm -f "${IOS_PLIST}.bak"
  echo "[iOS] Done."
else
  echo "[iOS] Info.plist not found at $IOS_PLIST — skipping."
fi

# ── Android ─────────────────────────────────────────────────────
ANDROID_MANIFEST="$PROJECT_DIR/android/app/src/main/AndroidManifest.xml"

if [ -f "$ANDROID_MANIFEST" ]; then
  echo "[Android] Updating android:label in AndroidManifest.xml..."
  sed -i.bak -E "s|android:label=\"[^\"]*\"|android:label=\"${APP_NAME}\"|g" "$ANDROID_MANIFEST"
  rm -f "${ANDROID_MANIFEST}.bak"
  echo "[Android] Done."
else
  echo "[Android] AndroidManifest.xml not found at $ANDROID_MANIFEST — skipping."
fi

echo ""
echo "App display name set to '${APP_NAME}' on all platforms."
