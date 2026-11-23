// The Experts page (landing /experts and Summit '27's Experts tab): every
// approved expert serving in at least one track, from public_experts (app repo
// supabase/expert_public_profiles.sql). Works signed out. The list fills in by
// itself: an expert shows up once they sign up to serve in a track.
import { supabase } from '../lib/supabase';
import { normalizeLinkedInUrl } from '../models/expertLinkedIn';
import { parseExpertTracks, type ExpertTrack, type SessionExpert } from './sessionRegistration';

export type { ExpertTrack };

/** Same shape as a track page's expert (tracks included). */
export type PublicExpert = SessionExpert;

const textOrNull = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null);

export async function fetchPublicExperts(): Promise<PublicExpert[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc('public_experts');
  if (error) throw new Error(error.message);
  return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    id: String(r.id),
    name: String(r.name ?? '').trim(),
    photoUrl: textOrNull(r.photo_url),
    title: textOrNull(r.title),
    company: textOrNull(r.company),
    expertise: textOrNull(r.expertise),
    bio: textOrNull(r.bio),
    linkedInUrl: normalizeLinkedInUrl(textOrNull(r.linkedin_url) ?? ''),
    tracks: parseExpertTracks(r.tracks),
  }));
}
