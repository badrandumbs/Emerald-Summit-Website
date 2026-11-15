import 'package:flutter/material.dart';

import '../app_state.dart';
import '../backend/repositories.dart';
import '../backend/service_locator.dart';
import '../models/models.dart';
import '../models/user_profile.dart';
import '../widgets/manager_replace_dialogs.dart';
import '../widgets/volunteer_contact.dart';

/// The "Volunteers" tab of the session page: who's managing this session.
/// Tapping a person opens their contact sheet (number, Call, Text).
///
/// Admins ([canAssign]) also assign/unassign volunteers here. Being assigned is
/// what lets a volunteer see the session's roster and mark its attendance. The
/// assign path is server-guarded: an overlap with the volunteer's other
/// commitments is refused and surfaced here. The session's organizers and
/// editors get the same list read-only, so they can see and reach their
/// co-workers. Renders its own (AppBar-less) Scaffold so it keeps its "Assign
/// volunteer" FAB while living inside a TabBarView.
class SessionVolunteersView extends StatefulWidget {
  const SessionVolunteersView({
    super.key,
    required this.session,
    required this.canAssign,
  });

  final Session session;
  final bool canAssign;

  @override
  State<SessionVolunteersView> createState() => _SessionVolunteersViewState();
}

class _SessionVolunteersViewState extends State<SessionVolunteersView> {
  bool _loading = true;
  bool _failed = false;
  List<VolunteerRef> _assigned = const [];

  /// Admins only: volunteers on this session's roster (as a participant,
  /// spectator or expert), who can be made its manager instead.
  List<RosterEntry> _signedUp = const [];
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final assigned = await assignmentRepository.fetchSessionVolunteers(
        widget.session.id,
      );
      var signedUp = const <RosterEntry>[];
      if (widget.canAssign) {
        try {
          final roster = await attendanceRepository
              .fetchSessionRoster(widget.session.id);
          signedUp = [
            for (final r in roster)
              if (r.role == SummitRole.volunteer.id) r,
          ];
        } catch (_) {
          signedUp = const [];
        }
      }
      if (!mounted) return;
      setState(() {
        _assigned = assigned;
        _signedUp = signedUp;
        _loading = false;
        _failed = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _failed = true;
      });
    }
  }

  Future<void> _pickAndAssign() async {
    final messenger = ScaffoldMessenger.of(context);
    List<VolunteerRef> all;
    try {
      all = await assignmentRepository.fetchVolunteers();
    } catch (e) {
      messenger.showSnackBar(
        const SnackBar(content: Text('Could not load the volunteer list.')),
      );
      return;
    }
    if (!mounted) return;
    final assignedIds = _assigned.map((v) => v.id).toSet();
    final available = all.where((v) => !assignedIds.contains(v.id)).toList();
    if (available.isEmpty) {
      messenger.showSnackBar(
        const SnackBar(
          content: Text('Every volunteer is already assigned here.'),
        ),
      );
      return;
    }
    final signedUpType = {
      for (final r in _signedUp) r.userId: r.participationType,
    };
    final picked = await showModalBottomSheet<VolunteerRef>(
      context: context,
      isScrollControlled: true,
      builder: (ctx) =>
          _VolunteerPicker(volunteers: available, signedUp: signedUpType),
    );
    if (picked == null || !mounted) return;
    final type = signedUpType[picked.id];
    if (type != null) {
      await _convert(picked.id, _nameOf(picked), type);
    } else {
      await _assign(picked);
    }
  }

  String _nameOf(VolunteerRef v) => v.name.isEmpty ? v.email : v.name;

  /// Makes a volunteer who's signed up for this session its manager instead.
  Future<void> _convert(
      String userId, String name, ParticipationType type) async {
    final messenger = ScaffoldMessenger.of(context);
    setState(() => _busy = true);
    final items = await assignmentRepository.previewManagerAssignment(
        widget.session.id, userId);
    if (!mounted) return;
    setState(() => _busy = false);
    if (items == null) {
      // Backend without volunteer_conflict_override.sql: the old refusal.
      await _showBlocked("$name is signed up for this session, so they can't "
          'manage it. They need to remove it from their day first.');
      return;
    }
    final ok = await showMakeManagerDialog(context,
        personName: name, type: type, items: items);
    if (!ok || !mounted) return;
    setState(() => _busy = true);
    try {
      await assignmentRepository.assignManagerReplacingConflicts(
          widget.session.id, userId);
      messenger.showSnackBar(SnackBar(
          content: Text("$name now manages this session and is off its "
              "roster. They've been told.")));
      await _load();
    } catch (_) {
      messenger.showSnackBar(const SnackBar(
          content: Text('Could not make them a manager. Admins only.')));
    }
    if (mounted) setState(() => _busy = false);
  }

  Future<void> _showBlocked(String message) => showDialog<void>(
        context: context,
        builder: (ctx) => AlertDialog(
          title: const Text('Schedule conflict'),
          content: Text(message),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Got it'),
            ),
          ],
        ),
      );

  /// Assigns [v] over a clash, after showing what comes off their day.
  /// Returns false when the backend can't replace yet.
  Future<bool> _replace(VolunteerRef v) async {
    final messenger = ScaffoldMessenger.of(context);
    final name = _nameOf(v);
    final items = await assignmentRepository.previewManagerAssignment(
        widget.session.id, v.id);
    if (items == null || items.isEmpty || !mounted) return false;
    final ok = await showReplaceScheduleDialog(context,
        personName: name, sessionTitle: widget.session.title, items: items);
    if (!ok || !mounted) return true;
    try {
      final replaced = await assignmentRepository
          .assignManagerReplacingConflicts(widget.session.id, v.id);
      final n = replaced.length;
      messenger.showSnackBar(SnackBar(
          content: Text('Assigned $name. $n '
              "${n == 1 ? 'thing was' : 'things were'} taken off their day, "
              "and they've been told.")));
      await _load();
    } catch (_) {
      messenger.showSnackBar(
          const SnackBar(content: Text('Could not assign. Admins only.')));
    }
    return true;
  }

  Future<void> _assign(VolunteerRef v, {bool confirmRegistered = false}) async {
    final messenger = ScaffoldMessenger.of(context);
    try {
      final result = await assignmentRepository.assign(
        widget.session.id,
        v.id,
        confirmRegistered: confirmRegistered,
      );
      if (!mounted) return;
      if (result.outcome != AssignmentOutcome.assigned && await _replace(v)) {
        return;
      }
      if (!mounted) return;
      switch (result.outcome) {
        case AssignmentOutcome.conflict:
          await showDialog<void>(
            context: context,
            builder: (ctx) => AlertDialog(
              title: const Text('Schedule conflict'),
              content: Text(
                result.conflictKind == ConflictKind.registeredThis
                    ? "${v.name} is signed up for this session, so they can't "
                        'manage it. They need to remove it from their day '
                        'first.'
                    : "${v.name} has a schedule conflict and can't be added "
                        'to this session. It overlaps with '
                        '"${result.conflictingTitle}".',
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(ctx),
                  child: const Text('Got it'),
                ),
              ],
            ),
          );
          return;
        case AssignmentOutcome.registeredConfirm:
          // The volunteer already registered for this session (as a
          // participant) — confirm before assigning them to manage it.
          final proceed = await showDialog<bool>(
            context: context,
            builder: (ctx) => AlertDialog(
              title: const Text('Already registered'),
              content: Text(
                '${v.name} is registered for this session. Do you want to '
                'assign them to manage it?',
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(ctx, false),
                  child: const Text('Cancel'),
                ),
                FilledButton(
                  onPressed: () => Navigator.pop(ctx, true),
                  child: const Text('Assign'),
                ),
              ],
            ),
          );
          if (proceed == true && mounted) {
            await _assign(v, confirmRegistered: true);
          }
          return;
        case AssignmentOutcome.assigned:
          await _load();
          messenger.showSnackBar(
            SnackBar(content: Text('Assigned ${v.name} to this session')),
          );
      }
    } catch (e) {
      messenger.showSnackBar(
        const SnackBar(content: Text('Could not assign. Admins only.')),
      );
    }
  }

  Future<void> _unassign(VolunteerRef v) async {
    final messenger = ScaffoldMessenger.of(context);
    try {
      await assignmentRepository.unassign(widget.session.id, v.id);
      await _load();
      if (!mounted) return;
      messenger.showSnackBar(SnackBar(content: Text('Removed ${v.name}')));
    } catch (e) {
      messenger.showSnackBar(
        const SnackBar(content: Text('Could not remove.')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final myId = appState.profile?.id;
    final String emptyText;
    if (_failed) {
      emptyText =
          "Couldn't load this session's volunteers. Pull down to try "
          'again.';
    } else if (widget.canAssign) {
      emptyText = 'No volunteers assigned yet. Assign volunteers so they can '
          'manage this session.';
    } else {
      emptyText = 'No one has been assigned to manage this session yet.';
    }
    final managerIds = {for (final v in _assigned) v.id};
    final convertible = [
      for (final r in _signedUp)
        if (!managerIds.contains(r.userId)) r,
    ];
    return Scaffold(
      floatingActionButton: widget.canAssign
          ? FloatingActionButton.extended(
              heroTag: 'fab-assign-volunteer',
              onPressed: _busy ? null : _pickAndAssign,
              icon: const Icon(Icons.person_add_alt),
              label: const Text('Assign a volunteer to manage'),
            )
          : null,
      body: SafeArea(
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : RefreshIndicator(
                onRefresh: _load,
                child: ListView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: EdgeInsets.fromLTRB(
                    16,
                    16,
                    16,
                    widget.canAssign ? 88 : 24,
                  ),
                  children: [
                    Text(
                      widget.session.title,
                      style: theme.textTheme.titleMedium,
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '${widget.session.timeLabel} · '
                      '${!kSessionRoomsEnabled ? widget.session.roomLabel : widget.session.room.isEmpty ? "Unassigned room" : widget.session.room}',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      _assigned.isEmpty
                          ? 'The people managing this session.'
                          : 'The people managing this session. Tap anyone '
                              'to see their number.',
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                    ),
                    if (widget.canAssign) ...[
                      const SizedBox(height: 8),
                      Text(
                        'Managers can see everyone signed up for this session '
                        '(participants, spectators and experts) with their '
                        'contact details, mark attendance, and remove someone '
                        "from the session. They can't edit the session's "
                        'details, like its description, time, room or photos.',
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: theme.colorScheme.onSurfaceVariant,
                        ),
                      ),
                    ],
                    const SizedBox(height: 12),
                    if (_assigned.isEmpty)
                      Padding(
                        padding: const EdgeInsets.fromLTRB(16, 32, 16, 0),
                        child: Text(
                          emptyText,
                          textAlign: TextAlign.center,
                          style: theme.textTheme.bodyMedium?.copyWith(
                            color: theme.colorScheme.onSurfaceVariant,
                          ),
                        ),
                      )
                    else
                      for (final v in _assigned)
                        Padding(
                          padding: const EdgeInsets.only(bottom: 8),
                          child: VolunteerCard(
                            volunteer: v,
                            isYou: v.id == myId,
                            onTap: () => showVolunteerContactSheet(context, v),
                            trailing: widget.canAssign
                                ? IconButton(
                                    icon: const Icon(
                                      Icons.remove_circle_outline,
                                    ),
                                    tooltip: 'Remove',
                                    onPressed: () => _unassign(v),
                                  )
                                : null,
                          ),
                        ),
                    if (widget.canAssign && convertible.isNotEmpty) ...[
                      const SizedBox(height: 16),
                      Text('Volunteers signed up for this session',
                          style: theme.textTheme.titleSmall),
                      const SizedBox(height: 8),
                      for (final r in convertible)
                        Card(
                          margin: const EdgeInsets.only(bottom: 8),
                          child: Padding(
                            padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(r.name.isEmpty ? r.email : r.name,
                                    style: theme.textTheme.titleSmall),
                                Text(
                                  [
                                    _signedUpAs(r.participationType),
                                    if (r.email.isNotEmpty) r.email,
                                  ].join(' · '),
                                  style: theme.textTheme.bodySmall?.copyWith(
                                    color: theme.colorScheme.onSurfaceVariant,
                                  ),
                                ),
                                const SizedBox(height: 8),
                                OutlinedButton(
                                  onPressed: _busy
                                      ? null
                                      : () => _convert(
                                          r.userId,
                                          r.name.isEmpty ? r.email : r.name,
                                          r.participationType),
                                  child: const Text(
                                      'Assign to be a manager instead'),
                                ),
                              ],
                            ),
                          ),
                        ),
                    ],
                  ],
                ),
              ),
      ),
    );
  }
}

/// "Signed up as participant", for a volunteer on this session's roster.
String _signedUpAs(ParticipationType t) => 'Signed up as ${switch (t) {
      ParticipationType.participant => 'participant',
      ParticipationType.spectator => 'spectator',
      ParticipationType.expert => 'expert',
    }}';

/// A searchable bottom-sheet picker over the available volunteers. Those
/// already signed up for this session ([signedUp]) come first, tagged.
class _VolunteerPicker extends StatefulWidget {
  const _VolunteerPicker({required this.volunteers, this.signedUp = const {}});

  final List<VolunteerRef> volunteers;
  final Map<String, ParticipationType> signedUp;

  @override
  State<_VolunteerPicker> createState() => _VolunteerPickerState();
}

class _VolunteerPickerState extends State<_VolunteerPicker> {
  String _query = '';

  @override
  Widget build(BuildContext context) {
    final q = _query.trim().toLowerCase();
    final filtered = [
      for (final v in widget.volunteers)
        if (q.isEmpty ||
            v.name.toLowerCase().contains(q) ||
            v.email.toLowerCase().contains(q))
          v,
    ]..sort((a, b) {
        final sa = widget.signedUp.containsKey(a.id) ? 0 : 1;
        final sb = widget.signedUp.containsKey(b.id) ? 0 : 1;
        return sa - sb;
      });
    return Padding(
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
      ),
      child: DraggableScrollableSheet(
        expand: false,
        initialChildSize: 0.6,
        maxChildSize: 0.9,
        builder: (context, scrollController) => Column(
          children: [
            const SizedBox(height: 12),
            Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.outlineVariant,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
              child: Text('Assign a volunteer to manage',
                  style: Theme.of(context).textTheme.titleMedium),
            ),
            Padding(
              padding: const EdgeInsets.all(16),
              child: TextField(
                autofocus: true,
                decoration: const InputDecoration(
                  prefixIcon: Icon(Icons.search),
                  hintText: 'Search volunteers',
                  border: OutlineInputBorder(),
                ),
                onChanged: (v) => setState(() => _query = v),
              ),
            ),
            Expanded(
              child: ListView.builder(
                controller: scrollController,
                itemCount: filtered.length,
                itemBuilder: (context, i) {
                  final v = filtered[i];
                  return ListTile(
                    leading: const Icon(Icons.person_outline),
                    title: Text(v.name.isEmpty ? v.email : v.name),
                    subtitle: Text([
                      if (widget.signedUp[v.id] case final t?) _signedUpAs(t),
                      v.email,
                    ].join(' · ')),
                    onTap: () => Navigator.pop(context, v),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}
