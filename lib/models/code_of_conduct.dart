/// What each account agrees to once, by ticking a box (code_of_conduct.sql):
/// experts agree to the [speakerPolicy], every other role to the
/// [codeOfConduct]. Both are rewritten from EAF's forms (the "Emerald Summit
/// 2026 Code of Conduct" field trip waiver, version 11.02.2025.1, and the
/// "Emerald Summit '26 Speaker Policy Document" v1.0, Jan 28, 2026). The
/// website has the same text in src/models/codeOfConduct.ts: change both
/// together and bump the version, which asks everyone who agreed to agree
/// again.
library;

import 'user_profile.dart';

/// One titled part of an agreement.
class ConductSection {
  const ConductSection(this.title, this.points);
  final String title;
  final List<ConductPoint> points;
}

/// A rule: a short bold lead and what it means.
class ConductPoint {
  const ConductPoint(this.lead, this.text);
  final String lead;
  final String text;
}

/// A document an account agrees to.
class SummitAgreement {
  const SummitAgreement({
    required this.version,
    required this.name,
    required this.title,
    required this.intro,
    required this.sections,
    required this.checkbox,
    required this.whoAgrees,
  });

  /// Stored in `profiles.code_of_conduct_version`; prefixed so the two
  /// documents never share one.
  final String version;

  /// "Code of Conduct" / "Speaker Policy".
  final String name;
  final String title;
  final String intro;
  final List<ConductSection> sections;

  /// The checkbox under it.
  final String checkbox;

  /// The sentence above the window, e.g. "Everyone at the Summit agrees to
  /// the Code of Conduct."
  final String whoAgrees;
}

/// The agreement for [role]: the Speaker Policy for experts, the Code of
/// Conduct for everyone else.
SummitAgreement agreementFor(SummitRole role) =>
    role == SummitRole.expert ? speakerPolicy : codeOfConduct;

const codeOfConduct = SummitAgreement(
  version: 'conduct-2026-11-14',
  name: 'Code of Conduct',
  title: "Emerald Summit '27 Code of Conduct",
  whoAgrees: 'Everyone at the Summit agrees to the Code of Conduct.',
  intro: 'Emerald Summit is an EHS Academic Foundation (EAF) event. It is not '
      'a school or Dublin Unified School District (DUSD) event. Everyone who '
      'attends agrees to this code: participants, spectators, volunteers and '
      'organizers. Experts agree to the Speaker Policy instead.',
  checkbox: "I've read the Code of Conduct and agree to follow it.",
  sections: [
    ConductSection('How everyone is expected to act', [
      ConductPoint('Be respectful and responsible',
          'Act in a way that reflects well on Emerald High School, your '
              'family and yourself.'),
      ConductPoint('No alcohol, tobacco, drugs or vaping',
          'These are not allowed anywhere at the event, the same as under '
              'DUSD policy.'),
      ConductPoint('Treat people well',
          'No inappropriate language, bullying, harassment or disruptive '
              'behavior.'),
      ConductPoint('No violence', 'Fighting and threats are not tolerated.'),
      ConductPoint('Respect the building',
          'Take care of the school and everything in it. Damage, littering '
              'and vandalism break this code.'),
      ConductPoint('Chaperones and organizers can step in',
          'They keep the event safe and respectful, and may step in whenever '
              'someone breaks these rules.'),
    ]),
    ConductSection('Liability and insurance', [
      ConductPoint('Not a district event',
          'DUSD does not sponsor the Summit and is not liable for any injury, '
              'loss or property damage during it. By attending, you (and, for '
              'students, your parents or guardians) accept this '
              'responsibility.'),
      ConductPoint('District staff and chaperones',
          'DUSD staff who attend are not covered by district insurance for '
              'this event. Chaperones and sponsors are not acting for DUSD and '
              'are not covered by its liability insurance.'),
      ConductPoint('Hold harmless',
          'By attending, you agree to hold harmless and indemnify Emerald '
              'High School, EAF, and the event staff and chaperones for any '
              'personal injury, loss or property damage during the event.'),
      ConductPoint('Insurance',
          'Neither DUSD nor EAF provides insurance for the Summit. Your own '
              "insurance, or your parents' or guardians', applies."),
    ]),
    ConductSection('Photos and video', [
      ConductPoint('The Summit is photographed',
          'EHS and EAF take photos, video and audio during the event and may '
              'share them to promote it on social media, websites, '
              'newsletters and other materials, without payment.'),
      ConductPoint('Opting out',
          "If you don't want to appear in them, email "
              'contact@ehsacademics.org before the Summit or tell the front '
              'desk when you arrive.'),
    ]),
    ConductSection('Agreeing', [
      ConductPoint('What the checkbox means',
          "By ticking the box, you confirm you've read this code, agree to "
              'follow it, and accept the liability and insurance terms above. '
              "If you're under 18, read it with a parent or guardian."),
    ]),
  ],
);

const speakerPolicy = SummitAgreement(
  version: 'speaker-2026-11-14',
  name: 'Speaker Policy',
  title: "Emerald Summit '27 Speaker Policy",
  whoAgrees: 'Every expert agrees to the Speaker Policy.',
  intro: 'Thank you for sharing your time and expertise with Emerald High '
      "School students. Experts give students a real look at careers and "
      'industries and feedback on their work. This policy keeps the Summit '
      'productive and respectful for everyone, and every expert agrees to it.',
  checkbox: "I've read the Speaker Policy and agree to follow it.",
  sections: [
    ConductSection('Working with students', [
      ConductPoint('Dress professionally', 'Please wear professional attire.'),
      ConductPoint('Stay professional',
          'Engage with students professionally and respectfully. Avoid '
              'personal questions and comments.'),
      ConductPoint('Respect student privacy',
          "Don't ask for or share any personal information about students."),
      ConductPoint('Get materials approved',
          'EAF has to approve any slides, videos, handouts or other materials '
              'before the event.'),
      ConductPoint('Keep language right for high schoolers',
          'Everything you say and show should suit a high school audience: '
              'clear, engaging and free of jargon. No crude humor, '
              'inappropriate pop culture references or slang.'),
    ]),
    ConductSection('Topics to avoid', [
      ConductPoint('Why',
          'The Summit focuses on careers and learning, and its students come '
              'from many backgrounds. Please leave these topics out.'),
      ConductPoint('Politics',
          'Political parties, affiliations or current political events.'),
      ConductPoint('Religion and culture',
          'Religious beliefs or cultural practices.'),
      ConductPoint('Equity and social justice',
          'Equity, social justice movements or advocacy initiatives.'),
      ConductPoint('Gender and race',
          'Gender identity, gender roles or related issues.'),
      ConductPoint('Exceptions',
          'If one of these topics is part of your field (a career in '
              'politics, for example), email contact@ehsacademics.org before '
              'the Summit to ask for an exception. It needs a signed agreement '
              'with the organizing committee.'),
    ]),
    ConductSection('Recording and photos', [
      ConductPoint('Recording',
          'Sessions may be recorded for educational purposes, and the '
              'recordings may be shared with students and affiliated school '
              'organizations.'),
      ConductPoint('Photos',
          'Photos taken during the event may be used to promote it on social '
              'media run by Emerald High School and affiliated school '
              'organizations.'),
    ]),
    ConductSection('If the policy is broken', [
      ConductPoint('EAF can cancel',
          'EAF may cancel the event at its discretion for unforeseen '
              'situations, including a speaker breaking this policy before or '
              'during the event.'),
      ConductPoint('Questions',
          'Email contact@ehsacademics.org about anything in this policy.'),
    ]),
    ConductSection('Agreeing', [
      ConductPoint('What the checkbox means',
          "By ticking the box, you confirm you've read this policy, agree to "
              'follow it, and agree to being recorded and photographed as '
              'described above.'),
    ]),
  ],
);
