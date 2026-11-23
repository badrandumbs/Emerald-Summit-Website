// "Sessions similar to this", the app's AppState.suggestedSessions: other
// sessions in the same discipline that are not on the person's day and are
// not full, earliest first. While time conflicts are on
// (summit_settings.schedule_conflicts_on) it also leaves out any that overlap
// something they're registered for or managing.
import type { Session } from './sessions';

const minutes = (hhmm?: string): number | null => {
  const m = /^(\d{1,2}):(\d{2})/.exec(hhmm ?? '');
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};

export function overlaps(a: Session, b: Session): boolean {
  const [as, ae, bs, be] = [minutes(a.start), minutes(a.end), minutes(b.start), minutes(b.end)];
  if (as == null || ae == null || bs == null || be == null) return false;
  return as < be && bs < ae;
}

/** [onMyDay] is every session the person is registered for or managing. */
export function suggestedSessions(
  current: Session,
  all: Session[],
  onMyDay: Set<string>,
  avoidOverlaps = true,
): Session[] {
  const busy = avoidOverlaps ? all.filter((s) => onMyDay.has(s.id)) : [];
  return all
    .filter((s) =>
      s.id !== current.id &&
      s.track === current.track &&
      !onMyDay.has(s.id) &&
      s.enrolled < s.capacity &&
      !busy.some((b) => overlaps(b, s)))
    .sort((a, b) => (minutes(a.start) ?? 0) - (minutes(b.start) ?? 0));
}

/** Minutes the sessions take, end minus start, as the app sums "booked". */
export function bookedMinutes(sessions: Session[]): number {
  return sessions.reduce((sum, s) => {
    const a = minutes(s.start);
    const b = minutes(s.end);
    return a == null || b == null ? sum : sum + Math.max(0, b - a);
  }, 0);
}

/** The app's formatMinutes: "45 min", "2 hr", "1 hr 30 min". */
export function formatMinutes(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} hr`;
  return `${h} hr ${m} min`;
}
