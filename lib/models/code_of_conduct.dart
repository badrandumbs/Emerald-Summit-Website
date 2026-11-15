/// The Summit's Code of Conduct, rewritten from EAF's "Emerald Summit 2026
/// Code of Conduct" form (field trip waiver version 11.02.2025.1) for everyone
/// who attends, not only students. Every account agrees to it once by ticking
/// a box (code_of_conduct.sql). The website has the same text in
/// src/models/codeOfConduct.ts: change both together and bump
/// [codeOfConductVersion], which asks everyone to agree again.
library;

/// The version an account agrees to (`profiles.code_of_conduct_version`).
const codeOfConductVersion = '2026-11-14';

const codeOfConductTitle = "Emerald Summit '27 Code of Conduct";

const codeOfConductIntro =
    'Emerald Summit is an EHS Academic Foundation (EAF) event. It is not a '
    'school or Dublin Unified School District (DUSD) event. Everyone who '
    'attends agrees to this code: participants, spectators, experts, '
    'volunteers and organizers.';

/// One titled part of the code.
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

const codeOfConductSections = [
  ConductSection('How everyone is expected to act', [
    ConductPoint('Be respectful and responsible',
        'Act in a way that reflects well on Emerald High School, your family '
            'and yourself.'),
    ConductPoint('No alcohol, tobacco, drugs or vaping',
        'These are not allowed anywhere at the event, the same as under DUSD '
            'policy.'),
    ConductPoint('Treat people well',
        'No inappropriate language, bullying, harassment or disruptive '
            'behavior.'),
    ConductPoint('No violence',
        'Fighting and threats are not tolerated.'),
    ConductPoint('Respect the building',
        'Take care of the school and everything in it. Damage, littering and '
            'vandalism break this code.'),
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
        'DUSD staff who attend are not covered by district insurance for this '
            'event. Chaperones and sponsors are not acting for DUSD and are '
            'not covered by its liability insurance.'),
    ConductPoint('Hold harmless',
        'By attending, you agree to hold harmless and indemnify Emerald High '
            'School, EAF, and the event staff and chaperones for any personal '
            'injury, loss or property damage during the event.'),
    ConductPoint('Insurance',
        'Neither DUSD nor EAF provides insurance for the Summit. Your own '
            "insurance, or your parents' or guardians', applies."),
  ]),
  ConductSection('Photos and video', [
    ConductPoint('The Summit is photographed',
        'EHS and EAF take photos, video and audio during the event and may '
            'share them to promote it on social media, websites, newsletters '
            'and other materials, without payment.'),
    ConductPoint('Opting out',
        "If you don't want to appear in them, email contact@ehsacademics.org "
            'before the Summit or tell the front desk when you arrive.'),
  ]),
  ConductSection('Agreeing', [
    ConductPoint('What the checkbox means',
        "By ticking the box, you confirm you've read this code, agree to "
            'follow it, and accept the liability and insurance terms above. '
            "If you're under 18, read it with a parent or guardian."),
  ]),
];

/// The checkbox under the code.
const codeOfConductCheckbox =
    "I've read the Code of Conduct and agree to follow it.";
