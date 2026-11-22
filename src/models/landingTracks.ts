import type { Session } from './sessions';
import { orderTracks } from './trackOrder';

// Public programme labels can precede their registration rows. These are
// display-only: never add them to the shared session store or create seats.
const PUBLIC_TRACK_TITLES: Record<string, readonly string[]> = {
  novasphere: ['Core Sciences Presentations & Exhibits'],
};

const titleKey = (title: string) => title.toLowerCase().replace(/&/g, ' and ').replace(/\s+/g, ' ').trim();

/** Live track titles plus the confirmed public programme, in discipline order. */
export function landingTrackTitles(
  discipline: string,
  sessions: readonly Pick<Session, 'track' | 'title' | 'time'>[],
): string[] {
  const tracks = sessions
    .filter((session) => session.track === discipline)
    .map((session) => ({ title: session.title.trim(), time: session.time }))
    .filter((session) => session.title);
  const liveTitles = new Set(tracks.map((track) => titleKey(track.title)));
  for (const title of PUBLIC_TRACK_TITLES[discipline] ?? []) {
    if (!liveTitles.has(titleKey(title))) tracks.push({ title, time: '' });
  }

  const seen = new Set<string>();
  return orderTracks(discipline, tracks).flatMap(({ title }) => {
    const key = titleKey(title);
    if (seen.has(key)) return [];
    seen.add(key);
    return [title];
  });
}
