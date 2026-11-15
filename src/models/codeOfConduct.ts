// What each account agrees to once, by ticking a box (code_of_conduct.sql in
// the app repo): experts agree to the Speaker Policy, every other role to the
// Code of Conduct. Both are rewritten from EAF's forms (the "Emerald Summit
// 2026 Code of Conduct" field trip waiver, version 11.02.2025.1, and the
// "Emerald Summit '26 Speaker Policy Document" v1.0, Jan 28, 2026). The app
// has the same text in lib/models/code_of_conduct.dart: change both together
// and bump the version, which asks everyone who agreed to agree again.

export interface ConductSection {
  title: string;
  points: { lead: string; text: string }[];
}

export interface SummitAgreement {
  /** Stored in profiles.code_of_conduct_version; prefixed so the two never share one. */
  version: string;
  /** "Code of Conduct" / "Speaker Policy". */
  name: string;
  title: string;
  intro: string;
  sections: ConductSection[];
  checkbox: string;
  /** The sentence above the window. */
  whoAgrees: string;
}

export const CODE_OF_CONDUCT: SummitAgreement = {
  version: 'conduct-2026-11-14',
  name: 'Code of Conduct',
  title: "Emerald Summit '27 Code of Conduct",
  whoAgrees: 'Everyone at the Summit agrees to the Code of Conduct.',
  intro: 'Emerald Summit is an EHS Academic Foundation (EAF) event. It is not a school or Dublin Unified School District (DUSD) event. Everyone who attends agrees to this code: participants, spectators, volunteers and organizers. Experts agree to the Speaker Policy instead.',
  checkbox: "I've read the Code of Conduct and agree to follow it.",
  sections: [
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
  ],
};

export const SPEAKER_POLICY: SummitAgreement = {
  version: 'speaker-2026-11-14',
  name: 'Speaker Policy',
  title: "Emerald Summit '27 Speaker Policy",
  whoAgrees: 'Every expert agrees to the Speaker Policy.',
  intro: 'Thank you for sharing your time and expertise with Emerald High School students. Experts give students a real look at careers and industries and feedback on their work. This policy keeps the Summit productive and respectful for everyone, and every expert agrees to it.',
  checkbox: "I've read the Speaker Policy and agree to follow it.",
  sections: [
    {
      title: 'Working with students',
      points: [
        { lead: 'Dress professionally', text: 'Please wear professional attire.' },
        { lead: 'Stay professional', text: 'Engage with students professionally and respectfully. Avoid personal questions and comments.' },
        { lead: 'Respect student privacy', text: "Don't ask for or share any personal information about students." },
        { lead: 'Get materials approved', text: 'EAF has to approve any slides, videos, handouts or other materials before the event.' },
        { lead: 'Keep language right for high schoolers', text: 'Everything you say and show should suit a high school audience: clear, engaging and free of jargon. No crude humor, inappropriate pop culture references or slang.' },
      ],
    },
    {
      title: 'Topics to avoid',
      points: [
        { lead: 'Why', text: 'The Summit focuses on careers and learning, and its students come from many backgrounds. Please leave these topics out.' },
        { lead: 'Politics', text: 'Political parties, affiliations or current political events.' },
        { lead: 'Religion and culture', text: 'Religious beliefs or cultural practices.' },
        { lead: 'Equity and social justice', text: 'Equity, social justice movements or advocacy initiatives.' },
        { lead: 'Gender and race', text: 'Gender identity, gender roles or related issues.' },
        { lead: 'Exceptions', text: 'If one of these topics is part of your field (a career in politics, for example), email contact@ehsacademics.org before the Summit to ask for an exception. It needs a signed agreement with the organizing committee.' },
      ],
    },
    {
      title: 'Recording and photos',
      points: [
        { lead: 'Recording', text: 'Sessions may be recorded for educational purposes, and the recordings may be shared with students and affiliated school organizations.' },
        { lead: 'Photos', text: 'Photos taken during the event may be used to promote it on social media run by Emerald High School and affiliated school organizations.' },
      ],
    },
    {
      title: 'If the policy is broken',
      points: [
        { lead: 'EAF can cancel', text: 'EAF may cancel the event at its discretion for unforeseen situations, including a speaker breaking this policy before or during the event.' },
        { lead: 'Questions', text: 'Email contact@ehsacademics.org about anything in this policy.' },
      ],
    },
    {
      title: 'Agreeing',
      points: [
        { lead: 'What the checkbox means', text: "By ticking the box, you confirm you've read this policy, agree to follow it, and agree to being recorded and photographed as described above." },
      ],
    },
  ],
};

/** The Speaker Policy for experts, the Code of Conduct for everyone else. */
export function agreementFor(role: string | undefined): SummitAgreement {
  return role === 'expert' ? SPEAKER_POLICY : CODE_OF_CONDUCT;
}

type ConductProfile = {
  role?: string;
  profile_setup_complete?: boolean;
  code_of_conduct_version?: string | null;
} | null | undefined;

/**
 * True when the profile row has the agreement columns (the SQL has been
 * run). Until then nobody is asked, since the agreement couldn't be saved.
 */
export function tracksCodeOfConduct(profile: ConductProfile): boolean {
  return profile != null && 'code_of_conduct_version' in profile;
}

/** True when a finished account still has to agree to its role's current agreement. */
export function needsCodeOfConduct(profile: ConductProfile): boolean {
  return profile != null
    && profile.profile_setup_complete === true
    && tracksCodeOfConduct(profile)
    && profile.code_of_conduct_version !== agreementFor(profile.role).version;
}
