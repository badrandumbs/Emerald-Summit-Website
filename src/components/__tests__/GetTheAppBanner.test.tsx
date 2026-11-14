import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { detectPlatform } from '../../lib/device';

const stores = vi.hoisted(() => ({ ios: null as string | null, android: null as string | null }));
vi.mock('../../lib/appStores', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../lib/appStores')>();
  return {
    ...real,
    storeUrlFor: (p: string) => (p === 'ios' ? stores.ios : p === 'android' ? stores.android : null),
  };
});
const device = vi.hoisted(() => ({ platform: 'other' as 'ios' | 'android' | 'other' }));
vi.mock('../../lib/device', async (importOriginal) => ({
  ...await importOriginal<typeof import('../../lib/device')>(),
  currentPlatform: () => device.platform,
}));
vi.mock('sonner', () => ({ toast: vi.fn() }));

import GetTheAppBanner, { APP_BANNER_SNOOZE_MS, bannerPlatform } from '../GetTheAppBanner';

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148';
const IPAD_DESKTOP = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15';
const PIXEL = 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 Chrome/131.0 Mobile Safari/537.36';
const WINDOWS = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Safari/537.36';

beforeEach(() => {
  localStorage.clear();
  stores.ios = 'https://apps.apple.com/app/id123';
  stores.android = 'https://play.google.com/store/apps/details?id=x';
  device.platform = 'other';
});
afterEach(() => vi.useRealTimers());

describe('detectPlatform', () => {
  test('tells iPhone, Android and computers apart', () => {
    expect(detectPlatform(IPHONE, 5)).toBe('ios');
    expect(detectPlatform(PIXEL, 5)).toBe('android');
    expect(detectPlatform(WINDOWS, 0)).toBe('other');
  });

  test('an iPad asking for the desktop site is still iOS; a real Mac is not', () => {
    expect(detectPlatform(IPAD_DESKTOP, 5)).toBe('ios');
    expect(detectPlatform(IPAD_DESKTOP, 0)).toBe('other');
  });
});

describe('bannerPlatform', () => {
  test('offers the store that matches the phone', () => {
    expect(bannerPlatform('ios', '')).toEqual({ platform: 'ios', url: stores.ios });
    expect(bannerPlatform('android', '')).toEqual({ platform: 'android', url: stores.android });
  });

  test('never shows on a computer', () => {
    expect(bannerPlatform('other', '')).toBeNull();
  });

  test('stays hidden for a store with no link yet', () => {
    stores.ios = null;
    expect(bannerPlatform('ios', '')).toBeNull();
    expect(bannerPlatform('android', '')).not.toBeNull();
  });

  test('?app-banner= previews it anywhere, even without a link', () => {
    stores.ios = null;
    expect(bannerPlatform('other', '?app-banner=ios')).toEqual({ platform: 'ios', url: null });
    expect(bannerPlatform('other', '?app-banner=nope')).toBeNull();
  });
});

describe('GetTheAppBanner', () => {
  test('slides in on a phone, links to its store, and stays away for two weeks after Not now', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    device.platform = 'android';
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const { unmount } = render(<GetTheAppBanner />);
    expect(screen.queryByText(/better in the app/i)).not.toBeInTheDocument();

    await act(async () => { vi.advanceTimersByTime(3000); });
    expect(screen.getByText(/better in the app/i)).toBeInTheDocument();
    expect(screen.getByText(/Free on Google Play/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Get the app on Google Play' })).toHaveAttribute('href', stores.android);

    await user.click(screen.getByRole('button', { name: 'Not now' }));
    const until = Number(localStorage.getItem('app_banner_hidden_until'));
    expect(until - Date.now()).toBeGreaterThan(APP_BANNER_SNOOZE_MS - 60_000);
    unmount();

    expect(bannerPlatform('android', '')).toBeNull();
    expect(bannerPlatform('android', '', until + 1)).not.toBeNull();
  });

  test('renders nothing on a computer', async () => {
    vi.useFakeTimers();
    const { container } = render(<GetTheAppBanner />);
    await act(async () => { vi.advanceTimersByTime(5000); });
    expect(container).toBeEmptyDOMElement();
  });
});
