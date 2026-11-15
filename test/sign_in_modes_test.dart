import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:emerald_summit/app_state.dart';
import 'package:emerald_summit/backend/auth_service.dart';
import 'package:emerald_summit/backend/service_locator.dart';
import 'package:emerald_summit/models/user_profile.dart';
import 'package:emerald_summit/screens/auth/sign_in_screen.dart';
import 'package:emerald_summit/screens/auth/welcome_screen.dart';

/// Signed out. Only `known@example.com` has an account; records every code
/// request and whether it could create an account.
class _Auth implements AuthService {
  final requests = <({String email, bool create})>[];

  @override
  Stream<void> get authStateChanges => const Stream.empty();
  @override
  AuthUser? get currentUser => null;
  @override
  bool get isSignedIn => false;
  @override
  Future<void> sendEmailOtp(String email, {bool createAccount = true}) async {
    requests.add((email: email, create: createAccount));
    if (!createAccount && email != 'known@example.com') {
      throw const NoAccountFailure();
    }
  }

  @override
  Future<void> verifyEmailOtp({
    required String email,
    required String code,
  }) async {}
  @override
  Future<bool> isTestAccount(String email) async => false;
  @override
  Future<void> signInWithTestAccount({
    required String email,
    required String password,
  }) async {}
  @override
  bool get supportsGoogleSignIn => false;
  @override
  Future<void> signInWithGoogle() async {}
  @override
  Future<void> signOut() async {}
}

Future<_Auth> _setUp() async {
  await getIt.reset();
  await configureBackend();
  final auth = _Auth();
  getIt
    ..unregister<AuthService>()
    ..registerSingleton<AuthService>(auth);
  appState.pendingSignUpRole = null;
  return auth;
}

Future<void> _sendCode(WidgetTester tester, String email) async {
  await tester.enterText(find.byType(TextField), email);
  await tester.tap(find.text('Email me a code'));
  await tester.pumpAndSettle();
}

void main() {
  testWidgets('sign in reaches an existing account only', (tester) async {
    final auth = await _setUp();
    await tester.pumpWidget(const MaterialApp(
        home: SignInScreen(role: SummitRole.participant)));
    expect(find.text('Sign in as Participant'), findsOneWidget);
    await _sendCode(tester, 'known@example.com');
    expect(auth.requests.single.create, isFalse);
    expect(find.text('Enter the code we emailed to known@example.com.'),
        findsOneWidget);
  });

  testWidgets('a new email from sign in is offered sign up', (tester) async {
    final auth = await _setUp();
    await tester.pumpWidget(const MaterialApp(
        home: SignInScreen(role: SummitRole.parentSpectator)));
    await _sendCode(tester, 'new@example.com');
    expect(find.text("Let's create you an account!"), findsOneWidget);
    expect(find.textContaining('create your Spectator account'),
        findsOneWidget);

    await tester.ensureVisible(find.text('Continue'));
    await tester.tap(find.text('Continue'));
    await tester.pumpAndSettle();
    expect(auth.requests.last.create, isTrue);
    expect(find.text('Sign up as Spectator'), findsOneWidget);
    expect(find.text('Enter the code we emailed to new@example.com.'),
        findsOneWidget);
  });

  testWidgets('sign up creates the account and remembers the role', (
    tester,
  ) async {
    final auth = await _setUp();
    await tester.pumpWidget(const MaterialApp(
        home: SignInScreen(role: SummitRole.volunteer, signUp: true)));
    expect(appState.pendingSignUpRole, SummitRole.volunteer);
    await _sendCode(tester, 'new@example.com');
    expect(auth.requests.single.create, isTrue);
  });

  testWidgets('sign in and sign up link to each other', (tester) async {
    await _setUp();
    await tester.pumpWidget(const MaterialApp(
        home: SignInScreen(role: SummitRole.expert)));
    expect(find.text('New to the Summit?'), findsOneWidget);
    await tester.ensureVisible(find.text('Sign up'));
    await tester.tap(find.text('Sign up'));
    await tester.pumpAndSettle();
    expect(find.text('Sign up as Expert'), findsOneWidget);
    expect(find.text('Already have an account?'), findsOneWidget);
  });

  testWidgets('the role list opens sign in for a role and goes back', (
    tester,
  ) async {
    await _setUp();
    await tester.pumpWidget(const MaterialApp(home: WelcomeScreen()));
    expect(find.text('How are you joining the Summit?'), findsOneWidget);
    expect(find.text('ATTENDING THE SUMMIT'), findsOneWidget);
    expect(find.text('HELPING RUN THE SUMMIT'), findsOneWidget);
    expect(find.text('Admin'), findsNothing);

    final volunteerSignIn = find.bySemanticsLabel('Sign in as Volunteer');
    await tester.ensureVisible(volunteerSignIn);
    await tester.tap(volunteerSignIn);
    await tester.pumpAndSettle();
    expect(find.text('Sign in as Volunteer'), findsOneWidget);

    await tester.tap(find.byTooltip('Back'));
    await tester.pumpAndSettle();
    await tester.ensureVisible(find.text('Organizer sign in'));
    await tester.tap(find.text('Organizer sign in'));
    await tester.pumpAndSettle();
    expect(find.text('For Summit admins and test accounts.'), findsOneWidget);
    expect(find.text('New to the Summit?'), findsNothing);
  });
}
