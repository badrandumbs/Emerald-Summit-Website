// The Summit's Code of Conduct, rewritten from EAF's "Emerald Summit 2026 Code
// of Conduct" form (field trip waiver version 11.02.2025.1) for everyone who
// attends, not only students. Every account agrees to it once by ticking a box
// (code_of_conduct.sql in the app repo). The app has the same text in
// lib/models/code_of_conduct.dart: change both together and bump
// CODE_OF_CONDUCT_VERSION, which asks everyone to agree again.

/** The version an account agrees to (profiles.code_of_conduct_version). */
export const CODE_OF_CONDUCT_VERSION = '2026-11-14';

export const CODE_OF_CONDUCT_TITLE = "Emerald Summit '27 Code of Conduct";

export const CODE_OF_CONDUCT_INTRO =
  'Emerald Summit is an EHS Academic Foundation (EAF) event. It is not a school or Dublin Unified School District (DUSD) event. Everyone who attends agrees to this code: participants, spectators, experts, volunteers and organizers.';

export interface ConductSection {
  title: string;
  points: { lead: string; text: string }[];
}

export const CODE_OF_CONDUCT_SECTIONS: ConductSection[] = [
  {
    title: 'How everyone is expected to act',
    points: [
      { lead: 'Be respectful and responsible', text: 'Act in a way that reflects well on Emerald High School, your family and yourself.' },
      { lead: 'No alcohol, tobacco, drugs or vaping', text: 'These are not allowed anywhere at the event, the same as under DUSD policy.' },
      { lead: 'Treat people well', text: 'No inappropriate language, bullying, harassment or disruptive behavior.' },
      { lead: 'No violence', text: 'Fighting and threats are not tolerated.' },
      { lead: 'Respect the building', text: 'Take care of the school and everything in it. Damage, littering and vandalism break this code.' },
      { lead: 'Chaperones and organizers can step in', text: 'They keep the event safe and respectful, and may step in whenever someone breaks these rules.' },
    ],
  },
  {
    title: 'Liability and insurance',
    points: [
      { lead: 'Not a district event', text: 'DUSD does not sponsor the Summit and is not liable for any injury, loss or property damage during it. By attending, you (and, for students, your parents or guardians) accept this responsibility.' },
      { lead: 'District staff and chaperones', text: 'DUSD staff who attend are not covered by district insurance for this event. Chaperones and sponsors are not acting for DUSD and are not covered by its liability insurance.' },
      { lead: 'Hold harmless', text: 'By attending, you agree to hold harmless and indemnify Emerald High School, EAF, and the event staff and chaperones for any personal injury, loss or property damage during the event.' },
      { lead: 'Insurance', text: "Neither DUSD nor EAF provides insurance for the Summit. Your own insurance, or your parents' or guardians', applies." },
    ],
  },
  {
    title: 'Photos and video',
    points: [
      { lead: 'The Summit is photographed', text: 'EHS and EAF take photos, video and audio during the event and may share them to promote it on social media, websites, newsletters and other materials, without payment.' },
      { lead: 'Opting out', text: "If you don't want to appear in them, email contact@ehsacademics.org before the Summit or tell the front desk when you arrive." },
    ],
  },
  {
    title: 'Agreeing',
    points: [
      { lead: 'What the checkbox means', text: "By ticking the box, you confirm you've read this code, agree to follow it, and accept the liability and insurance terms above. If you're under 18, read it with a parent or guardian." },
    ],
  },
];

export const CODE_OF_CONDUCT_CHECKBOX = "I've read the Code of Conduct and agree to follow it.";

type ConductProfile = {
  profile_setup_complete?: boolean;
  code_of_conduct_version?: string | null;
} | null | undefined;

/**
 * True when the profile row has the Code of Conduct columns (the SQL has
 * been run). Until then nobody is asked, since the agreement couldn't be saved.
 */
export function tracksCodeOfConduct(profile: ConductProfile): boolean {
  return profile != null && 'code_of_conduct_version' in profile;
}

/** True when a finished account still has to agree to the current version. */
export function needsCodeOfConduct(profile: ConductProfile): boolean {
  return profile != null
    && profile.profile_setup_complete === true
    && tracksCodeOfConduct(profile)
    && profile.code_of_conduct_version !== CODE_OF_CONDUCT_VERSION;
}
