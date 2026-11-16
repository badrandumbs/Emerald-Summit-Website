import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:emerald_summit/backend/repositories.dart';
import 'package:emerald_summit/backend/service_locator.dart';
import 'package:emerald_summit/screens/photo_permission_screen.dart';

void main() {
  setUp(() async {
    await getIt.reset();
    await configureBackend();
  });

  test('the row reads the three answers', () {
    PhotoPermission row(Object? consent) => PhotoPermission.fromMap({
          'user_id': 'u',
          'full_name': 'Sam',
          'email': 's@x.org',
          'role': 'parentSpectator',
          'school': ' ',
          'photo_consent': consent,
        });
    expect(row(false).granted, isFalse);
    expect(row(true).granted, isTrue);
    expect(row(null).granted, isNull);
    expect(row(null).school, isNull);
  });

  testWidgets('admins see who did not allow photos first', (tester) async {
    await tester.pumpWidget(const MaterialApp(home: PhotoPermissionScreen()));
    await tester.pumpAndSettle();
    expect(find.text('Did not allow photos (1)'), findsOneWidget);
    expect(find.text('Ava Thompson'), findsOneWidget);
    expect(find.text('Not answered yet (1)'), findsOneWidget);
    expect(find.text('Chloe Park'), findsOneWidget);
    // Granted is collapsed.
    expect(find.text('Allowed photos (1)'), findsOneWidget);
    expect(find.text('Ben Ortiz'), findsNothing);

    await tester.enterText(find.byType(TextField), 'chloe');
    await tester.pump();
    expect(find.text('Did not allow photos (0)'), findsOneWidget);
    expect(find.text('Chloe Park'), findsOneWidget);
  });
}
