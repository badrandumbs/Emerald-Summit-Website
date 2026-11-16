/**
 * Home's greeting, the same pool as the app's Home header
 * (`_pickGreeting` in the app's dashboard_screen.dart): the time-of-day
 * greeting plus the playful ones, one picked at random.
 */
export const PLAYFUL_GREETINGS = [
  "What's up",
  "What's cooking",
  "What's building",
  "What's innovating",
  "What's brewing",
  "What's poppin'",
  'Ready to create',
  "Let's build something",
] as const;

export function timeGreeting(date: Date): string {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function pickGreeting(date: Date, random: () => number = Math.random): string {
  const pool = [timeGreeting(date), ...PLAYFUL_GREETINGS];
  return pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))];
}
