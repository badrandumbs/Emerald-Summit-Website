import type { Session } from './sessions';
import type { TeamLinkKey, TeamMention } from './team';

type TrackTarget = {
  kind: 'track';
  label: string;
  discipline: string;
  topic: RegExp;
  format?: RegExp;
  aliases: readonly string[];
};
type DisciplineTarget = { kind: 'discipline'; label: string; discipline: string };
type TeamTarget = TrackTarget | DisciplineTarget;

export const TEAM_TARGETS: Record<TeamLinkKey, TeamTarget> = {
  'engineering-exhibits': {
    kind: 'track', label: 'Engineering Exhibits', discipline: 'techverse',
    topic: /\b(?:engineering|engg)\b/, format: /\bexhibits?\b/,
    aliases: ['Engineering Exhibits', 'Engineering Exhibit'],
  },
  'computer-science-presentations': {
    kind: 'track', label: 'Computer Science Presentations', discipline: 'techverse',
    topic: /\b(?:computer\s*science|comp\s*sci(?:ence)?|computing|cs)\b/, format: /\bpresentations?\b/,
    aliases: ['Computer Science Presentations', 'Comp Sci Presentations', 'CS Presentations'],
  },
  cadathon: {
    kind: 'track', label: 'CADathon', discipline: 'techverse',
    topic: /\b(?:cadathon|cad a thon|cad|computer aided design)\b/,
    aliases: ['CADathon'],
  },
  'ai-playground': {
    kind: 'track', label: 'AI Playground', discipline: 'techverse',
    topic: /\b(?:ai|artificial intelligence) playground\b/,
    aliases: ['AI Playground'],
  },
  'product-design': {
    kind: 'track', label: 'Product Design', discipline: 'techverse',
    topic: /\bproduct design\b/, aliases: ['Product Design'],
  },
  'health-sciences': {
    kind: 'track', label: 'Health Sciences', discipline: 'biosphere',
    topic: /\bhealth sciences?\b/, aliases: ['Health Sciences', 'Health Sciences Track'],
  },
  genetics: {
    kind: 'track', label: 'Genetics', discipline: 'biosphere',
    topic: /\bgenetics?\b/, aliases: ['Genetics', 'Genetics Track'],
  },
  psychology: {
    kind: 'track', label: 'Psychology', discipline: 'biosphere',
    topic: /\b(?:psychology|pyschology)\b/, aliases: ['Psychology', 'Psychology Track'],
  },
  'art-literature': {
    kind: 'track', label: 'Art and Literature', discipline: 'imaginex',
    topic: /\b(?:art|literature|lit)\b/,
    aliases: ['Art/Lit', 'Art and Literature', 'Art & Literature', 'Art/Literature'],
  },
  drama: {
    kind: 'track', label: 'Drama', discipline: 'imaginex',
    topic: /\b(?:drama|improv|theatre|theater)\b/, aliases: ['Drama', 'Drama and Improv'],
  },
  'business-management-marketing': {
    kind: 'track', label: 'Business Management and Marketing', discipline: 'ventureverse',
    topic: /\b(?:marketing|business management)\b/,
    aliases: ['Business Management & Marketing', 'Business Management and Marketing', 'Marketing'],
  },
  biosphere: { kind: 'discipline', label: 'BioSphere', discipline: 'biosphere' },
  imaginex: { kind: 'discipline', label: 'ImagineX', discipline: 'imaginex' },
  'techverse-engineering': { kind: 'discipline', label: 'TechVerse Engineering', discipline: 'techverse' },
};

export function teamTarget(key: string): TeamTarget | undefined {
  return Object.prototype.hasOwnProperty.call(TEAM_TARGETS, key) ? TEAM_TARGETS[key as TeamLinkKey] : undefined;
}

export function teamLinkHref(key: TeamLinkKey): string {
  const target = TEAM_TARGETS[key];
  return target.kind === 'discipline'
    ? '/disciplines?verse=' + encodeURIComponent(target.discipline)
    : '/team/tracks/' + key;
}

const normalize = (text: string) => text.toLowerCase()
  .replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').trim();

export type TeamSession = Pick<Session, 'id' | 'title' | 'track'> & Partial<Pick<Session, 'trackName' | 'time'>>;

/** Use real catalog IDs, prefer exact titles, and never select a different discipline or format. */
export function teamTrackMatches(key: TeamLinkKey, sessions: readonly TeamSession[]): TeamSession[] {
  const target = TEAM_TARGETS[key];
  if (target.kind !== 'track') return [];
  const matches = sessions.filter((session) => {
    if (session.track !== target.discipline) return false;
    const title = normalize(session.title);
    const track = normalize(session.trackName ?? '');
    if (target.format && /\b(?:presentations?|exhibits?|workshops?)\b/.test(title)
      && !target.format.test(title)) return false;
    return (target.topic.test(title) || target.topic.test(track))
      && (!target.format || target.format.test(title) || target.format.test(track));
  });
  const aliases = new Set(target.aliases.map(normalize));
  const exact = matches.filter((session) => aliases.has(normalize(session.title)));
  return exact.length ? exact : matches;
}

export interface TeamTextPart { text: string; target?: TeamLinkKey }

/** Link only curated phrases, retaining every original character and punctuation mark. */
export function teamTextParts(text: string, mentions: readonly TeamMention[]): TeamTextPart[] {
  const phrases = [...mentions].filter((mention) => mention.text)
    .sort((a, b) => b.text.length - a.text.length);
  if (!phrases.length) return [{ text }];
  const escape = (value: string) => value.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&');
  const pattern = new RegExp(phrases.map((mention) => escape(mention.text)).join('|'), 'giu');
  const parts: TeamTextPart[] = [];
  let cursor = 0;
  for (const match of text.matchAll(pattern)) {
    const start = match.index;
    const end = start + match[0].length;
    if ((start > 0 && /[\p{L}\p{N}]/u.test(text[start - 1]))
      || (end < text.length && /[\p{L}\p{N}]/u.test(text[end]))) continue;
    if (start > cursor) parts.push({ text: text.slice(cursor, start) });
    const mention = phrases.find((phrase) => phrase.text.toLowerCase() === match[0].toLowerCase())!;
    parts.push({ text: match[0], target: mention.target });
    cursor = end;
  }
  if (cursor < text.length) parts.push({ text: text.slice(cursor) });
  return parts;
}
