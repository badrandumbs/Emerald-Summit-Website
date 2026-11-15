import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:emerald_summit/backend/repositories.dart';
import 'package:emerald_summit/backend/service_locator.dart';
import 'package:emerald_summit/screens/report_screen.dart';

Future<void> _pump(WidgetTester tester, {ReportKind kind = ReportKind.bug}) async {
  await getIt.reset();
  await configureBackend();
  tester.view.physicalSize = const Size(375 * 3, 900 * 3);
  tester.view.devicePixelRatio = 3;
  addTearDown(tester.view.reset);
  await tester.pumpWidget(MaterialApp(home: ReportScreen(kind: kind)));
}

void main() {
  testWidgets('a bug report needs a description, then shows its ticket', (
    tester,
  ) async {
    await _pump(tester);
    expect(find.text('Report a bug'), findsOneWidget);
    await tester.enterText(find.widgetWithText(TextField, 'Your name'), 'Sam');
    await tester.tap(find.text('Send bug report'));
    await tester.pump();
    expect(find.text('Please describe the bug.'), findsOneWidget);

    await tester.enterText(
        find.widgetWithText(TextField, 'What went wrong?'), 'Schedule is blank');
    await tester.tap(find.text('Send bug report'));
    // Reading the build and device goes through platform channels, which
    // answer outside the test's fake clock.
    await tester.runAsync(() => Future<void>.delayed(const Duration(milliseconds: 200)));
    await tester.pumpAndSettle();
    expect(find.text('Thanks, we got your bug report'), findsOneWidget);
    expect(find.text('Your ticket is Bug #1.'), findsOneWidget);
  });

  testWidgets('the switch moves a ticket to feedback', (tester) async {
    await _pump(tester);
    await tester.tap(find.text('Feedback'));
    await tester.pump();
    expect(find.text('Send feedback'), findsWidgets);
    expect(find.widgetWithText(TextField, 'Your feedback'), findsOneWidget);
  });

  testWidgets('it lists what else is sent', (tester) async {
    await _pump(tester, kind: ReportKind.feedback);
    expect(find.text('Email me a copy'), findsOneWidget);
    await tester.tap(find.text('What else is sent with your report'));
    await tester.pump();
    expect(find.textContaining('Not your phone number or student ID'),
        findsOneWidget);
  });

  test('server refusals read as words', () {
    expect(reportErrorMessage(Exception('too_many_reports')),
        contains("You've sent a lot of reports"));
    expect(reportErrorMessage(Exception('something else')),
        "We couldn't send your report. Please try again.");
  });

  test('Markdown export has the description and both JSON blocks', () {
    final r = BugReport(
      id: 'x',
      ticketNo: 12,
      kind: ReportKind.feedback,
      reporterName: 'Sam',
      description: 'Love it',
      screenshots: const [],
      client: const {'app': 'ios'},
      snapshot: const {'profile': {'role': 'participant'}},
      resolved: false,
      createdAt: DateTime.utc(2026, 11, 14),
    );
    final md = reportAsMarkdown(r, links: const ['https://x/1']);
    expect(md, startsWith('# Feedback #12'));
    expect(md, contains('Love it'));
    expect(md, contains('- [Screenshot 1](https://x/1)'));
    expect(md, contains('"app": "ios"'));
    expect(md, contains('"role": "participant"'));
  });

  test('new ids are version 4 UUIDs', () {
    expect(newUuid(),
        matches(RegExp(r'^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$')));
  });
}
