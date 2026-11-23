// An expert's choice to attach their LinkedIn to their expert profile, so
// students can connect with them (Nov 23, 2026). Asked when an expert signs up
// to serve in a track (ExpertTrackDialog), and changeable in Edit profile.
// Saved in profiles.details as linkedin_visible ('yes' or 'no') and
// linkedin_url. The track page's expert cards only get the address when the
// expert chose 'yes' (session_expert_profiles, app repo
// supabase/expert_public_profiles.sql).

export type LinkedInVisible = 'yes' | 'no';

export const LINKEDIN_VISIBLE_KEY = 'linkedin_visible';
export const LINKEDIN_URL_KEY = 'linkedin_url';

/** LinkedIn sends a signed-in member from here to their own profile. */
export const LINKEDIN_OWN_PROFILE_URL = 'https://www.linkedin.com/in/me/';

/** What an expert is told when they sign up to serve in a track. */
export function expertTrackNotice(trackTitle: string): string {
  return `Your profile will be visible to students on the ${trackTitle} page and on a page where we recognize all our experts.`;
}

export const LINKEDIN_CHOICE = {
  heading: 'LinkedIn',
  prompt: 'Do you want your LinkedIn attached to your profile so students can connect with you?',
  yes: 'Yes, attach my LinkedIn',
  no: 'No, leave it off',
  urlLabel: 'Your LinkedIn profile link',
  urlHint: 'linkedin.com/in/your-name',
  findLink: 'Find my link',
  findHelp: 'opens your own LinkedIn profile when you are signed in to LinkedIn; copy the address from there.',
  chooseError: 'Please choose whether to attach your LinkedIn.',
  urlError: 'Paste your LinkedIn profile link, like linkedin.com/in/your-name.',
} as const;

export function linkedInVisible(value: unknown): LinkedInVisible | null {
  return value === 'yes' || value === 'no' ? value : null;
}

/**
 * A LinkedIn profile link written out in full ("https://www.linkedin.com/in/x"),
 * from what someone pasted ("linkedin.com/in/x", "www.linkedin.com/in/x/",
 * with or without https). Null when it isn't a LinkedIn profile or company page.
 */
export function normalizeLinkedInUrl(raw: string): string | null {
  const text = raw.trim();
  if (!text) return null;
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`);
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase();
  if (host !== 'linkedin.com' && !host.endsWith('.linkedin.com')) return null;
  const path = url.pathname.replace(/\/+$/, '');
  if (!/^\/(in|pub|company)\/[^/]+/i.test(path)) return null;
  return `https://www.linkedin.com${path}`;
}

/** What's wrong with the expert's LinkedIn answers, or null when they're fine. */
export function linkedInProblem(
  answers: Record<string, string>,
  { mustChoose }: { mustChoose: boolean },
): string | null {
  const visible = linkedInVisible(answers[LINKEDIN_VISIBLE_KEY]);
  if (visible == null) return mustChoose ? LINKEDIN_CHOICE.chooseError : null;
  if (visible === 'yes' && normalizeLinkedInUrl(answers[LINKEDIN_URL_KEY] ?? '') == null) return LINKEDIN_CHOICE.urlError;
  return null;
}

/** The two details keys to save, with the link written out in full. */
export function linkedInAnswers(answers: Record<string, string>): Record<string, string> {
  const visible = linkedInVisible(answers[LINKEDIN_VISIBLE_KEY]);
  const raw = answers[LINKEDIN_URL_KEY] ?? '';
  return {
    [LINKEDIN_VISIBLE_KEY]: visible ?? '',
    [LINKEDIN_URL_KEY]: normalizeLinkedInUrl(raw) ?? raw.trim(),
  };
}
