import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:emerald_summit/app_state.dart';
import 'package:emerald_summit/backend/service_locator.dart';
import 'package:emerald_summit/models/code_of_conduct.dart';
import 'package:emerald_summit/models/models.dart';
import 'package:emerald_summit/models/user_profile.dart';
import 'package:emerald_summit/screens/auth/code_of_conduct_screen.dart';
import 'package:emerald_summit/widgets/eighth_grade_badge.dart';
import 'package:emerald_summit/screens/session_detail_screen.dart';

UserProfile _profile({
  SummitRole role = SummitRole.participant,
  String? grade = '11',
  bool tracks = true,
  String? version,
}) => UserProfile(
  id: 'u1',
  email: 'alex@example.com',
  fullName: 'Alex Rivera',
  role: role,
  onboarded: true,
  details: {'grade': ?grade},
  tracksCodeOfConduct: tracks,
  codeOfConductVersion: version,
);

void main() {
  setUp(() async {
    await getIt.reset();
    await configureBackend();
  });
  tearDown(() => appState.profile = null);

  test('every role is asked until they agree to this version', () {
    for (final role in SummitRole.values) {
      appState.profile = _profile(role: role);
      expect(appState.needsCodeOfConduct, isTrue, reason: role.name);
    }
    appState.profile = _profile(version: codeOfConduct.version);
    expect(appState.needsCodeOfConduct, isFalse);
    // Experts agree to the Guest Expert Policy, not the Code of Conduct.
    appState.profile = _profile(
      role: SummitRole.expert,
      version: codeOfConduct.version,
    );
    expect(appState.needsCodeOfConduct, isTrue);
    appState.profile = _profile(
      role: SummitRole.expert,
      version: guestExpertPolicy.version,
    );
    expect(appState.needsCodeOfConduct, isFalse);
    appState.profile = _profile(version: 'an-older-version');
    expect(appState.needsCodeOfConduct, isTrue);
  });

  test('nobody is asked before the SQL adds the columns', () {
    appState.profile = _profile(tracks: false);
    expect(appState.needsCodeOfConduct, isFalse);
  });

  test('the profile row says whether the columns exist', () {
    final before = UserProfile.fromMap({'id': 'a', 'email': 'x'});
    expect(before.tracksCodeOfConduct, isFalse);
    final after = UserProfile.fromMap({
      'id': 'a',
      'email': 'x',
      'code_of_conduct_version': null,
    });
    expect(after.tracksCodeOfConduct, isTrue);
    expect(after.codeOfConductVersion, isNull);
  });

  testWidgets('the box has to be ticked before continuing', (tester) async {
    tester.view.physicalSize = const Size(402 * 3, 2000 * 3);
    tester.view.devicePixelRatio = 3;
    addTearDown(tester.view.reset);
    appState.profile = _profile();
    await profileRepository.save(appState.profile!);
    await tester.pumpWidget(const MaterialApp(home: CodeOfConductScreen()));

    expect(find.text(codeOfConduct.title), findsOneWidget);
    // The photo question is asked once, as the radio, not again in the window.
    expect(find.text(codeOfConduct.mediaChoice!.grant), findsOneWidget);
    expect(find.textContaining('___'), findsNothing);
    final button = find.widgetWithText(FilledButton, 'Agree and continue');
    expect(tester.widget<FilledButton>(button).onPressed, isNull);

    await tester.tap(find.text(codeOfConduct.checkbox));
    await tester.pump();
    // The photo question has to be answered too.
    expect(tester.widget<FilledButton>(button).onPressed, isNull);
    await tester.ensureVisible(
      find.text(codeOfConduct.mediaChoice!.doNotGrant),
    );
    await tester.tap(find.text(codeOfConduct.mediaChoice!.doNotGrant));
    await tester.pump();
    expect(tester.widget<FilledButton>(button).onPressed, isNotNull);
    await tester.ensureVisible(button);
    await tester.tap(button);
    await tester.pump();
    expect(appState.profile!.codeOfConductVersion, codeOfConduct.version);
    expect(appState.profile!.photoConsent, isFalse);
    expect(appState.needsCodeOfConduct, isFalse);
  });

  testWidgets('Expand opens the whole code full screen', (tester) async {
    appState.profile = _profile();
    await tester.pumpWidget(const MaterialApp(home: CodeOfConductScreen()));
    await tester.tap(find.text('Expand'));
    await tester.pumpAndSettle();
    expect(find.text('Liability & Legal Disclaimer'), findsOneWidget);
    expect(find.text(codeOfConduct.checkbox), findsNothing);
  });

  group('8th graders', () {
    test('only an 8th-grade participant gets the marks', () {
      appState.profile = _profile(grade: '8');
      expect(appState.isEighthGradeParticipant, isTrue);
      appState.profile = _profile(grade: '9');
      expect(appState.isEighthGradeParticipant, isFalse);
      appState.profile = _profile(grade: '8', role: SummitRole.parentSpectator);
      expect(appState.isEighthGradeParticipant, isFalse);
    });

    testWidgets('the session page says whether they can participate', (
      tester,
    ) async {
      tester.platformDispatcher.accessibilityFeaturesTestValue =
          const FakeAccessibilityFeatures(disableAnimations: true);
      addTearDown(
        tester.platformDispatcher.clearAccessibilityFeaturesTestValue,
      );
      await appState.loadCatalog();
      appState.profile = _profile(grade: '8');
      final base = appState.allSessions.first;
      Session withFlag(bool allow) => Session.fromMap({
        'id': base.id,
        'discipline_id': base.disciplineId,
        'title': base.title,
        'discipline_name': base.disciplineName,
        'start_time': base.start,
        'end_time': base.end,
        'capacity': base.capacity,
        'allow_eighth_graders': allow,
      });

      await tester.pumpWidget(
        MaterialApp(home: SessionDetailScreen(session: withFlag(false))),
      );
      await tester.pump();
      expect(find.byType(EighthGradeBadge), findsNothing);
      expect(find.textContaining('Not open to 8th graders'), findsOneWidget);
    });
  });

  testWidgets('experts see the Guest Expert Policy, with no photo question', (
    tester,
  ) async {
    appState.profile = _profile(role: SummitRole.expert);
    await tester.pumpWidget(const MaterialApp(home: CodeOfConductScreen()));
    expect(find.text(guestExpertPolicy.title), findsOneWidget);
    expect(find.text(guestExpertPolicy.checkbox), findsOneWidget);
    expect(find.text(codeOfConduct.title), findsNothing);
    expect(find.byType(RadioListTile<bool>), findsNothing);
  });

  test('the texts are the documents, not summaries', () {
    String all(SummitAgreement a) => [
      a.title,
      ...a.preamble,
      for (final s in a.sections) ...[
        s.title,
        for (final b in s.blocks) '${b.lead ?? ''} ${b.text}',
      ],
      ?a.mediaChoice?.grant,
    ].join(' ');
    final conduct = all(codeOfConduct);
    expect(conduct, contains('It is NOT a school/DUSD-sponsored event.'));
    expect(conduct, contains('through the travel agency'));
    expect(conduct, contains('the EHS PFSO'));
    expect(
      codeOfConduct.mediaChoice!.grant,
      contains('I waive the right to inspect'),
    );
    final expert = all(guestExpertPolicy);
    expect(expert, contains('CivicVerse tracks may cover civics'));
    expect(expert, contains('LinkedIn link (optional) and headshot'));
    expect(expert, contains('no signature is needed'));
  });
}
