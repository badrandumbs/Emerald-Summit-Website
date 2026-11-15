import 'package:flutter/material.dart';

import '../backend/repositories.dart';
import '../backend/service_locator.dart';
import '../models/models.dart';
import '../widgets/roster_person_sheet.dart';

/// Standalone attendance screen — a thin wrapper around [SessionRosterView] used
/// when a volunteer opens a managed session from "Sessions I'm managing"
/// (my_assignments_screen). On the session page itself the same view is embedded
/// as the "Participants" tab.
class SessionRosterScreen extends StatelessWidget {
  const SessionRosterScreen({super.key, required this.session});

  final Session session;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Attendance')),
      body: SafeArea(child: SessionRosterView(session: session)),
    );
  }
}

/// The roster for one session — the registered people and their attendance
/// state. Shown to a volunteer assigned to the session (or an admin); marking is
/// enforced server-side by the same assignment gate. Renders just the body (no
/// Scaffold/AppBar) so it can be embedded as a tab or wrapped by
/// [SessionRosterScreen].
///
/// [types] optionally restricts the list to certain participation types — the
/// session page uses it to split the full roster into a **Participants** tab
/// (participant + spectator) and an **Experts** tab (expert). Null shows
/// everyone (the standalone attendance screen).
///
/// Participants are grouped under their project: teammates share one team
/// group (with its code), each solo participant gets their own. With
/// [canMarkAttendance] false (a session editor who isn't taking attendance)
/// the roster is read-only.
class SessionRosterView extends StatefulWidget {
  const SessionRosterView({
    super.key,
    required this.session,
    this.types,
    this.emptyMessage,
    this.canMarkAttendance = true,
  });

  final Session session;
  final Set<ParticipationType>? types;
  final String? emptyMessage;
  final bool canMarkAttendance;

  @override
  State<SessionRosterView> createState() => _SessionRosterViewState();
}

class _SessionRosterViewState extends State<SessionRosterView> {
  bool _loading = true;
  String? _error;
  List<RosterEntry> _roster = const [];

  /// Everyone on the session, across tabs, so removing someone can say what
  /// happens to their team.
  List<RosterEntry> _everyone = const [];

  /// Who organizers removed, or null while `fetch_session_removals` fails
  /// (session_participant_removal.sql not run), which hides Remove too.
  List<SessionRemoval>? _removals;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final roster =
          await attendanceRepository.fetchSessionRoster(widget.session.id);
      List<SessionRemoval>? removals;
      try {
        removals =
            await attendanceRepository.fetchSessionRemovals(widget.session.id);
      } catch (_) {
        removals = null;
      }
      if (!mounted) return;
      final types = widget.types;
      setState(() {
        _everyone = roster;
        _removals = removals
            ?.where((r) =>
                types == null ||
                r.participationType == null ||
                types.contains(r.participationType))
            .toList();
        _roster = types == null
            ? roster
            : roster.where((e) => types.contains(e.participationType)).toList();
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = "Couldn't load the roster. You may not be assigned here.";
        _loading = false;
      });
    }
  }

  Future<void> _toggle(RosterEntry entry, bool value) async {
    // Optimistic update; revert on failure.
    final i = _roster.indexWhere((e) => e.userId == entry.userId);
    if (i < 0) return;
    setState(() => _roster[i] = _roster[i].copyWith(attended: value));
    try {
      await attendanceRepository.markSessionAttendance(
          widget.session.id, entry.userId, value);
    } catch (e) {
      if (!mounted) return;
      setState(() => _roster[i] = _roster[i].copyWith(attended: !value));
      ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Could not save attendance.')));
    }
  }

  String _who(RosterEntry e) => e.name.isEmpty ? e.email : e.name;

  /// Confirms, then takes [e] off the session.
  Future<void> _remove(RosterEntry e) async {
    final who = _who(e);
    final teammates = e.teamId == null
        ? 0
        : _everyone
            .where((r) => r.teamId == e.teamId && r.userId != e.userId)
            .length;
    final teamNote = e.isTeam != true
        ? ''
        : teammates == 0
            ? " They're the only one on their team, so the team is deleted too."
            : e.isTeamOwner
                ? ' They own a team, so it passes to the teammate who joined '
                    'first.'
                : ' Their teammates will be told they were removed.';
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Remove $who?'),
        content: Text(
          'They\'ll be taken off "${widget.session.title}" and get a notice '
          'saying an organizer removed them. They can\'t sign up for it '
          'again unless someone allows them back.$teamNote',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(
              backgroundColor: Theme.of(ctx).colorScheme.error,
              foregroundColor: Theme.of(ctx).colorScheme.onError,
            ),
            onPressed: () => Navigator.of(ctx).pop(true),
            child: const Text('Remove'),
          ),
        ],
      ),
    );
    if (ok != true || !mounted) return;
    final messenger = ScaffoldMessenger.of(context);
    setState(() => _busy = true);
    try {
      final outcome = await attendanceRepository.removeFromSession(
          widget.session.id, e.userId);
      messenger.showSnackBar(SnackBar(
        content: Text(switch (outcome) {
          SessionRemovalOutcome.removed => 'Removed $who from this session',
          SessionRemovalOutcome.notRegistered =>
            '$who had already left this session',
          SessionRemovalOutcome.cannotRemoveSelf =>
            "You can't remove yourself. Remove the session from your day "
                'instead.',
        }),
      ));
    } catch (_) {
      messenger.showSnackBar(
          SnackBar(content: Text("Couldn't remove $who. Try again.")));
    }
    if (!mounted) return;
    setState(() => _busy = false);
    await _load();
  }

  /// Lets a removed person sign up again.
  Future<void> _allowBack(SessionRemoval r) async {
    final who = r.name.isEmpty ? r.email : r.name;
    final messenger = ScaffoldMessenger.of(context);
    setState(() => _busy = true);
    try {
      await attendanceRepository.allowBackToSession(
          widget.session.id, r.userId);
      messenger.showSnackBar(SnackBar(
          content: Text('$who can sign up for this session again')));
    } catch (_) {
      messenger.showSnackBar(
          SnackBar(content: Text("Couldn't allow $who back. Try again.")));
    }
    if (!mounted) return;
    setState(() => _busy = false);
    await _load();
  }

  /// The Removed list at the bottom of the roster.
  List<Widget> _removedSection(ThemeData theme) {
    final removals = _removals;
    if (removals == null || removals.isEmpty) return const [];
    return [
      Container(
        width: double.infinity,
        margin: const EdgeInsets.only(top: 12),
        padding: const EdgeInsets.fromLTRB(20, 10, 20, 10),
        color: theme.colorScheme.surfaceContainer,
        child: Row(
          children: [
            Icon(Icons.person_off_outlined,
                size: 20, color: theme.colorScheme.error),
            const SizedBox(width: 12),
            Text('Removed', style: theme.textTheme.titleSmall),
          ],
        ),
      ),
      for (final r in removals)
        ListTile(
          title: Text(r.name.isEmpty ? r.email : r.name),
          subtitle: Text([
            ?r.participationType?.chipLabel,
            if (r.removedBy != null) 'Removed by ${r.removedBy}',
            if (r.removedAt != null)
              MaterialLocalizations.of(context)
                  .formatShortMonthDay(r.removedAt!),
          ].join(' · ')),
          trailing: OutlinedButton(
            onPressed: _busy ? null : () => _allowBack(r),
            child: const Text('Allow back'),
          ),
        ),
    ];
  }

  /// Splits the roster into project groups (teams, then solo projects, by
  /// name), then participants who haven't shared a project yet, then
  /// spectators and experts. Returns an empty list when there are no
  /// participants to group by (e.g. the Experts tab) — the roster is then shown
  /// flat.
  List<_RosterGroup> _groups() {
    if (!_roster.any((e) => e.participationType == ParticipationType.participant)) {
      return const [];
    }
    final teams = <String, List<RosterEntry>>{};
    final projects = <_RosterGroup>[];
    final unshared = <RosterEntry>[];
    final spectators = <RosterEntry>[];
    final experts = <RosterEntry>[];
    for (final e in _roster) {
      switch (e.participationType) {
        case ParticipationType.spectator:
          spectators.add(e);
        case ParticipationType.expert:
          experts.add(e);
        case ParticipationType.participant:
          if (e.isTeam == true && e.teamId != null) {
            (teams[e.teamId!] ??= []).add(e);
          } else if (e.isTeam == false) {
            projects.add(_RosterGroup.solo(e));
          } else {
            unshared.add(e);
          }
      }
    }
    projects
      ..addAll(teams.values.map(
          (m) => _RosterGroup.team(m, widget.session.maxTeamSize)))
      ..sort((a, b) {
        if (a.isTeam != b.isTeam) return a.isTeam ? -1 : 1;
        return a.title.toLowerCase().compareTo(b.title.toLowerCase());
      });
    return [
      ...projects,
      if (unshared.isNotEmpty)
        _RosterGroup(
          title: 'Project not shared yet',
          icon: Icons.help_outline,
          members: unshared,
          detail: 'Registered before the team question, or still deciding',
        ),
      if (spectators.isNotEmpty)
        _RosterGroup(
          title: 'Spectators',
          icon: Icons.visibility_outlined,
          members: spectators,
        ),
      if (experts.isNotEmpty)
        _RosterGroup(
          title: 'Experts',
          icon: Icons.workspace_premium_outlined,
          members: experts,
        ),
    ];
  }

  /// The roster row subtitle: attendance state, the participation type, and any
  /// participant answers rendered as "Prompt: answer" (prompts resolved from the
  /// session's questions by id).
  Widget _rosterSubtitle(ThemeData theme, RosterEntry e) {
    final questions = {
      for (final q in widget.session.participantQuestions) q.id: q.prompt,
    };
    final lines = <String>[
      for (final entry in e.answers.entries)
        '${questions[entry.key] ?? 'Answer'}: ${entry.value}',
    ];
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          [
            e.attended ? 'Present' : 'Not marked',
            e.participationType.chipLabel,
            if (e.isTeamOwner) 'Team owner',
          ].join(' · '),
        ),
        for (final line in lines)
          Text(
            line,
            style: theme.textTheme.bodySmall
                ?.copyWith(color: theme.colorScheme.onSurfaceVariant),
          ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final present = _roster.where((e) => e.attended).length;
    final groups = _groups();
    final projectCount = groups.where((g) => g.isProject).length;
    if (_loading) {
      return const Center(child: CircularProgressIndicator());
    }
    if (_error != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Text(_error!,
              textAlign: TextAlign.center, style: theme.textTheme.bodyMedium),
        ),
      );
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 2),
          child: Text(widget.session.title, style: theme.textTheme.titleMedium),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 0, 20, 12),
          child: Text(
            '${widget.session.timeLabel} · '
            '${!kSessionRoomsEnabled ? widget.session.roomLabel : widget.session.room.isEmpty ? "Unassigned room" : widget.session.room}'
            '  ·  $present / ${_roster.length} present'
            '${projectCount > 0 ? '  ·  $projectCount project${projectCount == 1 ? '' : 's'}' : ''}',
            style: theme.textTheme.bodySmall
                ?.copyWith(color: theme.colorScheme.onSurfaceVariant),
          ),
        ),
        if (!widget.canMarkAttendance)
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 0, 20, 12),
            child: Text(
              'View only. Attendance is marked by the volunteers assigned to '
              'this session.',
              style: theme.textTheme.bodySmall
                  ?.copyWith(color: theme.colorScheme.onSurfaceVariant),
            ),
          ),
        const Divider(height: 1),
        Expanded(
          child: _roster.isEmpty && (_removals?.isEmpty ?? true)
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(32),
                    child: Text(
                      widget.emptyMessage ??
                          'No one has registered for this session yet.',
                      textAlign: TextAlign.center,
                      style: theme.textTheme.bodyMedium
                          ?.copyWith(color: theme.colorScheme.onSurfaceVariant),
                    ),
                  ),
                )
              : groups.isEmpty
                  ? ListView(
                      padding: const EdgeInsets.only(bottom: 24),
                      children: [
                        for (var i = 0; i < _roster.length; i++) ...[
                          if (i > 0) const Divider(height: 1),
                          _entryTile(theme, _roster[i]),
                        ],
                        ..._removedSection(theme),
                      ],
                    )
                  : ListView(
                      padding: const EdgeInsets.only(bottom: 24),
                      children: [
                        for (final g in groups) ...[
                          _GroupHeader(group: g),
                          for (var i = 0; i < g.members.length; i++) ...[
                            if (i > 0) const Divider(height: 1, indent: 72),
                            _entryTile(theme, g.members[i]),
                          ],
                        ],
                        ..._removedSection(theme),
                      ],
                    ),
        ),
      ],
    );
  }

  /// One person's row: an attendance switch for attendance takers, or a
  /// read-only present/not-marked indicator for editors. Tapping the row opens
  /// their profile.
  Widget _entryTile(ThemeData theme, RosterEntry e) {
    final avatar = CircleAvatar(
      backgroundColor: e.attended
          ? theme.colorScheme.primaryContainer
          : theme.colorScheme.surfaceContainerHighest,
      child: Icon(
        e.attended ? Icons.check : Icons.person_outline,
        color: e.attended
            ? theme.colorScheme.onPrimaryContainer
            : theme.colorScheme.onSurfaceVariant,
      ),
    );
    return ListTile(
      isThreeLine: e.answers.isNotEmpty,
      leading: avatar,
      title: Text(e.name.isEmpty ? e.email : e.name),
      subtitle: _rosterSubtitle(theme, e),
      trailing: widget.canMarkAttendance
          ? Switch(value: e.attended, onChanged: (v) => _toggle(e, v))
          : const Icon(Icons.chevron_right),
      onTap: () => showRosterPersonSheet(context,
          session: widget.session,
          // Latest copy, so the sheet reflects an attendance toggle.
          entry: _roster.firstWhere((r) => r.userId == e.userId,
              orElse: () => e),
          onRemove: _removals == null || _busy ? null : () => _remove(e)),
    );
  }
}

/// A heading on the grouped roster: one project (team or solo), or a bucket
/// like Spectators.
class _RosterGroup {
  const _RosterGroup({
    required this.title,
    required this.icon,
    required this.members,
    this.detail,
    this.isProject = false,
    this.isTeam = false,
    this.owner,
  });

  /// A team's group: the owner listed first, then everyone else by name.
  factory _RosterGroup.team(List<RosterEntry> members, int maxTeamSize) {
    final first = members.first;
    members.sort((a, b) {
      if (a.isTeamOwner != b.isTeamOwner) return a.isTeamOwner ? -1 : 1;
      return a.name.toLowerCase().compareTo(b.name.toLowerCase());
    });
    final owner = members.first.isTeamOwner ? members.first : null;
    return _RosterGroup(
      title: (first.projectName ?? '').isEmpty
          ? 'Untitled project'
          : first.projectName!,
      icon: Icons.groups_outlined,
      members: members,
      isProject: true,
      isTeam: true,
      detail: 'Team ${first.teamCode ?? ''} · '
          '${maxTeamSize >= 2 ? '${members.length}/$maxTeamSize' : members.length} '
          'member${members.length == 1 && maxTeamSize < 2 ? '' : 's'}',
      owner: owner == null
          ? null
          : (owner.name.isEmpty ? owner.email : owner.name),
    );
  }

  factory _RosterGroup.solo(RosterEntry e) => _RosterGroup(
        title: (e.projectName ?? '').isEmpty ? 'Untitled project' : e.projectName!,
        icon: Icons.person_outline,
        members: [e],
        detail: 'Solo',
        isProject: true,
      );

  final String title;
  final IconData icon;
  final List<RosterEntry> members;
  final String? detail;

  /// A real project (team or solo), as opposed to a bucket like Spectators.
  final bool isProject;
  final bool isTeam;

  /// The team owner's display name (teams only).
  final String? owner;
}

class _GroupHeader extends StatelessWidget {
  const _GroupHeader({required this.group});
  final _RosterGroup group;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final present = group.members.where((e) => e.attended).length;
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(top: 12),
      padding: const EdgeInsets.fromLTRB(20, 10, 20, 10),
      color: theme.colorScheme.surfaceContainer,
      child: Row(
        children: [
          Icon(group.icon, size: 20, color: theme.colorScheme.primary),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  group.title,
                  style: theme.textTheme.titleSmall?.copyWith(
                    color: theme.colorScheme.onSurface,
                  ),
                ),
                Text(
                  [
                    ?group.detail,
                    '$present/${group.members.length} present',
                  ].join(' · '),
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.secondary,
                  ),
                ),
                if (group.owner != null)
                  Text(
                    'Owner: ${group.owner}',
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: theme.colorScheme.secondary,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
