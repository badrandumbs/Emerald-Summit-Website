// The order a discipline's tracks are listed in: grouped the way the
// discipline describes itself ("Technology & Engineering": computer science
// first, then the other tech tracks, then the engineering ones), then by start time
// within a group. Titles come from the live database, so groups match on
// words in the title, at the start of a word ("art" matches "Arts", not
// "Smart"). If a title matches more than one group, the longest matching word
// wins ("Culinary Arts" is culinary, not art). A track that matches no group goes last.
import { toMinutes } from '../services/summitContent';

/** Per discipline id, its groups in order, each a list of word starts (lowercase; a trailing space means the whole word). */
const GROUPS: Record<string, string[][]> = {
  techverse: [
    ['computer science', 'cyber', 'software', 'coding'],
    ['ai ', 'ai playground', 'product design', 'tech'],
    ['engineering', 'cad', 'robot'],
  ],
  biosphere: [['psychology', 'pyschology'], ['genetics'], ['health'], ['presentation']],
  novasphere: [['core science', 'physics', 'chemistry', 'astronomy', 'space', 'math'], ['climate', 'sustainab']],
  imaginex: [['art', 'literature'], ['music'], ['drama', 'improv'], ['culinary']],
  ventureverse: [['entrepreneur', 'shark tank', 'startup', 'pitch'], ['marketing', 'brand']],
  civicverse: [['mock trial'], ['civic', 'government', 'policy', 'legislat'], ['law', 'rights']],
};

function groupOf(discipline: string, title: string): number {
  const groups = GROUPS[discipline.toLowerCase()] ?? [];
  // Punctuation counts as a space, so "Drama + Improv" and "Genetics, CRISPR" split into words.
  const t = ` ${title.toLowerCase().replace(/[^a-z0-9]+/g, ' ')} `;
  let best = groups.length;
  let bestLen = 0;
  groups.forEach((words, i) => {
    for (const w of words) {
      if (w.length > bestLen && t.includes(` ${w}`)) { best = i; bestLen = w.length; }
    }
  });
  return best;
}

/** Unknown times ("TBD") sort after known ones. */
const minutes = (time: string) => {
  const m = toMinutes(time);
  return Number.isNaN(m) ? Infinity : m;
};

export function orderTracks<T extends { title: string; time: string }>(discipline: string, tracks: T[]): T[] {
  return [...tracks].sort(
    (a, b) => groupOf(discipline, a.title) - groupOf(discipline, b.title) || minutes(a.time) - minutes(b.time),
  );
}
