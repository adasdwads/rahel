# iOS app name localization setup

The iOS host project is generated during CI with `flutter create`, so localized display-name files must be created after that step runs.

## Required localized files

Create these files inside `mobile/ios/Runner/` after the iOS project exists:

- `en.lproj/InfoPlist.strings`
- `ar.lproj/InfoPlist.strings`

## File contents

English:

```text
CFBundleDisplayName = "Rahel";
```

Arabic:

```text
CFBundleDisplayName = "راحل";
```

## Notes

- `CFBundleDisplayName` controls the home-screen app name.
- Keeping both English and Arabic localizations improves App Store and device-language discoverability.
- The CI workflow in `.github/workflows/build-ios.yml` now creates these files automatically after `flutter create`.