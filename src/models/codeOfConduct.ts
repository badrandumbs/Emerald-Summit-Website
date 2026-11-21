// What each account agrees to once, by ticking a box (code_of_conduct.sql in
// the app repo): experts agree to the Guest Expert Policy, every other role
// to the Code of Conduct. The text is word for word from EAF's documents,
// nothing summarized: "Emerald Summit 2026 Code of Conduct" (EAF Field Trip
// Waiver Form Version 11.02.2025.1) and "Guest Expert Policy: Emerald Summit
// '27" (Nov 14, 2026). The only changes: the signature lines are replaced by
// the checkbox, and the Code of Conduct's "Media Rights and Consent" section
// is not in the document window: it is asked below it as a radio button,
// with the two options saying "of me" instead of "of my child", because the
// account holder picks one, not a parent. The waiver form's version line at
// the bottom is left out. The title shown is "Emerald Summit 2027 Code of
// Conduct" (renamed Nov 20, 2026; the text is unchanged). The app has the same text in
// lib/models/code_of_conduct.dart: change both together and bump the
// version, which asks everyone who agreed to agree again.

/** A paragraph or bullet, optionally led by a bold (or italic) label; a label with no text is a small heading. */
export interface AgreementBlock {
  text: string;
  lead?: string;
  bullet?: boolean;
  italicLead?: boolean;
}

export interface ConductSection {
  title: string;
  blocks: AgreementBlock[];
}

/** A grant / do-not-grant question, answered with a radio button (profiles.photo_consent). */
export interface MediaChoice {
  /** The heading it is asked under, below the document window. */
  section: string;
  prompt: string;
  grant: string;
  doNotGrant: string;
}

export interface SummitAgreement {
  /** Stored in profiles.code_of_conduct_version; prefixed so the two never share one. */
  version: string;
  /** "Code of Conduct" / "Guest Expert Policy". */
  name: string;
  title: string;
  /** The lines under the title, before the first section. */
  preamble: string[];
  sections: ConductSection[];
  checkbox: string;
  /** The sentence above the window. */
  whoAgrees: string;
  mediaChoice?: MediaChoice;
}

export const CODE_OF_CONDUCT: SummitAgreement = {
  version: 'conduct-2026-11-15',
  name: 'Code of Conduct',
  title: 'Emerald Summit 2027 Code of Conduct',
  whoAgrees: 'Everyone at the Summit agrees to the Code of Conduct.',
  preamble: [
    'This is an EAF event. It is NOT a school/DUSD-sponsored event.',
    'IMPORTANT: PLEASE REVIEW ALL SECTIONS OF THIS FORM CAREFULLY.',
  ],
  checkbox: 'I have read the Code of Conduct and agree to it.',
  sections: [
    {
      title: 'Student Code of Conduct',
      blocks: [
        { lead: 'General Conduct', text: 'As ambassadors for Emerald High School, all students must conduct themselves respectfully, responsibly, and in a manner that reflects positively on the school, their families, and themselves.' },
        { lead: 'Behavior Expectations', text: '' },
        { lead: 'No Alcohol, Tobacco, Drugs, or Vaping Devices', text: 'Strictly prohibited, as per DUSD policy.' },
        { lead: 'Respectful Behavior', text: 'No inappropriate language, bullying, harassment, or disruptive behavior.' },
        { lead: 'Violence and Aggression', text: 'Physical altercations or threats will not be tolerated.' },
        { lead: 'Property Respect', text: 'Students are expected to respect all property and event venues. Any damage, littering or vandalism is a violation of policy.' },
        { lead: 'Chaperones', text: 'Chaperones are empowered to maintain a safe and respectful environment. They may intervene if any student behavior violates the event guidelines.' },
      ],
    },
    {
      title: 'Liability & Legal Disclaimer',
      blocks: [
        { lead: 'Non-School Event', text: 'This event is not sponsored by DUSD. As such, the district will not be liable for any injuries, loss, or property damage that may occur during the event. By attending, all students and parents acknowledge and accept this responsibility.' },
        { lead: 'Individual Liability', text: 'DUSD staff, if present, will not be covered by district insurance for this event. Chaperones and sponsors are not acting as agents of DUSD, and therefore, they are not covered by district liability insurance.' },
        { lead: 'Hold Harmless', text: 'By attending this event, students and parents agree to hold harmless and indemnify Emerald High School, EAF, and any event staff or chaperones from any personal injury, loss, or damage to property that may occur during the event.' },
        { lead: 'Insurance', text: 'DUSD does not provide insurance for non-school sponsored events. Insurance coverage must be provided by parents/guardians or through the travel agency. Students will not be covered by district or EAF insurance during this trip.' },
      ],
    },
    {
      title: 'Acknowledgment and Signature',
      blocks: [
        { text: 'By signing this form, I acknowledge that I have read and understood the details of this waiver, including the event guidelines, the code of conduct, and the liability and insurance information. I agree to abide by the conduct expectations and acknowledge that Emerald High School, the EHS PFSO, and any event staff are not responsible for any injuries, loss, or damage that may occur during this event.' },
      ],
    },
  ],
  mediaChoice: {
    section: 'Media Rights and Consent',
    prompt: 'Please check one:',
    grant: 'I GRANT permission for Emerald High School (EHS) and the EAF to take photos, videos, and audio recordings of me during the event. These may be used to share and promote the event on social media, websites, newsletters, or other materials. I waive the right to inspect and understand that these photos and videos may be shared publicly without any payment or consent for further approval.',
    doNotGrant: 'I DO NOT GRANT permission for Emerald High School (EHS) and the EAF to take photos, videos, and audio recordings of me during the event.',
  },
};

export const GUEST_EXPERT_POLICY: SummitAgreement = {
  version: 'guest-expert-2026-11-14',
  name: 'Guest Expert Policy',
  title: 'Guest Expert Policy: Emerald Summit ’27',
  whoAgrees: 'Every expert agrees to the Guest Expert Policy.',
  preamble: ['Nov 14, 2026'],
  checkbox: 'I have read the Guest Expert Policy and agree to it.',
  sections: [
    {
      title: 'The short version',
      blocks: [
        { bullet: true, text: 'Dress professionally and keep conversations respectful.' },
        { bullet: true, text: 'Do not ask for or share personal information about students.' },
        { bullet: true, text: 'Avoid politics, religion and culture, equity and social justice, and gender and race. CivicVerse tracks may cover civics, law and rights in an educational, nonpartisan way.' },
        { bullet: true, text: 'Share any slides or handouts with EAF before the event for review.' },
        { bullet: true, text: 'Sessions may be recorded and photographed.' },
      ],
    },
    {
      title: 'Purpose and scope',
      blocks: [
        { text: 'This policy sets out what Emerald Summit ’27 expects of Experts, the invited guests who share their time and expertise with students at Emerald High School (EHS). Your participation enriches our students’ educational experience and gives them valuable insights into careers and industries.' },
        { text: 'It applies to every Expert, before and during the Summit. To keep the event productive and respectful for everyone, all Experts are asked to follow the guidelines below.' },
      ],
    },
    {
      title: 'Conduct and interaction with students',
      blocks: [
        { text: 'To keep a focus on professional development and a positive experience for everyone, Experts are expected to follow these guidelines:' },
        { bullet: true, lead: 'Dress code', text: 'professional attire.' },
        { bullet: true, lead: 'Maintain professionalism', text: 'Always engage with students in a professional and respectful manner. Avoid personal questions and/or comments.' },
        { bullet: true, lead: 'Respect student privacy', text: 'Do not request or share any personal information about students.' },
        { bullet: true, lead: 'Materials', text: 'Experts typically do not need materials. If you plan to use a presentation, handouts or other resources, please share them with EAF before the event for review.' },
        { bullet: true, lead: 'Appropriate language', text: 'All spoken and written content must be suitable for a high school audience. Please keep language clear, engaging, and free from jargon or complex terminology. Crude humor, inappropriate pop culture references, and slang are not permitted.' },
      ],
    },
    {
      title: 'Topics to avoid',
      blocks: [
        { text: 'The Summit stays focused on career development and respects the diverse backgrounds of participants, so Experts should avoid these topics:' },
        { bullet: true, lead: 'Politics', text: 'Discussions of political parties, affiliations, or current political events are prohibited.' },
        { bullet: true, lead: 'Religion and culture', text: 'Conversations regarding religious beliefs or cultural practices should be avoided.' },
        { bullet: true, lead: 'Equity and social justice', text: 'Topics related to equity, social justice movements, or advocacy initiatives should not be discussed.' },
        { bullet: true, lead: 'Gender and race', text: 'Discussions surrounding gender identity, roles, or related issues should be avoided.' },
        { lead: 'CivicVerse tracks', text: 'Experts in the CivicVerse tracks (mock trial, Law and Rights Seminar, Civic Engagement) may discuss how law, rights and civic participation work. Please keep it educational and nonpartisan. Do not promote or oppose political parties, candidates or specific causes.' },
        { lead: 'Exemptions', italicLead: true, text: 'If an Expert plans to discuss any of these topics for valid educational purposes (for example, a political career), please reach out to the organizers to discuss.' },
      ],
    },
    {
      title: 'Recording, photography and your Expert profile',
      blocks: [
        { bullet: true, lead: 'Recording', text: 'Sessions may be recorded for educational purposes. By participating, Experts consent to being recorded and understand that recordings may be shared with students and affiliated school organizations.' },
        { bullet: true, lead: 'Photography', text: 'Photographs may be taken during the event and used for promotional purposes on social media platforms managed by Emerald High School and affiliated school organizations.' },
        { bullet: true, lead: 'Public profile', text: 'When signing up, Experts add the details for their profile. Name, title and organization, area of expertise, short bio, LinkedIn link (optional) and headshot appear on the Summit experts page. Email address and mobile number stay private. The mobile number is only used to reach an Expert on the day of the Summit if necessary.' },
      ],
    },
    {
      title: 'Enforcement and contact',
      blocks: [
        { text: 'EAF reserves the right to end an Expert’s participation, before or during the event, if the Expert violates these rules of engagement or in other unforeseen situations, at its discretion. We appreciate your cooperation in following these guidelines. Your support helps create a constructive and enriching experience for our students.' },
        { text: 'For any questions or concerns about this policy, contact contact@ehsacademics.org.' },
      ],
    },
    {
      title: 'Expert acknowledgment',
      blocks: [
        { text: 'You are reading this policy as a step in the sign-up wizard. Continue once you have read it; no signature is needed. Thank you for your understanding and commitment to fostering an inclusive educational environment.' },
      ],
    },
  ],
};

/** The Guest Expert Policy for experts, the Code of Conduct for everyone else. */
export function agreementFor(role: string | undefined): SummitAgreement {
  return role === 'expert' ? GUEST_EXPERT_POLICY : CODE_OF_CONDUCT;
}

type ConductProfile = {
  role?: string;
  profile_setup_complete?: boolean;
  code_of_conduct_version?: string | null;
} | null | undefined;

/**
 * True when the profile row has the agreement columns (the SQL has been
 * run). Until then nobody is asked, since the agreement could not be saved.
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
