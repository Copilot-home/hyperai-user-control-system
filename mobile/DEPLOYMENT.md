# Mobile EAS Deployment

This mobile surface is a bare React Native app, not an Expo-managed app.

The `expo-deployment` skill is applied here as an EAS deployment contract for the existing native mobile surface:

- native release builds are modeled through `eas.json`
- EAS workflow automation is modeled through `.eas/workflows/release.yml`
- app identity is declared in `app.config.js`

## What is ready

- EAS build and submit scripts are available in `package.json`
- Android package is aligned to `com.hyperai.usercontrol`
- iOS bundle identifier is aligned to `com.hyperai.app`
- production, preview, and development EAS profiles exist

## What is not ready

- this project does not currently contain a complete native Android Gradle project
- this project does not currently contain a complete iOS Xcode project / Podfile
- Expo package and Expo modules are not installed, so OTA updates and web deployment are not configured
- store credentials are not configured in EAS

## Commands

```bash
npm run eas:build:ios
npm run eas:build:android
npm run eas:release:ios
npm run eas:release:android
```

## Required next steps before real store deployment

1. Complete the native Android project files under `android/`.
2. Complete the native iOS project files under `ios/`.
3. Run `npx eas-cli@latest init` and connect the app to the correct Expo account/project.
4. Configure Apple credentials and App Store Connect metadata.
5. Configure Google Play service account credentials.

## Intentionally not added

- no web deploy workflow, because this mobile app has no Expo web target
- no EAS Update PR preview workflow, because Expo runtime/update integration is not present yet
