// BeAMentor clearance for experts (app repo: supabase/expert_beamentor.sql).
//
// Dublin Unified requires every adult volunteer on campus, experts included,
// to be cleared through BeAMentor. After the Guest Expert Policy, an expert
// opens BeAMentor, applies, then ticks that they submitted it. That gives full
// access, with a banner until a Summit organizer verifies the clearance.

/** DUSD's BeAMentor page, from the organizers' step-by-step slides. */
export const BEAMENTOR_URL = 'https://beamentor.org/linkpages/mentorasp/specialprojects/DUSD/';

/** The organizers' slides with screenshots of each step. */
export const BEAMENTOR_GUIDE_URL = 'https://docs.google.com/presentation/d/15z6kZVO4DfT88Pn80-CwfKd8Kzps_U0qdT3axbLmFhU/edit';

export const BEAMENTOR_CONTACT_EMAIL = 'contact@ehsacademics.org';

/** The slides' steps, in the Summit's words. */
export const BEAMENTOR_STEPS: string[] = [
  'Open BeAMentor and enter your email address.',
  'Already have a BeAMentor login? Sign in and check My Activities. If EHS is listed with a clearance level, you are already cleared.',
  'Otherwise, click Option 1 or Option 2, then click Activities.',
  'Enter your details and submit.',
  'Sign in, go to My Requirements, and upload your photo and a copy of your driver\'s license.',
];

export const BEAMENTOR_TIMING = 'Clearance usually takes 2-3 days. Once you are cleared, EHS shows in My Activities with your clearance level.';

export const BEAMENTOR_CHECKBOX = 'I have submitted my BeAMentor application, now or for a past Summit';

/** For experts who already applied through BeAMentor for an earlier Summit. */
export const BEAMENTOR_PAST_EXPERT =
  'If you already applied through BeAMentor as an expert at a past Summit, you do not need to apply again. ' +
  "Skip to the end and tick the box. Not sure? Sign in to BeAMentor and check that EHS shows in My Activities.";

type BeamentorProfile = {
  role?: string;
  profile_setup_complete?: boolean;
  expert_status?: string | null;
  beamentor_submitted_at?: string | null;
  beamentor_verified_at?: string | null;
} | null | undefined;

/** True once expert_beamentor.sql has added the columns. Until then nobody is asked. */
export function tracksBeamentor(profile: BeamentorProfile): boolean {
  return profile != null && 'beamentor_submitted_at' in profile;
}

/** A signed-up expert who still has to tick the BeAMentor box. */
export function needsBeamentor(profile: BeamentorProfile): boolean {
  return profile != null
    && profile.role === 'expert'
    && profile.profile_setup_complete === true
    && tracksBeamentor(profile)
    && profile.beamentor_submitted_at == null
    && profile.beamentor_verified_at == null;
}

/** An expert who ticked the box and is waiting for an organizer to verify it. */
export function awaitingBeamentorVerification(profile: BeamentorProfile): boolean {
  return profile != null
    && profile.role === 'expert'
    && profile.beamentor_submitted_at != null
    && profile.beamentor_verified_at == null;
}
