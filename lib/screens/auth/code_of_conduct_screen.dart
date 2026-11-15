import 'package:flutter/material.dart';

import '../../app_state.dart';
import '../../models/code_of_conduct.dart';
import '../../models/user_profile.dart';

/// The last sign-up step, and a one-time step for accounts that signed up
/// before it existed: read the role's agreement ([agreementFor]: the Speaker
/// Policy for experts, the Code of Conduct for everyone else) in a window
/// (Expand opens it full screen) and tick the box. Shown by the auth gate
/// while [AppState.needsCodeOfConduct].
class CodeOfConductScreen extends StatefulWidget {
  const CodeOfConductScreen({super.key});

  @override
  State<CodeOfConductScreen> createState() => _CodeOfConductScreenState();
}

class _CodeOfConductScreenState extends State<CodeOfConductScreen> {
  bool _agreed = false;
  bool _busy = false;
  String? _error;

  Future<void> _continue() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await appState.agreeToCodeOfConduct();
      // The auth gate moves on once the profile says it's agreed.
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _busy = false;
        _error = "Couldn't save that. Check your connection and try again.";
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final agreement =
        agreementFor(appState.profile?.role ?? SummitRole.participant);
    return Scaffold(
      appBar: AppBar(
        title: Text(agreement.name),
        automaticallyImplyLeading: false,
      ),
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 560),
            child: ListView(
              padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
              children: [
                Text(
                  'One last step',
                  style: theme.textTheme.headlineSmall,
                ),
                const SizedBox(height: 6),
                Text(
                  '${agreement.whoAgrees} Read it below, or expand it to '
                  'read it full screen.',
                  style: theme.textTheme.bodyMedium?.copyWith(
                      color: theme.colorScheme.onSurfaceVariant),
                ),
                const SizedBox(height: 16),
                CodeOfConductWindow(agreement: agreement),
                const SizedBox(height: 12),
                CheckboxListTile(
                  value: _agreed,
                  onChanged: _busy
                      ? null
                      : (v) => setState(() => _agreed = v ?? false),
                  controlAffinity: ListTileControlAffinity.leading,
                  contentPadding: EdgeInsets.zero,
                  title: Text(agreement.checkbox),
                ),
                if (_error != null) ...[
                  const SizedBox(height: 4),
                  Text(_error!,
                      style: theme.textTheme.bodySmall
                          ?.copyWith(color: theme.colorScheme.error)),
                ],
                const SizedBox(height: 12),
                FilledButton(
                  onPressed: _agreed && !_busy ? _continue : null,
                  child: _busy
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Text('Agree and continue'),
                ),
                const SizedBox(height: 8),
                TextButton(
                  onPressed: _busy ? null : appState.signOut,
                  child: const Text('Sign out'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// An agreement in a bordered, scrollable window, with Expand to read it
/// full screen.
class CodeOfConductWindow extends StatefulWidget {
  const CodeOfConductWindow(
      {super.key, required this.agreement, this.height = 260});

  final SummitAgreement agreement;
  final double height;

  @override
  State<CodeOfConductWindow> createState() => _CodeOfConductWindowState();
}

class _CodeOfConductWindowState extends State<CodeOfConductWindow> {
  final _scroll = ScrollController();

  @override
  void dispose() {
    _scroll.dispose();
    super.dispose();
  }

  void _expand(BuildContext context) {
    Navigator.of(context).push(MaterialPageRoute<void>(
      fullscreenDialog: true,
      builder: (context) => Scaffold(
        appBar: AppBar(title: Text(widget.agreement.name)),
        body: SafeArea(
          child: ListView(
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 32),
            children: [CodeOfConductText(agreement: widget.agreement)],
          ),
        ),
      ),
    ));
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: scheme.outlineVariant),
        color: scheme.surfaceContainerLow,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          SizedBox(
            height: widget.height,
            child: Scrollbar(
              controller: _scroll,
              thumbVisibility: true,
              child: SingleChildScrollView(
                controller: _scroll,
                padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
                child: CodeOfConductText(agreement: widget.agreement),
              ),
            ),
          ),
          Divider(height: 1, color: scheme.outlineVariant),
          TextButton.icon(
            onPressed: () => _expand(context),
            icon: const Icon(Icons.open_in_full, size: 18),
            label: const Text('Expand'),
          ),
        ],
      ),
    );
  }
}

/// A whole agreement: title, intro, and each section's rules.
class CodeOfConductText extends StatelessWidget {
  const CodeOfConductText({super.key, required this.agreement});

  final SummitAgreement agreement;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final body = theme.textTheme.bodyMedium?.copyWith(height: 1.45);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(agreement.title, style: theme.textTheme.titleMedium),
        const SizedBox(height: 8),
        Text(agreement.intro, style: body),
        for (final section in agreement.sections) ...[
          const SizedBox(height: 16),
          Text(section.title,
              style: theme.textTheme.titleSmall
                  ?.copyWith(color: theme.colorScheme.primary)),
          for (final point in section.points)
            Padding(
              padding: const EdgeInsets.only(top: 6),
              child: Text.rich(
                TextSpan(children: [
                  TextSpan(
                      text: '${point.lead}. ',
                      style: const TextStyle(fontWeight: FontWeight.w700)),
                  TextSpan(text: point.text),
                ]),
                style: body,
              ),
            ),
        ],
      ],
    );
  }
}
