import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../backend/repositories.dart';
import '../backend/service_locator.dart';
import '../models/user_profile.dart';

/// Profile → Photo permission (admins): who did not allow photos, from the
/// Code of Conduct's "Media Rights and Consent" question, so photographers
/// can leave them out. Also lists who has not answered yet and, last, who
/// granted it. Experts are not asked (their policy covers photos), so they
/// are not listed. Reads `fetch_photo_permissions` (photo_permission_list.sql).
class PhotoPermissionScreen extends StatefulWidget {
  const PhotoPermissionScreen({super.key});

  @override
  State<PhotoPermissionScreen> createState() => _PhotoPermissionScreenState();
}

class _PhotoPermissionScreenState extends State<PhotoPermissionScreen> {
  List<PhotoPermission>? _people;
  String? _error;
  String _query = '';

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _error = null);
    try {
      final people = await metricsRepository.fetchPhotoPermissions();
      if (mounted) setState(() => _people = people);
    } catch (_) {
      if (mounted) {
        setState(() => _error = 'Could not load photo permission. Admins only.');
      }
    }
  }

  bool _matches(PhotoPermission p) {
    final q = _query.trim().toLowerCase();
    return q.isEmpty ||
        p.name.toLowerCase().contains(q) ||
        p.email.toLowerCase().contains(q) ||
        (p.school?.toLowerCase().contains(q) ?? false);
  }

  Future<void> _copyNames(List<PhotoPermission> people) async {
    final messenger = ScaffoldMessenger.of(context);
    await Clipboard.setData(ClipboardData(
        text: [for (final p in people) _nameOf(p)].join('\n')));
    messenger.showSnackBar(SnackBar(
        content: Text('Copied ${people.length} '
            '${people.length == 1 ? 'name' : 'names'}')));
  }

  static String _nameOf(PhotoPermission p) =>
      p.name.trim().isEmpty ? p.email : p.name;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final people = _people;
    return Scaffold(
      appBar: AppBar(
        title: const Text('Photo permission'),
        actions: [
          IconButton(
            tooltip: 'Refresh',
            onPressed: _load,
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      body: _error != null
          ? Center(
              child: Padding(
                padding: const EdgeInsets.all(32),
                child: Text(_error!, textAlign: TextAlign.center),
              ),
            )
          : people == null
              ? const Center(child: CircularProgressIndicator())
              : RefreshIndicator(
                  onRefresh: _load,
                  child: _list(theme, people),
                ),
    );
  }

  Widget _list(ThemeData theme, List<PhotoPermission> all) {
    final shown = all.where(_matches).toList();
    final notGranted = [for (final p in shown) if (p.granted == false) p];
    final notAnswered = [for (final p in shown) if (p.granted == null) p];
    final granted = [for (final p in shown) if (p.granted == true) p];
    final muted = theme.textTheme.bodySmall
        ?.copyWith(color: theme.colorScheme.onSurfaceVariant);
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
      children: [
        Text(
          'From the Code of Conduct\'s "Media Rights and Consent" question. '
          'Experts are not asked, so they are not listed.',
          style: muted,
        ),
        const SizedBox(height: 12),
        TextField(
          decoration: const InputDecoration(
            prefixIcon: Icon(Icons.search),
            hintText: 'Search by name, email or school',
            border: OutlineInputBorder(),
            isDense: true,
          ),
          onChanged: (v) => setState(() => _query = v),
        ),
        const SizedBox(height: 16),
        _Section(
          title: 'Did not allow photos',
          count: notGranted.length,
          color: theme.colorScheme.error,
          icon: Icons.no_photography_outlined,
          empty: 'Nobody has said no to photos.',
          people: notGranted,
          onCopy: notGranted.isEmpty ? null : () => _copyNames(notGranted),
        ),
        _Section(
          title: 'Not answered yet',
          note: 'They have not agreed to the current Code of Conduct yet. '
              'They will be asked the next time they open the app or the '
              'website.',
          count: notAnswered.length,
          color: theme.colorScheme.onSurfaceVariant,
          icon: Icons.help_outline,
          empty: 'Everyone has answered.',
          people: notAnswered,
        ),
        _Section(
          title: 'Allowed photos',
          count: granted.length,
          color: theme.colorScheme.primary,
          icon: Icons.photo_camera_outlined,
          empty: 'Nobody yet.',
          people: granted,
          initiallyExpanded: false,
        ),
      ],
    );
  }
}

class _Section extends StatelessWidget {
  const _Section({
    required this.title,
    required this.count,
    required this.color,
    required this.icon,
    required this.empty,
    required this.people,
    this.note,
    this.onCopy,
    this.initiallyExpanded = true,
  });

  final String title;
  final int count;
  final Color color;
  final IconData icon;
  final String empty;
  final List<PhotoPermission> people;
  final String? note;
  final VoidCallback? onCopy;
  final bool initiallyExpanded;

  static String _roleLabel(SummitRole r) => r.label;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final muted = theme.textTheme.bodySmall
        ?.copyWith(color: theme.colorScheme.onSurfaceVariant);
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      clipBehavior: Clip.antiAlias,
      child: ExpansionTile(
        initiallyExpanded: initiallyExpanded,
        leading: Icon(icon, color: color),
        title: Text('$title ($count)',
            style: theme.textTheme.titleSmall?.copyWith(color: color)),
        subtitle: note == null ? null : Text(note!, style: muted),
        shape: const Border(),
        children: [
          if (people.isEmpty)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
              child: Align(
                  alignment: Alignment.centerLeft,
                  child: Text(empty, style: muted)),
            )
          else ...[
            for (final p in people)
              ListTile(
                dense: true,
                title: Text(p.name.trim().isEmpty ? p.email : p.name),
                subtitle: Text([
                  _roleLabel(p.role),
                  ?p.school,
                  if (p.email.isNotEmpty) p.email,
                ].join(' · ')),
              ),
            if (onCopy != null)
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
                child: Align(
                  alignment: Alignment.centerLeft,
                  child: OutlinedButton.icon(
                    onPressed: onCopy,
                    icon: const Icon(Icons.copy, size: 18),
                    label: const Text('Copy names'),
                  ),
                ),
              ),
          ],
        ],
      ),
    );
  }
}
