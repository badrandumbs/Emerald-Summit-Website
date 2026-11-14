// What kind of device is looking at the site. The site is a static single-page
// app (no server rendering on Vercel), so this runs in the browser: the user
// agent says which phone OS it is, and media queries say how big the screen is
// and whether there's a mouse. Layout itself stays in CSS breakpoints; this is
// for the things CSS can't decide (which store to link, which copy to show,
// whether to mount a scroll-pinned section at all).
import { useSyncExternalStore } from 'react';

export type DevicePlatform = 'ios' | 'android' | 'other';

/**
 * iPhone, iPad and Android phones/tablets. iPadOS 13+ asks for desktop sites
 * and reports itself as a Mac, so a "Mac" with a touch screen is an iPad.
 */
export function detectPlatform(userAgent: string, maxTouchPoints = 0): DevicePlatform {
  if (/android/i.test(userAgent)) return 'android';
  if (/iphone|ipad|ipod/i.test(userAgent)) return 'ios';
  if (/macintosh/i.test(userAgent) && maxTouchPoints > 1) return 'ios';
  return 'other';
}

export function currentPlatform(): DevicePlatform {
  if (typeof navigator === 'undefined') return 'other';
  return detectPlatform(navigator.userAgent ?? '', navigator.maxTouchPoints ?? 0);
}

/** Phone-sized screens: the same 48rem breakpoint the landing page stacks at. */
export const PHONE_QUERY = '(max-width: 48rem)';
/** No hover: a finger, not a mouse. */
export const TOUCH_QUERY = '(hover: none)';

function mediaList(query: string): MediaQueryList | null {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return null;
  return window.matchMedia(query);
}

/** Live media-query match; false where matchMedia doesn't exist (tests, old browsers). */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const list = mediaList(query);
      if (!list) return () => {};
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    },
    () => mediaList(query)?.matches ?? false,
    () => false,
  );
}

export const useIsPhoneScreen = () => useMediaQuery(PHONE_QUERY);
export const useIsTouchScreen = () => useMediaQuery(TOUCH_QUERY);
