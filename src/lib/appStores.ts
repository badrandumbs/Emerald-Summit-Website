// Store links for the Emerald Summit app, used by the "Get the app" banner
// phones see on the website (src/components/GetTheAppBanner.tsx).
//
// Leave a link null until the app is live in that store: the banner only shows
// on a phone whose store has a link, so nobody is sent to a page that 404s.
// When the app goes live, paste the link here and push to main.
//
//   iOS:     App Store Connect → the app → App Information → "View on App
//            Store". It looks like https://apps.apple.com/app/id1234567890
//   Android: https://play.google.com/store/apps/details?id=com.emeraldsummit.emerald_summit
//            (the applicationId in the app repo's android/app/build.gradle.kts)
import type { DevicePlatform } from './device';

export const APP_STORE_URL: string | null = null;
export const PLAY_STORE_URL: string | null = null;

export function storeUrlFor(platform: DevicePlatform): string | null {
  if (platform === 'ios') return APP_STORE_URL;
  if (platform === 'android') return PLAY_STORE_URL;
  return null;
}

export function storeNameFor(platform: DevicePlatform): string {
  return platform === 'ios' ? 'the App Store' : 'Google Play';
}
