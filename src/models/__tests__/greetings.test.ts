import { describe, expect, test } from 'vitest';
import { PLAYFUL_GREETINGS, pickGreeting, timeGreeting } from '../greetings';

describe('Home greeting', () => {
  test('the time-of-day greeting follows the clock', () => {
    expect(timeGreeting(new Date(2026, 10, 14, 9))).toBe('Good morning');
    expect(timeGreeting(new Date(2026, 10, 14, 13))).toBe('Good afternoon');
    expect(timeGreeting(new Date(2026, 10, 14, 20))).toBe('Good evening');
  });

  test('picks from the time greeting and the playful ones, like the app', () => {
    const morning = new Date(2026, 10, 14, 9);
    expect(pickGreeting(morning, () => 0)).toBe('Good morning');
    expect(pickGreeting(morning, () => 0.15)).toBe("What's up");
    expect(pickGreeting(morning, () => 0.999)).toBe("Let's build something");
    const seen = new Set(Array.from({ length: 9 }, (_, i) => pickGreeting(morning, () => i / 9)));
    expect(seen).toEqual(new Set(['Good morning', ...PLAYFUL_GREETINGS]));
  });
});
