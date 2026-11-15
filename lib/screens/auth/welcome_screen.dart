import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../models/user_profile.dart';
import 'sign_in_screen.dart';

/// What a signed-out person sees first: "How are you joining the Summit?",
/// like the website's roles page. Each role has Sign in and Sign up, which
/// open [SignInScreen] in place (no route is pushed, so the auth gate's
/// switch to the app after sign-in isn't covered by a leftover page).
/// Admins and test accounts use Organizer sign in at the bottom.
class WelcomeScreen extends StatefulWidget {
  const WelcomeScreen({super.key});

  static const contactEmail = 'contact@ehsacademics.org';

  @override
  State<WelcomeScreen> createState() => _WelcomeScreenState();
}

class _WelcomeScreenState extends State<WelcomeScreen> {
  SummitRole? _role;
  bool _signUp = false;

  void _open(SummitRole role, {bool signUp = false}) => setState(() {
        _role = role;
        _signUp = signUp;
      });

  @override
  Widget build(BuildContext context) {
    final role = _role;
    if (role != null) {
      return PopScope(
        canPop: false,
        onPopInvokedWithResult: (didPop, _) {
          if (!didPop) setState(() => _role = null);
        },
        child: SignInScreen(
          key: ValueKey('$role-$_signUp'),
          role: role,
          signUp: _signUp,
          onBack: () => setState(() => _role = null),
        ),
      );
    }
    return _RoleChooser(onOpen: _open);
  }
}

class _RoleChooser extends StatelessWidget {
  const _RoleChooser({required this.onOpen});

  final void Function(SummitRole role, {bool signUp}) onOpen;

  static const _attending = [
    SummitRole.participant,
    SummitRole.parentSpectator,
    SummitRole.expert,
  ];
  static const _helping = [SummitRole.volunteer];

  Future<void> _contact(BuildContext context) async {
    final ok = await launchUrl(
        Uri(scheme: 'mailto', path: WelcomeScreen.contactEmail));
    if (!ok && context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          content: Text('Email ${WelcomeScreen.contactEmail}')));
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final muted = theme.textTheme.bodyMedium
        ?.copyWith(color: scheme.onSurfaceVariant, height: 1.4);
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(20, 24, 20, 24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 520),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(
                    "Emerald Summit ’27 · Dublin, CA",
                    textAlign: TextAlign.center,
                    style: theme.textTheme.labelLarge
                        ?.copyWith(color: scheme.primary),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'How are you joining the Summit?',
                    textAlign: TextAlign.center,
                    style: theme.textTheme.headlineMedium
                        ?.copyWith(fontWeight: FontWeight.w700, height: 1.1),
                  ),
                  const SizedBox(height: 10),
                  Text(
                    'Choose the option that fits you best, then sign in or '
                    'create an account.',
                    textAlign: TextAlign.center,
                    style: muted,
                  ),
                  const SizedBox(height: 20),
                  // The Summit logo in a large white circle.
                  Center(
                    child: Container(
                      width: 136,
                      height: 136,
                      padding: const EdgeInsets.all(5),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        shape: BoxShape.circle,
                        boxShadow: [
                          BoxShadow(
                            color: const Color(0xFF0C7A55)
                                .withValues(alpha: 0.35),
                            blurRadius: 40,
                            offset: const Offset(0, 18),
                            spreadRadius: -18,
                          ),
                        ],
                      ),
                      child: ClipOval(
                        child: Image.asset(
                          'assets/branding/logo.png',
                          fit: BoxFit.cover,
                          semanticLabel: 'Emerald Summit logo',
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 18),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Container(
                        width: 48,
                        height: 48,
                        padding: const EdgeInsets.all(2),
                        decoration: const BoxDecoration(
                          color: Colors.white,
                          shape: BoxShape.circle,
                        ),
                        child: ClipOval(
                          child: Image.asset(
                            'assets/branding/eaf_logo.png',
                            fit: BoxFit.cover,
                            excludeFromSemantics: true,
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'ORGANIZED BY',
                            style: theme.textTheme.labelSmall?.copyWith(
                              letterSpacing: 1.4,
                              fontWeight: FontWeight.w700,
                              color: scheme.onSurfaceVariant,
                            ),
                          ),
                          Text('EHS Academic Foundation',
                              style: theme.textTheme.titleSmall),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 28),
                  _Section(
                    heading: 'Attending the Summit',
                    roles: _attending,
                    onOpen: onOpen,
                  ),
                  const SizedBox(height: 24),
                  _Section(
                    heading: 'Helping run the Summit',
                    roles: _helping,
                    onOpen: onOpen,
                  ),
                  const SizedBox(height: 24),
                  Wrap(
                    alignment: WrapAlignment.spaceBetween,
                    crossAxisAlignment: WrapCrossAlignment.center,
                    spacing: 12,
                    runSpacing: 4,
                    children: [
                      Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text('Not sure?', style: muted),
                          TextButton(
                            onPressed: () => _contact(context),
                            child: const Text('Contact the EAF team'),
                          ),
                        ],
                      ),
                      TextButton(
                        onPressed: () => onOpen(SummitRole.admin),
                        style: TextButton.styleFrom(
                            foregroundColor: scheme.onSurfaceVariant),
                        child: const Text('Organizer sign in'),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _Section extends StatelessWidget {
  const _Section(
      {required this.heading, required this.roles, required this.onOpen});

  final String heading;
  final List<SummitRole> roles;
  final void Function(SummitRole role, {bool signUp}) onOpen;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          heading.toUpperCase(),
          style: theme.textTheme.labelSmall?.copyWith(
            letterSpacing: 1.4,
            fontWeight: FontWeight.w700,
            color: theme.colorScheme.onSurfaceVariant,
          ),
        ),
        const SizedBox(height: 10),
        for (final role in roles)
          Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: _RoleCard(role: role, onOpen: onOpen),
          ),
      ],
    );
  }
}

/// The role colors from the website's roles list.
Color roleColor(SummitRole role) => switch (role) {
      SummitRole.participant => const Color(0xFF0EA5E9),
      SummitRole.parentSpectator => const Color(0xFF2563EB),
      SummitRole.expert => const Color(0xFF7C3AED),
      SummitRole.volunteer => const Color(0xFFE11D48),
      SummitRole.admin => const Color(0xFF0C7A55),
    };

class _RoleCard extends StatelessWidget {
  const _RoleCard({required this.role, required this.onOpen});

  final SummitRole role;
  final void Function(SummitRole role, {bool signUp}) onOpen;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: roleColor(role),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(role.icon, color: Colors.white),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(role.label,
                          style: theme.textTheme.titleMedium
                              ?.copyWith(fontWeight: FontWeight.w700)),
                      const SizedBox(height: 2),
                      Text(
                        role.blurb,
                        style: theme.textTheme.bodySmall?.copyWith(
                            color: theme.colorScheme.onSurfaceVariant),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: Semantics(
                    label: 'Sign in as ${role.label}',
                    excludeSemantics: true,
                    button: true,
                    child: OutlinedButton(
                      onPressed: () => onOpen(role),
                      child: const Text('Sign in'),
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Semantics(
                    label: 'Sign up as ${role.label}',
                    excludeSemantics: true,
                    button: true,
                    child: FilledButton(
                      onPressed: () => onOpen(role, signUp: true),
                      child: const Text('Sign up'),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
