import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:url_launcher/url_launcher.dart';

import '../backend/repositories.dart';
import '../backend/service_locator.dart';

/// Profile → Bug reports and feedback (admins): Bugs and Feedback tabs with
/// open counts, open / resolved, each report's screenshots and attached
/// data, and Copy as Markdown for pasting a ticket to whoever fixes it. The
/// app's version of the website's /admin/reports.
class BugReportsScreen extends StatefulWidget {
  const BugReportsScreen({super.key});

  @override
  State<BugReportsScreen> createState() => _BugReportsScreenState();
}

class _BugReportsScreenState extends State<BugReportsScreen> {
  List<BugReport>? _reports;
  String? _error;
  bool _showResolved = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _error = null);
    try {
      final reports = await bugReportsRepository.fetchAll();
      if (mounted) setState(() => _reports = reports);
    } catch (_) {
      if (mounted) setState(() => _error = "Couldn't load reports.");
    }
  }

  Future<void> _setResolved(BugReport r, bool resolved) async {
    final messenger = ScaffoldMessenger.of(context);
    try {
      await bugReportsRepository.setResolved(r.id, resolved);
      if (!mounted) return;
      setState(() {
        _reports = [
          for (final x in _reports ?? const <BugReport>[])
            x.id == r.id ? x.withResolved(resolved) : x,
        ];
      });
    } catch (_) {
      messenger.showSnackBar(
          const SnackBar(content: Text("Couldn't update the report.")));
    }
  }

  int _openIn(ReportKind kind) => (_reports ?? const <BugReport>[])
      .where((r) => r.kind == kind && !r.resolved)
      .length;

  @override
  Widget build(BuildContext context) {
    final reports = _reports;
    return DefaultTabController(
      length: 2,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Bug reports and feedback'),
          actions: [
            IconButton(
              tooltip: 'Refresh',
              onPressed: _load,
              icon: const Icon(Icons.refresh),
            ),
          ],
          bottom: TabBar(
            tabs: [
              Tab(text: 'Bugs (${_openIn(ReportKind.bug)})'),
              Tab(text: 'Feedback (${_openIn(ReportKind.feedback)})'),
            ],
          ),
        ),
        body: _error != null
            ? Center(child: Text(_error!))
            : reports == null
                ? const Center(child: CircularProgressIndicator())
                : TabBarView(
                    children: [
                      _list(reports, ReportKind.bug),
                      _list(reports, ReportKind.feedback),
                    ],
                  ),
      ),
    );
  }

  Widget _list(List<BugReport> all, ReportKind kind) {
    final shown = [
      for (final r in all)
        if (r.kind == kind && r.resolved == _showResolved) r,
    ];
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
        children: [
          Align(
            alignment: Alignment.centerLeft,
            child: SegmentedButton<bool>(
              segments: const [
                ButtonSegment(value: false, label: Text('Open')),
                ButtonSegment(value: true, label: Text('Resolved')),
              ],
              selected: {_showResolved},
              onSelectionChanged: (s) =>
                  setState(() => _showResolved = s.first),
            ),
          ),
          const SizedBox(height: 12),
          if (shown.isEmpty)
            Padding(
              padding: const EdgeInsets.only(top: 48),
              child: Text(
                _showResolved
                    ? 'Nothing here yet.'
                    : kind == ReportKind.bug
                        ? 'No open bugs.'
                        : 'No open feedback.',
                textAlign: TextAlign.center,
              ),
            ),
          for (final r in shown)
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: _ReportCard(
                key: ValueKey(r.id),
                report: r,
                onResolved: (v) => _setResolved(r, v),
              ),
            ),
        ],
      ),
    );
  }
}

class _ReportCard extends StatefulWidget {
  const _ReportCard({super.key, required this.report, required this.onResolved});

  final BugReport report;
  final ValueChanged<bool> onResolved;

  @override
  State<_ReportCard> createState() => _ReportCardState();
}

class _ReportCardState extends State<_ReportCard> {
  List<String> _links = const [];

  @override
  void initState() {
    super.initState();
    if (widget.report.screenshots.isNotEmpty) {
      bugReportsRepository
          .screenshotUrls(widget.report.screenshots)
          .then((l) => mounted ? setState(() => _links = l) : null);
    }
  }

  Future<void> _copy() async {
    final r = widget.report;
    final messenger = ScaffoldMessenger.of(context);
    await Clipboard.setData(
        ClipboardData(text: reportAsMarkdown(r, links: _links)));
    messenger.showSnackBar(
        SnackBar(content: Text('Copied #${r.ticketNo} as Markdown')));
  }

  /// A few headline facts pulled from the attached data.
  List<(String, String)> _facts() {
    final r = widget.report;
    Map<String, dynamic> map(Object? v) =>
        v is Map ? v.cast<String, dynamic>() : const {};
    List<dynamic> list(Object? v) => v is List ? v : const [];
    final snap = r.snapshot;
    final auth = map(snap['auth']);
    final profile = map(snap['profile']);
    final details = map(profile['details']);
    final client = r.client;
    final device = map(client['device']);
    final build = map(client['build']);
    final pages = [
      for (final p in list(client['route_history']))
        '${map(p)['path'] ?? ''}',
    ];
    String join(List<Object?> parts) => parts
        .where((p) => p != null && '$p'.isNotEmpty)
        .map((p) => '$p')
        .join(' · ');
    return [
      ('Email', '${auth['email'] ?? ''}'),
      ('Role', join([profile['role'], profile['volunteer_subtype']])),
      ('School / grade', join([details['school'], details['grade']])),
      ('Sessions', '${list(snap['registrations']).length}'),
      ('Managing', '${list(snap['managing']).length}'),
      ('Screens before', pages.join(' → ')),
      (
        'Errors / failed requests',
        '${list(client['errors']).length} / '
            '${list(client['failed_requests']).length}'
      ),
      (
        'Device',
        join([
          client['app'],
          device['model'],
          device['os'],
          device['screen'],
          device['theme'],
        ])
      ),
      ('Build', join([build['version'], build['build_number'], build['commit']])),
      if (r.emailError != null) ('Email', 'Failed: ${r.emailError}'),
    ];
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final r = widget.report;
    final loc = MaterialLocalizations.of(context);
    final when =
        '${loc.formatShortDate(r.createdAt)} ${loc.formatTimeOfDay(TimeOfDay.fromDateTime(r.createdAt))}';
    const encoder = JsonEncoder.withIndent('  ');
    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              '${r.kind.ticketLabel} #${r.ticketNo} · $when'.toUpperCase(),
              style: theme.textTheme.labelSmall?.copyWith(
                  color: scheme.onSurfaceVariant,
                  letterSpacing: 1,
                  fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 4),
            Text(r.reporterName, style: theme.textTheme.titleLarge),
            const SizedBox(height: 10),
            SelectableText(r.description, style: theme.textTheme.bodyLarge),
            if (_links.isNotEmpty) ...[
              const SizedBox(height: 12),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  for (var i = 0; i < _links.length; i++)
                    InkWell(
                      onTap: () => launchUrl(Uri.parse(_links[i]),
                          mode: LaunchMode.externalApplication),
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(8),
                        child: Image.network(
                          _links[i],
                          width: 120,
                          height: 80,
                          fit: BoxFit.cover,
                          semanticLabel: 'Screenshot ${i + 1}',
                          errorBuilder: (_, _, _) => Container(
                            width: 120,
                            height: 80,
                            color: scheme.surfaceContainerHighest,
                            child: const Icon(Icons.broken_image_outlined),
                          ),
                        ),
                      ),
                    ),
                ],
              ),
            ],
            const SizedBox(height: 12),
            for (final (k, v) in _facts())
              if (v.isNotEmpty)
                Padding(
                  padding: const EdgeInsets.only(bottom: 4),
                  child: Text.rich(TextSpan(children: [
                    TextSpan(
                        text: '$k  ',
                        style: theme.textTheme.bodySmall
                            ?.copyWith(color: scheme.onSurfaceVariant)),
                    TextSpan(text: v, style: theme.textTheme.bodySmall),
                  ])),
                ),
            for (final (title, data) in [
              ('From the app', r.client),
              ('From the server (their account)', r.snapshot),
            ])
              ExpansionTile(
                tilePadding: EdgeInsets.zero,
                title: Text(title, style: theme.textTheme.titleSmall),
                children: [
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: SelectableText(
                      encoder.convert(data),
                      style: const TextStyle(
                          fontFamily: 'monospace', fontSize: 11.5),
                    ),
                  ),
                ],
              ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                OutlinedButton.icon(
                  onPressed: _copy,
                  icon: const Icon(Icons.copy, size: 18),
                  label: const Text('Copy as Markdown'),
                ),
                if (r.resolved)
                  OutlinedButton(
                    onPressed: () => widget.onResolved(false),
                    child: const Text('Reopen'),
                  )
                else
                  FilledButton(
                    onPressed: () => widget.onResolved(true),
                    child: const Text('Mark resolved'),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
