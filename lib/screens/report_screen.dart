import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

import '../app_state.dart';
import '../backend/diagnostics.dart';
import '../backend/repositories.dart';
import '../backend/service_locator.dart';

/// "Report a bug" and "Send feedback", opened from their own rows on Profile.
/// They're two categories of ticket (`bug_reports.kind`); the switch at the
/// top moves a ticket between them before it's sent. Name and description are
/// required; screenshots and an emailed copy are optional. Everything else is
/// attached automatically, and the form says what. Same fields and words as
/// the website's ReportDialog.
class ReportScreen extends StatefulWidget {
  const ReportScreen({super.key, this.kind = ReportKind.bug});

  final ReportKind kind;

  /// What else a report carries, listed under "What else is sent".
  static const attached = [
    'Your sign-in email, role, school and grade',
    'The sessions on your day, any team, sessions you manage, and your '
        'check-in',
    'Your last 10 notifications',
    'The screens you opened in the app before reporting, and any errors '
        'they showed',
    'Your phone model, screen size, theme and the version of the app',
  ];

  @override
  State<ReportScreen> createState() => _ReportScreenState();
}

class _ReportScreenState extends State<ReportScreen> {
  late ReportKind _kind = widget.kind;
  late final _name =
      TextEditingController(text: appState.profile?.fullName ?? '');
  final _description = TextEditingController();
  final _shots = <ReportScreenshot>[];
  bool _emailCopy = true;
  bool _showAttached = false;
  bool _sending = false;
  String? _problem;
  ReportSubmitResult? _result;

  String get _email => appState.profile?.email ?? 'your email';

  @override
  void dispose() {
    _name.dispose();
    _description.dispose();
    super.dispose();
  }

  static String? _mimeFor(XFile f) {
    final declared = f.mimeType;
    if (declared != null && reportScreenshotTypes.containsKey(declared)) {
      return declared;
    }
    final ext = f.name.split('.').last.toLowerCase();
    return switch (ext) {
      'jpg' || 'jpeg' => 'image/jpeg',
      'png' => 'image/png',
      'webp' => 'image/webp',
      'heic' => 'image/heic',
      'heif' => 'image/heif',
      'gif' => 'image/gif',
      _ => null,
    };
  }

  Future<void> _addScreenshots() async {
    setState(() => _problem = null);
    final room = maxReportScreenshots - _shots.length;
    if (room <= 0) {
      setState(() => _problem =
          'You can attach up to $maxReportScreenshots screenshots.');
      return;
    }
    List<XFile> picked;
    try {
      picked = await ImagePicker().pickMultiImage(limit: room);
    } catch (_) {
      setState(() => _problem = "Couldn't open your photos.");
      return;
    }
    String? problem;
    final added = <ReportScreenshot>[];
    for (final f in picked) {
      final mime = _mimeFor(f);
      if (mime == null) {
        problem = "${f.name} isn't an image.";
        continue;
      }
      final bytes = await f.readAsBytes();
      if (bytes.length > maxScreenshotBytes) {
        problem = '${f.name} is over 10 MB.';
        continue;
      }
      if (added.length < room) {
        added.add(ReportScreenshot(bytes: bytes, mimeType: mime, name: f.name));
      } else {
        problem = 'You can attach up to $maxReportScreenshots screenshots.';
      }
    }
    if (!mounted) return;
    setState(() {
      _shots.addAll(added);
      _problem = problem;
    });
  }

  Future<void> _send() async {
    if (_name.text.trim().isEmpty) {
      setState(() => _problem = 'Please add your name.');
      return;
    }
    if (_description.text.trim().isEmpty) {
      setState(() => _problem = _kind == ReportKind.bug
          ? 'Please describe the bug.'
          : 'Please write your feedback.');
      return;
    }
    setState(() {
      _problem = null;
      _sending = true;
    });
    try {
      final client = await diagnostics.collect(context);
      final result = await bugReportsRepository.submit(BugReportInput(
        kind: _kind,
        name: _name.text,
        description: _description.text,
        screenshots: _shots,
        emailCopy: _emailCopy,
        client: client,
      ));
      if (!mounted) return;
      setState(() {
        _result = result;
        _sending = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _problem = reportErrorMessage(e);
        _sending = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final result = _result;
    return PopScope(
      canPop: !_sending,
      child: Scaffold(
        appBar: AppBar(
          title: Text(result != null
              ? 'Sent'
              : _kind == ReportKind.bug
                  ? 'Report a bug'
                  : 'Send feedback'),
        ),
        body: SafeArea(
          child: result != null ? _sent(context, result) : _form(context),
        ),
      ),
    );
  }

  Widget _sent(BuildContext context, ReportSubmitResult result) {
    final theme = Theme.of(context);
    final muted = theme.textTheme.bodyMedium
        ?.copyWith(color: theme.colorScheme.onSurfaceVariant);
    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.check_circle_outline,
                size: 48, color: theme.colorScheme.primary),
            const SizedBox(height: 12),
            Text(
              _kind == ReportKind.bug
                  ? 'Thanks, we got your bug report'
                  : 'Thanks for the feedback',
              textAlign: TextAlign.center,
              style: theme.textTheme.titleLarge,
            ),
            const SizedBox(height: 6),
            Text(
              'Your ticket is ${_kind.ticketLabel} #${result.ticketNo}.',
              textAlign: TextAlign.center,
              style: muted,
            ),
            if (result.emailed == true) ...[
              const SizedBox(height: 8),
              Text(
                'We emailed a copy to $_email, with everything that was '
                'sent.',
                textAlign: TextAlign.center,
                style: muted,
              ),
            ],
            if (result.emailed == false) ...[
              const SizedBox(height: 8),
              Text(
                "Your report was saved, but we couldn't email your copy.",
                textAlign: TextAlign.center,
                style: muted,
              ),
            ],
            const SizedBox(height: 20),
            FilledButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Done'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _form(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final muted =
        theme.textTheme.bodySmall?.copyWith(color: scheme.onSurfaceVariant);
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 32),
      children: [
        SegmentedButton<ReportKind>(
          segments: const [
            ButtonSegment(
              value: ReportKind.bug,
              label: Text('Bug report'),
              icon: Icon(Icons.bug_report_outlined),
            ),
            ButtonSegment(
              value: ReportKind.feedback,
              label: Text('Feedback'),
              icon: Icon(Icons.chat_bubble_outline),
            ),
          ],
          selected: {_kind},
          onSelectionChanged: _sending
              ? null
              : (s) => setState(() {
                    _kind = s.first;
                    _problem = null;
                  }),
        ),
        const SizedBox(height: 20),
        TextField(
          controller: _name,
          enabled: !_sending,
          maxLength: maxReporterName,
          textCapitalization: TextCapitalization.words,
          autofillHints: const [AutofillHints.name],
          decoration: const InputDecoration(
            labelText: 'Your name',
            counterText: '',
            border: OutlineInputBorder(),
          ),
        ),
        const SizedBox(height: 16),
        ListenableBuilder(
          listenable: _description,
          builder: (context, _) => TextField(
            controller: _description,
            enabled: !_sending,
            minLines: 5,
            maxLines: 10,
            maxLength: maxReportDescription,
            textCapitalization: TextCapitalization.sentences,
            decoration: InputDecoration(
              labelText: _kind == ReportKind.bug
                  ? 'What went wrong?'
                  : 'Your feedback',
              hintText: _kind == ReportKind.bug
                  ? 'What were you doing, what happened, and what did you '
                      'expect to happen?'
                  : 'What would make the Summit app better?',
              hintMaxLines: 3,
              alignLabelWithHint: true,
              // Only once it gets close to the limit.
              counterText: _description.text.length >
                      maxReportDescription - 500
                  ? null
                  : '',
              border: const OutlineInputBorder(),
            ),
          ),
        ),
        const SizedBox(height: 16),
        Text.rich(
          TextSpan(children: [
            TextSpan(text: 'Screenshots ', style: theme.textTheme.titleSmall),
            TextSpan(
                text: '(optional, up to $maxReportScreenshots)', style: muted),
          ]),
        ),
        const SizedBox(height: 8),
        if (_shots.isNotEmpty) ...[
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (var i = 0; i < _shots.length; i++)
                Stack(
                  children: [
                    ClipRRect(
                      borderRadius: BorderRadius.circular(10),
                      child: Image.memory(
                        _shots[i].bytes,
                        width: 84,
                        height: 84,
                        fit: BoxFit.cover,
                        semanticLabel: 'Screenshot ${i + 1}',
                        errorBuilder: (_, _, _) => Container(
                          width: 84,
                          height: 84,
                          color: scheme.surfaceContainerHighest,
                          child: const Icon(Icons.image_outlined),
                        ),
                      ),
                    ),
                    Positioned(
                      right: 2,
                      top: 2,
                      child: IconButton.filled(
                        tooltip: 'Remove screenshot ${i + 1}',
                        visualDensity: VisualDensity.compact,
                        iconSize: 14,
                        style: IconButton.styleFrom(
                            backgroundColor: Colors.black87,
                            foregroundColor: Colors.white),
                        onPressed: _sending
                            ? null
                            : () => setState(() => _shots.removeAt(i)),
                        icon: const Icon(Icons.close),
                      ),
                    ),
                  ],
                ),
            ],
          ),
          const SizedBox(height: 8),
        ],
        Align(
          alignment: Alignment.centerLeft,
          child: OutlinedButton.icon(
            onPressed: _sending || _shots.length >= maxReportScreenshots
                ? null
                : _addScreenshots,
            icon: const Icon(Icons.image_outlined),
            label: const Text('Add screenshots'),
          ),
        ),
        const SizedBox(height: 16),
        Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: scheme.outlineVariant),
            color: scheme.surfaceContainerLow,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              InkWell(
                borderRadius: BorderRadius.circular(12),
                onTap: () => setState(() => _showAttached = !_showAttached),
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(14, 12, 10, 12),
                  child: Row(
                    children: [
                      Expanded(
                        child: Text('What else is sent with your report',
                            style: theme.textTheme.titleSmall),
                      ),
                      Icon(_showAttached
                          ? Icons.expand_less
                          : Icons.expand_more),
                    ],
                  ),
                ),
              ),
              if (_showAttached)
                Padding(
                  padding: const EdgeInsets.fromLTRB(14, 0, 14, 14),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      for (final item in ReportScreen.attached)
                        Padding(
                          padding: const EdgeInsets.only(bottom: 4),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('•  ', style: muted),
                              Expanded(child: Text(item, style: muted)),
                            ],
                          ),
                        ),
                      const SizedBox(height: 4),
                      Text(
                        "Not your phone number or student ID. Only the "
                        "Summit's admins can read reports.",
                        style: muted,
                      ),
                    ],
                  ),
                ),
            ],
          ),
        ),
        const SizedBox(height: 8),
        CheckboxListTile(
          value: _emailCopy,
          onChanged:
              _sending ? null : (v) => setState(() => _emailCopy = v ?? false),
          contentPadding: EdgeInsets.zero,
          controlAffinity: ListTileControlAffinity.leading,
          title: const Text('Email me a copy'),
          subtitle: Text('To $_email, including everything listed above.'),
        ),
        if (_problem != null) ...[
          const SizedBox(height: 8),
          Text(_problem!,
              style: theme.textTheme.bodyMedium?.copyWith(
                  color: scheme.error, fontWeight: FontWeight.w600)),
        ],
        const SizedBox(height: 16),
        FilledButton(
          onPressed: _sending ? null : _send,
          child: Text(_sending
              ? 'Sending…'
              : _kind == ReportKind.bug
                  ? 'Send bug report'
                  : 'Send feedback'),
        ),
      ],
    );
  }
}
