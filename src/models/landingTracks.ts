import type { Session } from './sessions';
import { orderTracks } from './trackOrder';

const titleKey = (title: string) => title.toLowerCase().replace(/&/g, ' and ').replace(/\s+/g, ' ').trim();

/** A discipline's live track titles, in its description's order, without duplicates. */
export function landingTrackTitles(
  discipline: string,
  sessions: readonly Pick<Session, 'track' | 'title' | 'time'>[],
): string[] {
  const tracks = sessions
    .filter((session) => session.track === discipline)
    .map((session) => ({ title: session.title.trim(), time: session.time }))
    .filter((session) => session.title);

  const seen = new Set<string>();
  return orderTracks(discipline, tracks).flatMap(({ title }) => {
    const key = titleKey(title);
    if (seen.has(key)) return [];
    seen.add(key);
    return [title];
  });
}

export interface TechVerseTrackColumns {
  computerScience: string[];
  engineering: string[];
  other: string[];
}

type TechVerseSession = Pick<Session, 'track' | 'title' | 'time'> & Partial<Pick<Session, 'trackName'>>;
type TechVerseSubject = 'computerScience' | 'engineering' | 'mixed';

function techVerseSubject(title: string): TechVerseSubject | undefined {
  const computerScience = /\b(?:computer[\s-]*science|comp[\s-]*sci(?:ence)?|cs)\b/i.test(title);
  const engineering = /\b(?:engineering|engg|eng)\b/i.test(title);
  if (computerScience && engineering) return 'mixed';
  if (computerScience) return 'computerScience';
  if (engineering) return 'engineering';
  if (/\b(?:cad(?:athon)?|robothon|robot(?:ics|s)?|product[\s-]*design)\b/i.test(title)) return 'engineering';
  if (/\b(?:ai|artificial intelligence|machine learning|cyber\w*|software|coding|programming|computing|apps?|web)\b/i.test(title)) {
    return 'computerScience';
  }
  return undefined;
}

/** Group real public titles by subject, retaining unfamiliar titles without guessing. */
export function techVerseTrackColumns(sessions: readonly TechVerseSession[]): TechVerseTrackColumns {
  const columns: TechVerseTrackColumns = { computerScience: [], engineering: [], other: [] };
  const techSessions = sessions.filter((session) => session.track === 'techverse');
  for (const title of landingTrackTitles('techverse', sessions)) {
    const subject = techVerseSubject(title)
      ?? techSessions
        .filter((session) => titleKey(session.title) === titleKey(title))
        .map((session) => techVerseSubject(session.trackName ?? ''))
        .find(Boolean);
    if (subject === 'computerScience' || subject === 'engineering') columns[subject].push(title);
    else columns.other.push(title);
  }
  return columns;
}

type TechVerseFormat = 'presentation' | 'exhibit' | 'other';

function techVerseFormat(title: string): TechVerseFormat {
  if (/\bpresentations?\b/i.test(title)) return 'presentation';
  if (/\bexhibit(?:ion)?s?\b/i.test(title)) return 'exhibit';
  return 'other';
}

/** Pair matching formats in shared rows; missing counterparts leave an empty cell. */
export function techVerseTrackRows(
  columns: TechVerseTrackColumns,
): Array<{ computerScience?: string; engineering?: string }> {
  const rows: Array<{ computerScience?: string; engineering?: string }> = [];
  for (const format of ['presentation', 'exhibit', 'other'] as const) {
    const computerScience = columns.computerScience.filter((title) => techVerseFormat(title) === format);
    const engineering = columns.engineering.filter((title) => techVerseFormat(title) === format);
    for (let index = 0; index < Math.max(computerScience.length, engineering.length); index++) {
      rows.push({ computerScience: computerScience[index], engineering: engineering[index] });
    }
  }
  return rows;
}
