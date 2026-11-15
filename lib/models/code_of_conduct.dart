/// What each account agrees to once, by ticking a box (code_of_conduct.sql):
/// experts agree to the [guestExpertPolicy], every other role to the
/// [codeOfConduct]. The text is word for word from EAF's documents, nothing
/// summarized: "Emerald Summit 2026 Code of Conduct" (EAF Field Trip Waiver
/// Form Version 11.02.2025.1) and "Guest Expert Policy: Emerald Summit '27"
/// (Nov 14, 2026). The only changes: the signature lines are replaced by the
/// checkbox, and the Code of Conduct's two media options say "of me" instead
/// of "of my child", because the account holder picks one, not a parent.
/// The website has the same text in src/models/codeOfConduct.ts: change both
/// together and bump the version, which asks everyone who agreed to agree
/// again.
library;

import 'user_profile.dart';

/// One piece of an agreement: a paragraph or a bullet, optionally led by a
/// bold label ("General Conduct") or an italic one ("Exemptions"). A label
/// with no [text] is a small heading ("Behavior Expectations").
class AgreementBlock {
  const AgreementBlock(
    this.text, {
    this.lead,
    this.bullet = false,
    this.italicLead = false,
  });

  final String text;
  final String? lead;
  final bool bullet;
  final bool italicLead;
}

/// One titled part of an agreement.
class ConductSection {
  const ConductSection(this.title, this.blocks);
  final String title;
  final List<AgreementBlock> blocks;
}

/// A document an account agrees to.
class SummitAgreement {
  const SummitAgreement({
    required this.version,
    required this.name,
    required this.title,
    required this.preamble,
    required this.sections,
    required this.checkbox,
    required this.whoAgrees,
    this.footer,
    this.mediaChoice,
  });

  /// Stored in `profiles.code_of_conduct_version`; prefixed so the two
  /// documents never share one.
  final String version;

  /// "Code of Conduct" / "Guest Expert Policy".
  final String name;
  final String title;

  /// The lines under the title, before the first section.
  final List<String> preamble;
  final List<ConductSection> sections;

  /// The checkbox under it.
  final String checkbox;

  /// The sentence above the window.
  final String whoAgrees;

  /// The document's footer line, if it has one.
  final String? footer;

  /// The "Please check one" photo permission question, answered with a
  /// radio button (`profiles.photo_consent`), or null when there is none.
  final MediaChoice? mediaChoice;
}

/// A grant / do-not-grant question.
class MediaChoice {
  const MediaChoice({
    required this.section,
    required this.prompt,
    required this.grant,
    required this.doNotGrant,
  });

  /// The section the question belongs to; it shows right after it.
  final String section;
  final String prompt;
  final String grant;
  final String doNotGrant;
}

/// The agreement for [role]: the Guest Expert Policy for experts, the Code of
/// Conduct for everyone else.
SummitAgreement agreementFor(SummitRole role) =>
    role == SummitRole.expert ? guestExpertPolicy : codeOfConduct;

const codeOfConduct = SummitAgreement(
  version: 'conduct-2026-11-15',
  name: 'Code of Conduct',
  title: 'Emerald Summit 2026 Code of Conduct',
  whoAgrees: 'Everyone at the Summit agrees to the Code of Conduct.',
  preamble: [
    'This is an EAF event. It is NOT a school/DUSD-sponsored event.',
    'IMPORTANT: PLEASE REVIEW ALL SECTIONS OF THIS FORM CAREFULLY.',
  ],
  checkbox: 'I have read the Code of Conduct and agree to it.',
  footer: 'EAF Field Trip Waiver Form Version 11.02.2025.1',
  sections: [
    ConductSection('Student Code of Conduct', [
      AgreementBlock(
          'As ambassadors for Emerald High School, all students must conduct '
          'themselves respectfully, responsibly, and in a manner that '
          'reflects positively on the school, their families, and '
          'themselves.',
          lead: 'General Conduct'),
      AgreementBlock('', lead: 'Behavior Expectations'),
      AgreementBlock('Strictly prohibited, as per DUSD policy.',
          lead: 'No Alcohol, Tobacco, Drugs, or Vaping Devices'),
      AgreementBlock(
          'No inappropriate language, bullying, harassment, or disruptive '
          'behavior.',
          lead: 'Respectful Behavior'),
      AgreementBlock(
          'Physical altercations or threats will not be tolerated.',
          lead: 'Violence and Aggression'),
      AgreementBlock(
          'Students are expected to respect all property and event venues. '
          'Any damage, littering or vandalism is a violation of policy.',
          lead: 'Property Respect'),
      AgreementBlock(
          'Chaperones are empowered to maintain a safe and respectful '
          'environment. They may intervene if any student behavior violates '
          'the event guidelines.',
          lead: 'Chaperones'),
    ]),
    ConductSection('Liability & Legal Disclaimer', [
      AgreementBlock(
          'This event is not sponsored by DUSD. As such, the district will '
          'not be liable for any injuries, loss, or property damage that may '
          'occur during the event. By attending, all students and parents '
          'acknowledge and accept this responsibility.',
          lead: 'Non-School Event'),
      AgreementBlock(
          'DUSD staff, if present, will not be covered by district insurance '
          'for this event. Chaperones and sponsors are not acting as agents '
          'of DUSD, and therefore, they are not covered by district liability '
          'insurance.',
          lead: 'Individual Liability'),
      AgreementBlock(
          'By attending this event, students and parents agree to hold '
          'harmless and indemnify Emerald High School, EAF, and any event '
          'staff or chaperones from any personal injury, loss, or damage to '
          'property that may occur during the event.',
          lead: 'Hold Harmless'),
      AgreementBlock(
          'DUSD does not provide insurance for non-school sponsored events. '
          'Insurance coverage must be provided by parents/guardians or '
          'through the travel agency. Students will not be covered by '
          'district or EAF insurance during this trip.',
          lead: 'Insurance'),
    ]),
    ConductSection('Media Rights and Consent', []),
    ConductSection('Acknowledgment and Signature', [
      AgreementBlock(
          'By signing this form, I acknowledge that I have read and '
          'understood the details of this waiver, including the event '
          'guidelines, the code of conduct, and the liability and insurance '
          'information. I agree to abide by the conduct expectations and '
          'acknowledge that Emerald High School, the EHS PFSO, and any event '
          'staff are not responsible for any injuries, loss, or damage that '
          'may occur during this event.'),
    ]),
  ],
  mediaChoice: MediaChoice(
    section: 'Media Rights and Consent',
    prompt: 'Please check one:',
    grant: 'I GRANT permission for Emerald High School (EHS) and the EAF to '
        'take photos, videos, and audio recordings of me during the event. '
        'These may be used to share and promote the event on social media, '
        'websites, newsletters, or other materials. I waive the right to '
        'inspect and understand that these photos and videos may be shared '
        'publicly without any payment or consent for further approval.',
    doNotGrant: 'I DO NOT GRANT permission for Emerald High School (EHS) and '
        'the EAF to take photos, videos, and audio recordings of me during '
        'the event.',
  ),
);

const guestExpertPolicy = SummitAgreement(
  version: 'guest-expert-2026-11-14',
  name: 'Guest Expert Policy',
  title: 'Guest Expert Policy: Emerald Summit ’27',
  whoAgrees: 'Every expert agrees to the Guest Expert Policy.',
  preamble: ['Nov 14, 2026'],
  checkbox: 'I have read the Guest Expert Policy and agree to it.',
  sections: [
    ConductSection('The short version', [
      AgreementBlock('Dress professionally and keep conversations respectful.',
          bullet: true),
      AgreementBlock(
          'Do not ask for or share personal information about students.',
          bullet: true),
      AgreementBlock(
          'Avoid politics, religion and culture, equity and social justice, '
          'and gender and race. CivicVerse tracks may cover civics, law and '
          'rights in an educational, nonpartisan way.',
          bullet: true),
      AgreementBlock(
          'Share any slides or handouts with EAF before the event for review.',
          bullet: true),
      AgreementBlock('Sessions may be recorded and photographed.',
          bullet: true),
    ]),
    ConductSection('Purpose and scope', [
      AgreementBlock(
          'This policy sets out what Emerald Summit ’27 expects of Experts, '
          'the invited guests who share their time and expertise with '
          'students at Emerald High School (EHS). Your participation '
          'enriches our students’ educational experience and gives them '
          'valuable insights into careers and industries.'),
      AgreementBlock(
          'It applies to every Expert, before and during the Summit. To keep '
          'the event productive and respectful for everyone, all Experts are '
          'asked to follow the guidelines below.'),
    ]),
    ConductSection('Conduct and interaction with students', [
      AgreementBlock(
          'To keep a focus on professional development and a positive '
          'experience for everyone, Experts are expected to follow these '
          'guidelines:'),
      AgreementBlock('professional attire.', lead: 'Dress code', bullet: true),
      AgreementBlock(
          'Always engage with students in a professional and respectful '
          'manner. Avoid personal questions and/or comments.',
          lead: 'Maintain professionalism',
          bullet: true),
      AgreementBlock(
          'Do not request or share any personal information about students.',
          lead: 'Respect student privacy',
          bullet: true),
      AgreementBlock(
          'Experts typically do not need materials. If you plan to use a '
          'presentation, handouts or other resources, please share them with '
          'EAF before the event for review.',
          lead: 'Materials',
          bullet: true),
      AgreementBlock(
          'All spoken and written content must be suitable for a high school '
          'audience. Please keep language clear, engaging, and free from '
          'jargon or complex terminology. Crude humor, inappropriate pop '
          'culture references, and slang are not permitted.',
          lead: 'Appropriate language',
          bullet: true),
    ]),
    ConductSection('Topics to avoid', [
      AgreementBlock(
          'The Summit stays focused on career development and respects the '
          'diverse backgrounds of participants, so Experts should avoid these '
          'topics:'),
      AgreementBlock(
          'Discussions of political parties, affiliations, or current '
          'political events are prohibited.',
          lead: 'Politics',
          bullet: true),
      AgreementBlock(
          'Conversations regarding religious beliefs or cultural practices '
          'should be avoided.',
          lead: 'Religion and culture',
          bullet: true),
      AgreementBlock(
          'Topics related to equity, social justice movements, or advocacy '
          'initiatives should not be discussed.',
          lead: 'Equity and social justice',
          bullet: true),
      AgreementBlock(
          'Discussions surrounding gender identity, roles, or related issues '
          'should be avoided.',
          lead: 'Gender and race',
          bullet: true),
      AgreementBlock(
          'Experts in the CivicVerse tracks (mock trial, Law and Rights '
          'Seminar, Civic Engagement) may discuss how law, rights and civic '
          'participation work. Please keep it educational and nonpartisan. '
          'Do not promote or oppose political parties, candidates or specific '
          'causes.',
          lead: 'CivicVerse tracks'),
      AgreementBlock(
          'If an Expert plans to discuss any of these topics for valid '
          'educational purposes (for example, a political career), please '
          'reach out to the organizers to discuss.',
          lead: 'Exemptions',
          italicLead: true),
    ]),
    ConductSection('Recording, photography and your Expert profile', [
      AgreementBlock(
          'Sessions may be recorded for educational purposes. By '
          'participating, Experts consent to being recorded and understand '
          'that recordings may be shared with students and affiliated school '
          'organizations.',
          lead: 'Recording',
          bullet: true),
      AgreementBlock(
          'Photographs may be taken during the event and used for promotional '
          'purposes on social media platforms managed by Emerald High School '
          'and affiliated school organizations.',
          lead: 'Photography',
          bullet: true),
      AgreementBlock(
          'When signing up, Experts add the details for their profile. Name, '
          'title and organization, area of expertise, short bio, LinkedIn '
          'link (optional) and headshot appear on the Summit experts page. '
          'Email address and mobile number stay private. The mobile number is '
          'only used to reach an Expert on the day of the Summit if '
          'necessary.',
          lead: 'Public profile',
          bullet: true),
    ]),
    ConductSection('Enforcement and contact', [
      AgreementBlock(
          'EAF reserves the right to end an Expert’s participation, before or '
          'during the event, if the Expert violates these rules of engagement '
          'or in other unforeseen situations, at its discretion. We '
          'appreciate your cooperation in following these guidelines. Your '
          'support helps create a constructive and enriching experience for '
          'our students.'),
      AgreementBlock('For any questions or concerns about this policy, '
          'contact contact@ehsacademics.org.'),
    ]),
    ConductSection('Expert acknowledgment', [
      AgreementBlock(
          'You are reading this policy as a step in the sign-up wizard. '
          'Continue once you have read it; no signature is needed. Thank you '
          'for your understanding and commitment to fostering an inclusive '
          'educational environment.'),
    ]),
  ],
);
